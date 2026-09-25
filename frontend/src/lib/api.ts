import { Game, GameDetails, Achievement } from "@/types";

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
