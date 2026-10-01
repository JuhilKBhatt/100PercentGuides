import { NextRequest, NextResponse } from "next/server";

// Fallback Multi-Model Pool (Verified official active models with high throughput)
const DEFAULT_MODEL_POOL = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemma-4-31b-it",
];

function getModelPool(): string[] {
  const envVal = process.env.MODEL_POOL || process.env.GEMINI_MODEL_POOL;
  if (!envVal || !envVal.trim()) {
    return DEFAULT_MODEL_POOL;
  }
  const trimmed = envVal.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((m: any) => String(m).trim()).filter(Boolean);
      }
    } catch {}
  }
  const split = trimmed.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  return split.length > 0 ? split : DEFAULT_MODEL_POOL;
}

let roundRobinCounter = 0;

// Deduplication map to prevent parallel duplicate calls for the same achievement
const inFlightRequests = new Map<string, Promise<any>>();

export async function POST(req: NextRequest) {
  try {
    const MODEL_POOL = getModelPool();
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

    // Signal user priority to backend Redis to pause background seeder and prioritize active user
    fetch(backendUrl + "/api/ai/priority", { method: "POST" }).catch(() => {});

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
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!apiKey && !groqApiKey) {
      return NextResponse.json(
        { error: "Neither GEMINI_API_KEY nor GROQ_API_KEY is configured in environment." },
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

      // Primary: Rotate through Google AI Studio Model Pool
      if (apiKey) {
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
              console.warn(`[Multi-Model Router] Model ${modelCandidate} failed (${geminiRes.status}): ${errText.slice(0, 100)}. Falling back to next candidate...`);
              lastError = `${modelCandidate} (${geminiRes.status})`;
            }
          } catch (err: any) {
            console.warn(`[Multi-Model Router] Network error with ${modelCandidate}:`, err.message);
            lastError = err.message;
          }
        }
      }

      // Secondary / Backup: If Google AI Studio models failed or exhausted, fall back to Groq
      if (!successfulRawText && groqApiKey) {
        console.warn("[Multi-Model Router] Google AI Studio models exhausted. Activating Groq failover backup...");
        const GROQ_BACKUP_MODELS = [
          "openai/gpt-oss-120b",
          "openai/gpt-oss-20b",
          "qwen/qwen3.8-27b",
        ];

        for (const groqCandidate of GROQ_BACKUP_MODELS) {
          try {
            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${groqApiKey.trim()}`,
                "Content-Type": "application/json",
                "User-Agent": "100PercentGuides/1.0",
              },
              body: JSON.stringify({
                model: groqCandidate,
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.2,
              }),
            });

            if (groqRes.ok) {
              const groqData = await groqRes.json();
              const groqText = groqData.choices?.[0]?.message?.content;
              if (groqText && groqText.trim().length > 0) {
                successfulRawText = groqText;
                usedModel = `groq:${groqCandidate}`;
                console.info(`[Multi-Model Router] Successfully generated guide using Groq backup model: ${groqCandidate}`);
                break;
              }
            } else {
              const errText = await groqRes.text();
              console.warn(`[Multi-Model Router] Groq backup model ${groqCandidate} failed (${groqRes.status}): ${errText.slice(0, 100)}`);
              lastError = `Groq:${groqCandidate} (${groqRes.status})`;
            }
          } catch (err: any) {
            console.warn(`[Multi-Model Router] Network error with Groq model ${groqCandidate}:`, err.message);
            lastError = `Groq:${groqCandidate} (${err.message})`;
          }
        }
      }

      if (!successfulRawText) {
        throw new Error(`All Google AI Studio models and Groq backup models were exhausted or rate-limited. Last error: ${lastError}`);
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
