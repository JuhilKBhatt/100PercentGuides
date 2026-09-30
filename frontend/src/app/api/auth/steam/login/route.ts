import { NextRequest, NextResponse } from "next/server";

function getSafeReturnUrl(url: string | null): string {
  if (!url) return "/";
  const trimmed = url.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\") && !trimmed.includes("://")) {
    return trimmed;
  }
  return "/";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const safeReturnUrl = getSafeReturnUrl(searchParams.get("returnUrl"));

  // Determine origin (respect headers when behind proxy/container)
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const origin = `${proto}://${host}`;

  const callbackUrl = `${origin}/api/auth/steam/callback?returnUrl=${encodeURIComponent(safeReturnUrl)}`;

  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": callbackUrl,
    "openid.realm": `${origin}/`,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });

  const steamOpenIdUrl = `https://steamcommunity.com/openid/login?${params.toString()}`;
  return NextResponse.redirect(steamOpenIdUrl);
}
