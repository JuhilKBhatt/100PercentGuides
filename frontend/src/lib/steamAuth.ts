import { SteamUser } from "@/types";

export async function getCurrentSteamUser(): Promise<SteamUser | null> {
  try {
    const res = await fetch("/api/auth/steam/user", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch (err) {
    console.error("Failed to get current Steam user:", err);
    return null;
  }
}

export async function connectManualSteam(identifier: string): Promise<{ success: boolean; user?: SteamUser; error?: string }> {
  try {
    const res = await fetch("/api/auth/steam/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Failed to link Steam account" };
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to link Steam account" };
  }
}

export async function logoutSteam(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/steam/logout", {
      method: "POST",
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to logout Steam user:", err);
    return false;
  }
}

export function initiateSteamLogin(returnUrl?: string) {
  const currentPath = returnUrl || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
  window.location.href = `/api/auth/steam/login?returnUrl=${encodeURIComponent(currentPath)}`;
}
