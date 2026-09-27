import { AffiliateConfig } from "@/types";

/**
 * Builds the affiliate buy/store URL for a game, injecting the affiliate tag
 * and cookie parameters defined in environment variables.
 *
 * @param gameName The name of the video game
 * @param overrideConfig Optional configuration to override environment defaults
 * @returns Fully constructed affiliate purchase URL
 */
export function getAffiliateBuyUrl(gameName: string, overrideConfig?: AffiliateConfig): string {
  const baseUrl = 
    overrideConfig?.baseUrl || 
    process.env.NEXT_PUBLIC_AFFILIATE_BASE_URL || 
    process.env.AFFILIATE_BASE_URL || 
    "https://store.steampowered.com/search/?term=";

  const tag = 
    overrideConfig?.tag ?? 
    process.env.NEXT_PUBLIC_AFFILIATE_TAG ?? 
    process.env.AFFILIATE_TAG ?? 
    "";

  const cookie = 
    overrideConfig?.cookie ?? 
    process.env.NEXT_PUBLIC_AFFILIATE_COOKIE ?? 
    process.env.AFFILIATE_COOKIE ?? 
    "";

  const encodedName = encodeURIComponent(gameName.trim());

  let targetUrl: string;

  if (baseUrl.includes("{query}")) {
    targetUrl = baseUrl.replace("{query}", encodedName);
  } else if (baseUrl.endsWith("=") || baseUrl.endsWith("/")) {
    targetUrl = `${baseUrl}${encodedName}`;
  } else if (baseUrl.includes("?")) {
    targetUrl = `${baseUrl}&q=${encodedName}`;
  } else {
    targetUrl = `${baseUrl}?q=${encodedName}`;
  }

  try {
    const parsed = new URL(targetUrl);
    if (tag) {
      parsed.searchParams.set("tag", tag);
    }
    if (cookie) {
      parsed.searchParams.set("cookie", cookie);
    }
    return parsed.toString();
  } catch {
    // Fallback if URL parsing encounters relative or custom scheme
    let params = "";
    if (tag) params += `&tag=${encodeURIComponent(tag)}`;
    if (cookie) params += `&cookie=${encodeURIComponent(cookie)}`;
    const joiner = targetUrl.includes("?") ? "" : "?";
    return `${targetUrl}${joiner}${params.replace(/^&/, "")}`;
  }
}
