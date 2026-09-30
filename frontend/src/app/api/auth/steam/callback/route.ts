import { NextRequest, NextResponse } from "next/server";
import { SteamUser } from "@/types";
import { getPublicOrigin } from "@/lib/origin";

function getSafeReturnUrl(url: string | null): string {
  if (!url) return "/";
  const trimmed = url.trim();
  // Ensure returnUrl is strictly a relative path to prevent Open Redirects
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\") && !trimmed.includes("://")) {
    return trimmed;
  }
  return "/";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const safeReturnUrl = getSafeReturnUrl(searchParams.get("returnUrl"));
  const origin = getPublicOrigin(request);

  const claimedId = searchParams.get("openid.claimed_id");
  if (!claimedId) {
    const redirectUrl = new URL(safeReturnUrl, origin);
    redirectUrl.searchParams.set("error", "steam_auth_failed");
    return NextResponse.redirect(redirectUrl);
  }

  // Extract 17-digit 64-bit Steam ID from claimed_id (https://steamcommunity.com/openid/id/76561198000000000)
  const match = claimedId.match(/\/id\/(\d{17})/);
  const steamId = match ? match[1] : null;

  if (!steamId) {
    const redirectUrl = new URL(safeReturnUrl, origin);
    redirectUrl.searchParams.set("error", "invalid_steam_id");
    return NextResponse.redirect(redirectUrl);
  }

  // Validate the OpenID assertion strictly with Steam
  try {
    const validationParams = new URLSearchParams();
    searchParams.forEach((val, key) => {
      if (key.startsWith("openid.")) {
        validationParams.set(key, val);
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
      console.warn("Security Alert: Steam OpenID signature verification failed for steamId:", steamId);
      const redirectUrl = new URL(safeReturnUrl, origin);
      redirectUrl.searchParams.set("error", "steam_signature_invalid");
      return NextResponse.redirect(redirectUrl);
    }
  } catch (err) {
    console.error("Failed to reach Steam OpenID validation service:", err);
    const redirectUrl = new URL(safeReturnUrl, origin);
    redirectUrl.searchParams.set("error", "steam_validation_unavailable");
    return NextResponse.redirect(redirectUrl);
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

  const destinationUrl = new URL(safeReturnUrl, origin);
  const response = NextResponse.redirect(destinationUrl);

  // Store user info in secure cookie (HttpOnly protects from XSS session theft)
  response.cookies.set("steam_user", JSON.stringify(steamUser), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
  });

  return response;
}
