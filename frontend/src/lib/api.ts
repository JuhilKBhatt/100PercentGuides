import { Game, GameDetails, Achievement, GameChecklist, CollectibleGuide, GuideMeta } from "@/types";

export const BACKEND_URL = process.env.BACKEND_URL;

export type { Game, GameDetails, Achievement };

export async function getRecentGames(): Promise<Game[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/games/recent`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error("Failed to fetch recent games from backend:", e);
    return [];
  }
}

export async function getGameDetails(id: string): Promise<GameDetails | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/games/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.error("Failed to fetch game details from backend:", e);
    return null;
  }
}

export async function getGameAchievements(id: string): Promise<Achievement[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/games/${id}/achievements`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results as Achievement[]) || [];
  } catch (e) {
    console.error("Failed to fetch game achievements from backend:", e);
    return [];
  }
}

export async function searchGames(query: string, signal?: AbortSignal): Promise<Game[]> {
  const res = await fetch(`/api/games/search?q=${encodeURIComponent(query)}`, {
    signal,
  });
  if (!res.ok) {
    throw new Error("Search request failed");
  }
  const data = await res.json();
  return data.results ? data.results.slice(0, 6) : [];
}

export async function getGameChecklist(id: string): Promise<GameChecklist | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/games/${id}/checklist`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.error("Failed to fetch game checklist from backend:", e);
    return null;
  }
}

export async function listGameGuides(id: string): Promise<GuideMeta[]> {
  try {
    const url = typeof window === "undefined" 
      ? `${BACKEND_URL}/api/games/${id}/guides` 
      : `/api/games/${id}/guides`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    console.error(`Failed to list guides for game ${id}:`, e);
    return [];
  }
}

export async function getCollectibleGuide(id: string, slug: string): Promise<CollectibleGuide | null> {
  try {
    const url = typeof window === "undefined" 
      ? `${BACKEND_URL}/api/games/${id}/guides/${slug}` 
      : `/api/games/${id}/guides/${slug}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.error(`Failed to fetch guide ${slug} for game ${id}:`, e);
    return null;
  }
}

export async function saveCollectibleGuide(id: string, guide: CollectibleGuide): Promise<{ success: boolean; message?: string }> {
  try {
    const url = typeof window === "undefined" 
      ? `${BACKEND_URL}/api/games/${id}/guides` 
      : `/api/games/${id}/guides`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(guide),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.error || "Failed to save guide to database" };
    }
    return res.json();
  } catch (e: any) {
    console.error(`Failed to save guide to database:`, e);
    return { success: false, message: e.message };
  }
}

export async function deleteCollectibleGuide(id: string, slug: string): Promise<{ success: boolean }> {
  try {
    const url = typeof window === "undefined" 
      ? `${BACKEND_URL}/api/games/${id}/guides/${slug}` 
      : `/api/games/${id}/guides/${slug}`;
    const res = await fetch(url, { method: "DELETE" });
    return { success: res.ok };
  } catch (e) {
    console.error(`Failed to delete guide ${slug} for game ${id}:`, e);
    return { success: false };
  }
}

import { SteamGameMapping } from "@/types";

export async function getGameSteamMapping(id: string): Promise<SteamGameMapping | null> {
  try {
    const url = typeof window === "undefined" 
      ? `${BACKEND_URL}/api/games/${id}/steam` 
      : `/api/games/${id}/steam`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.error(`Failed to fetch Steam mapping for game ${id}:`, e);
    return null;
  }
}

export async function getSteamAchievements(appId: string): Promise<any> {
  try {
    const url = typeof window === "undefined" 
      ? `${BACKEND_URL}/api/steam/app/${appId}/achievements` 
      : `/api/steam/app/${appId}/achievements`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.error(`Failed to fetch Steam achievements for app ${appId}:`, e);
    return null;
  }
}

export async function getPlayerSteamAchievements(steamId: string, appId: string): Promise<any> {
  try {
    const url = typeof window === "undefined" 
      ? `${BACKEND_URL}/api/steam/player/${steamId}/achievements/${appId}` 
      : `/api/steam/player/${steamId}/achievements/${appId}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.error(`Failed to fetch player Steam achievements:`, e);
    return null;
  }
}

export async function getPlayerOwnedGames(steamId: string): Promise<any> {
  try {
    const url = typeof window === "undefined" 
      ? `${BACKEND_URL}/api/steam/player/${steamId}/games` 
      : `/api/steam/player/${steamId}/games`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    console.error(`Failed to fetch player owned games:`, e);
    return null;
  }
}
