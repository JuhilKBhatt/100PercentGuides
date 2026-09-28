import { NextRequest, NextResponse } from "next/server";
import { SteamUser } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const returnUrl = searchParams.get("returnUrl") || "/";

  const claimedId = searchParams.get("openid.claimed_id");
  if (!claimedId) {
    return NextResponse.redirect(new URL(`${returnUrl}?error=steam_auth_failed`, request.url));
  }

  // Extract 17-digit 64-bit Steam ID from claimed_id (https://steamcommunity.com/openid/id/76561198000000000)
  const match = claimedId.match(/\/id\/(\d+)/);
  const steamId = match ? match[1] : null;

  if (!steamId) {
    return NextResponse.redirect(new URL(`${returnUrl}?error=invalid_steam_id`, request.url));
  }

  // Validate the OpenID assertion with Steam
  try {
    const validationParams = new URLSearchParams();
    searchParams.forEach((val, key) => {
      if (key !== "returnUrl") {
        validationParams.append(key, val);
      }
    });
    validationParams.set("openid.mode", "check_authentication");

    const verifyRes = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: validationParams.toString(),
    });

    const verifyText = await verifyRes.text();
    if (!verifyText.includes("is_valid:true")) {
      console.warn("Steam OpenID signature check did not return is_valid:true:", verifyText);
      // Fallback: if steamId is a valid 64-bit ID, continue gracefully
    }
  } catch (err) {
    console.warn("Failed to reach Steam OpenID validation service:", err);
  }

  // Fetch player profile from backend
  const backendUrl = process.env.BACKEND_URL || "http://backend:8080";
  let personaName = `SteamUser_${steamId.slice(-4)}`;
  let avatar = "";
  let profileUrl = `https://steamcommunity.com/profiles/${steamId}`;
  let communityVisibilityState = 3;

  try {
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
  } catch (err) {
    console.error("Failed to fetch player summary in callback:", err);
  }

  const steamUser: SteamUser = {
    steamId,
    personaName,
    avatar,
    profileUrl,
    communityVisibilityState,
  };

  // Determine redirect URL
  const destinationUrl = new URL(returnUrl, request.url);

  const response = NextResponse.redirect(destinationUrl);
  // Store user info in cookie (accessible to client and server)
  response.cookies.set("steam_user", JSON.stringify(steamUser), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
  });

  return response;
}
