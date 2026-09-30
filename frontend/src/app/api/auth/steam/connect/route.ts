import { NextRequest, NextResponse } from "next/server";
import { SteamUser } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { identifier } = await request.json();
    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json({ success: false, error: "Please provide a valid Steam ID or Profile URL." }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL || "http://backend:8080";
    let clean = identifier.trim();

    // 1. Check if direct 17-digit Steam ID64
    let steamId: string | null = null;
    const directMatch = clean.match(/7656119\d{10}/);
    if (directMatch) {
      steamId = directMatch[0];
    } else {
      // 2. Resolve Vanity URL via backend
      const resolveRes = await fetch(`${backendUrl}/api/steam/resolve-vanity?url=${encodeURIComponent(clean)}`, {
        cache: "no-store",
      });

      if (resolveRes.ok) {
        const resolveData = await resolveRes.json();
        if (resolveData?.response?.steamid) {
          steamId = resolveData.response.steamid;
        }
      }
    }

    if (!steamId) {
      return NextResponse.json({ success: false, error: "Could not resolve Steam account. Check your Steam ID or custom URL." }, { status: 404 });
    }

    // 3. Fetch player summary
    let personaName = `SteamUser_${steamId.slice(-4)}`;
    let avatar = "";
    let profileUrl = `https://steamcommunity.com/profiles/${steamId}`;
    let communityVisibilityState = 3;

    const summaryRes = await fetch(`${backendUrl}/api/steam/player/${steamId}/summary`, {
      cache: "no-store",
    });

    if (summaryRes.ok) {
      const summaryData = await summaryRes.json();
      const player = summaryData?.response?.players?.[0];
      if (player) {
        personaName = player.personaname || personaName;
        avatar = player.avatarfull || player.avatarmedium || player.avatar || "";
        profileUrl = player.profileurl || profileUrl;
        communityVisibilityState = player.communityvisibilitystate || 3;
      }
    }

    const steamUser: SteamUser = {
      steamId,
      personaName,
      avatar,
      profileUrl,
      communityVisibilityState,
    };

    const response = NextResponse.json({ success: true, user: steamUser });
    response.cookies.set("steam_user", JSON.stringify(steamUser), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to link Steam account" }, { status: 500 });
  }
}
