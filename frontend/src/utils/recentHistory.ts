import { RecentlyVisitedPage } from "@/types/history";

const STORAGE_KEY = "100pg_recently_visited";
const MAX_RECENT_ITEMS = 12;

export function getRecentlyVisited(): RecentlyVisitedPage[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => (b.visitedAt || 0) - (a.visitedAt || 0));
  } catch (err) {
    console.warn("Failed to load recently visited pages:", err);
    return [];
  }
}

export function addRecentlyVisited(item: Omit<RecentlyVisitedPage, "visitedAt"> & { visitedAt?: number }): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const existing = getRecentlyVisited();
    // Filter out previous visit for this game / url to deduplicate and move to top
    const filtered = existing.filter(
      (p) => String(p.id) !== String(item.id) && p.url !== item.url
    );

    const updatedItem: RecentlyVisitedPage = {
      ...item,
      visitedAt: item.visitedAt || Date.now(),
    };

    const nextList = [updatedItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));

    // Dispatch update event for live UI reactivity
    window.dispatchEvent(new Event("100pg_recently_visited_updated"));
  } catch (err) {
    console.warn("Failed to save recently visited page:", err);
  }
}

export function clearRecentlyVisited(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("100pg_recently_visited_updated"));
  } catch (err) {
    console.warn("Failed to clear recently visited pages:", err);
  }
}

export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "Recently";
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return "Yesterday";
  const days = Math.floor(diffSec / 86400);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
