import { NextRequest, NextResponse } from "next/server";

// Multi-Model Pool (Triples RPM from 15 to 45 across independent quotas)
const MODEL_POOL = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-2.5-flash",
  "gemini-3-flash",
  "gemma-4-31b-it"
];

let roundRobinCounter = 0;

// Deduplication map to prevent parallel duplicate calls for the same achievement
const inFlightRequests = new Map<string, Promise<any>>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameId, gameTitle, achievementId, achievementName, achievementDescription, preferredModel } = body;

    if (!gameId || !achievementId || !achievementName) {
      return NextResponse.json(
        { error: "gameId, achievementId, and achievementName are required." },
        { status: 400 }
      );
    }

    // Input validation & length restrictions to prevent prompt injection and DoS
    const cleanGameId = String(gameId).trim().slice(0, 50);
    const cleanAchId = String(achievementId).trim().slice(0, 50);
    const cleanGameTitle = typeof gameTitle === "string" ? gameTitle.trim().slice(0, 100) : "";
    const cleanAchName = String(achievementName).trim().slice(0, 150);
    const cleanAchDesc = typeof achievementDescription === "string" ? achievementDescription.trim().slice(0, 500) : "";

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanGameId)) {
      return NextResponse.json({ error: "Invalid gameId format." }, { status: 400 });
    }

    const guideSlug = `ach-${cleanAchId}`;
    const backendUrl = process.env.BACKEND_URL || "http://backend:8080";

    // 1. Idempotency Check: If guide already exists in DynamoDB/Redis, return immediately
    try {
      const existingRes = await fetch(`${backendUrl}/api/games/${cleanGameId}/guides/${guideSlug}`, {
        cache: "no-store",
      });
      if (existingRes.ok) {
        const existingData = await existingRes.json();
        if (existingData && (existingData.regions?.length > 0 || existingData.title)) {
          return NextResponse.json({
            ...existingData,
            alreadyExisted: true,
            modelUsed: existingData.generatedByModel || "cached",
          });
        }
      }
    } catch (checkErr) {
      console.warn(`[generate-guide] Idempotency check for ${guideSlug} skipped:`, checkErr);
    }

    // 2. In-flight request deduplication: If already generating, await that promise
    const dedupeKey = `${cleanGameId}:${cleanAchId}`;
    if (inFlightRequests.has(dedupeKey)) {
      const existingResult = await inFlightRequests.get(dedupeKey);
      return NextResponse.json(existingResult);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in environment." },
        { status: 500 }
      );
    }

    const prompt = `You are a master video game completionist and verified 100% achievement guide author.
Create an accurate, authentic step-by-step completion checklist for this video game achievement:

Game: ${cleanGameTitle || "Game " + cleanGameId}
Achievement: ${cleanAchName}
Official Description: ${cleanAchDesc || "Unlock the achievement"}

REQUIREMENTS FOR ACCURACY:
1. Verify how this achievement is ACTUALLY unlocked in the game. Do not guess or hallucinate.
2. If it is story-related or unmissable, detail the exact mission chapter, prerequisites, and milestone triggers.
3. If it is a collectible or multi-stage task, list the key locations, actionable instructions, and in-game landmarks.
4. If it has missable elements or difficulty requirements, state them clearly in the details/hints.
5. Provide realistic normalized X/Y coordinates (between 5 and 95) for the map pins.

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact structure:
{
  "title": "${cleanAchName} Checklist",
  "subtitle": "Accurate step-by-step roadmap to unlock ${cleanAchName}",
  "regions": [
    {
      "id": "region-slug",
      "name": "Region Name",
      "items": [
        {
          "id": 1,
          "name": "Step Title",
          "region": "Region Name",
          "locationText": "Specific in-game location or milestone",
          "details": "Detailed gameplay instructions, weapons, or mission advice",
          "x": 50.0,
          "y": 50.0
        }
      ]
    }
  ]
}
Do NOT wrap the response in markdown blocks. Output pure JSON only.`;

    // Multi-Model Pool Execution with Automatic Fallback
    const executionPromise = (async () => {
      const startIndex = preferredModel 
        ? MODEL_POOL.indexOf(preferredModel) !== -1 ? MODEL_POOL.indexOf(preferredModel) : 0
        : (roundRobinCounter++) % MODEL_POOL.length;

      let successfulRawText = "";
      let usedModel = "";
      let lastError = "";

      for (let i = 0; i < MODEL_POOL.length; i++) {
        const modelCandidate = MODEL_POOL[(startIndex + i) % MODEL_POOL.length];
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent?key=${apiKey}`;

        try {
          const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
              },
            }),
          });

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText && rawText.trim().length > 0) {
              successfulRawText = rawText;
              usedModel = modelCandidate;
              break;
            }
          } else {
            const errText = await geminiRes.text();
            console.warn(`[Multi-Model Router] Model ${modelCandidate} failed (${geminiRes.status}): ${errText.slice(0, 100)}. Falling back to next model...`);
            lastError = `${modelCandidate} (${geminiRes.status})`;
          }
        } catch (err: any) {
          console.warn(`[Multi-Model Router] Network error with ${modelCandidate}:`, err.message);
          lastError = err.message;
        }
      }

      if (!successfulRawText) {
        throw new Error(`All models in the pool were exhausted or rate-limited. Last error: ${lastError}`);
      }

      let parsedGuide: any;
      try {
        parsedGuide = JSON.parse(successfulRawText);
      } catch (e) {
        throw new Error("Failed to parse JSON response from AI model pool.");
      }

      // Standardize schema
      let totalCount = 0;
      let itemIdCounter = 1;
      const cleanRegions = (parsedGuide.regions || []).map((reg: any) => {
        const regId = reg.id || (reg.name || "General").toLowerCase().replace(/\s+/g, "-");
        const regName = reg.name || "General";
        const items = (reg.items || []).map((it: any) => {
          const itemObj = {
            id: itemIdCounter++,
            name: it.name || `Step ${itemIdCounter}`,
            region: it.region || regName,
            locationText: it.locationText || "See details",
            details: it.details || "",
            x: typeof it.x === "number" ? it.x : 50.0,
            y: typeof it.y === "number" ? it.y : 50.0,
          };
          totalCount++;
          return itemObj;
        });

        return {
          id: regId,
          name: regName,
          itemCount: items.length,
          items,
        };
      });

      const fullGuide = {
        gameId: String(cleanGameId),
        gameSlug: (cleanGameTitle || "game").toLowerCase().replace(/\s+/g, "-"),
        guideSlug,
        title: parsedGuide.title || `${cleanAchName} Checklist`,
        subtitle: parsedGuide.subtitle || cleanAchDesc || "",
        totalCount: totalCount > 0 ? totalCount : 1,
        requiredForCompletion: totalCount > 0 ? totalCount : 1,
        achievementId: String(cleanAchId),
        generatedByModel: usedModel,
        relatedAchievements: [
          {
            id: Number(cleanAchId),
            name: cleanAchName,
            description: cleanAchDesc || "",
          },
        ],
        maps: [
          {
            id: "main-map",
            name: `${cleanGameTitle || "Game"} Map`,
          },
        ],
        regions: cleanRegions,
      };

      // Save directly to the Spring Boot backend -> DynamoDB & Redis
      await fetch(`${backendUrl}/api/games/${cleanGameId}/guides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullGuide),
      });

      return { ...fullGuide, modelUsed: usedModel };
    })();

    inFlightRequests.set(dedupeKey, executionPromise);

    try {
      const result = await executionPromise;
      return NextResponse.json(result);
    } finally {
      inFlightRequests.delete(dedupeKey);
    }
  } catch (error: any) {
    console.error("[generate-guide route error]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
