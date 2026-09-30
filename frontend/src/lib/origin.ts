import { NextRequest } from "next/server";

/**
 * Resolves the public, browser-facing origin of the incoming request.
 * Handles reverse proxies, Cloudflare tunnels, Docker internal networking,
 * explicit environment variables, and client-provided origin hints.
 */
export function getPublicOrigin(request: NextRequest): string {
  // 1. Explicit query param passed during login initiation or redirect
  const queryOrigin =
    request.nextUrl.searchParams.get("origin") ||
    request.nextUrl.searchParams.get("clientOrigin");
  if (queryOrigin) {
    try {
      const parsed = new URL(queryOrigin);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.origin;
      }
    } catch {}
  }

  // 2. Explicit environment variable override (NEXT_PUBLIC_SITE_URL or SITE_URL)
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (envUrl && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    if (!trimmed.includes("localhost") && !trimmed.includes("127.0.0.1")) {
      return trimmed;
    }
  }

  // 3. Referer header (when browser clicks or navigates, Referer contains real browser URL)
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const parsedRef = new URL(referer);
      if (parsedRef.protocol === "http:" || parsedRef.protocol === "https:") {
        if (
          !parsedRef.hostname.includes("localhost") &&
          !parsedRef.hostname.includes("127.0.0.1") &&
          !parsedRef.hostname.startsWith("frontend")
        ) {
          return parsedRef.origin;
        }
      }
    } catch {}
  }

  // 4. Standard proxy headers (Cloudflare, Nginx, Traefik, AWS ALB)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const cleanHost = forwardedHost.split(",")[0].trim();
    if (
      !cleanHost.includes("localhost") &&
      !cleanHost.includes("127.0.0.1") &&
      !cleanHost.startsWith("frontend")
    ) {
      const proto =
        forwardedProto?.split(",")[0].trim() ||
        (cleanHost.includes("localhost") ? "http" : "https");
      return `${proto}://${cleanHost}`;
    }
  }

  // 5. Host header if not an internal container or localhost
  const host = request.headers.get("host");
  if (
    host &&
    !host.includes("localhost") &&
    !host.includes("127.0.0.1") &&
    !host.startsWith("frontend")
  ) {
    const proto =
      forwardedProto?.split(",")[0].trim() ||
      (request.url.startsWith("https") ? "https" : "http");
    return `${proto}://${host}`;
  }

  // 6. If envUrl is set (even for localhost), use it
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  // 7. Last resort default for local development
  const proto = forwardedProto?.split(",")[0].trim() || "http";
  const finalHost = host || "localhost:3000";
  return `${proto}://${finalHost}`;
}
