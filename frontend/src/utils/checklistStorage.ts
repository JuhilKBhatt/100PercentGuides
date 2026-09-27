import { GameChecklist, UserChecklistProgress } from "@/types";

const STORAGE_PREFIX = "100pg_checklist_";

/**
 * Loads user checklist progress from localStorage safely (SSR-compatible).
 */
export function loadChecklistProgress(gameId: string): UserChecklistProgress {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${gameId}`);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to load progress for game ${gameId}:`, e);
    return {};
  }
}

/**
 * Persists user checklist progress into localStorage safely.
 */
export function saveChecklistProgress(gameId: string, progress: UserChecklistProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${gameId}`, JSON.stringify(progress));
  } catch (e) {
    console.error(`Failed to save progress for game ${gameId}:`, e);
  }
}

/**
 * Resets user progress for a given game.
 */
export function resetChecklistProgress(gameId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${gameId}`);
  } catch (e) {
    console.error(`Failed to reset progress for game ${gameId}:`, e);
  }
}

export interface ProgressSummary {
  totalDone: number;
  totalRequired: number;
  remaining: number;
  percentage: number;
  isComplete: boolean;
  categoryStats: Record<string, { done: number; total: number; percentage: number }>;
}

/**
 * Computes overall and per-category progress metrics against the game checklist.
 */
export function calculateProgressSummary(
  checklist: GameChecklist,
  progress: UserChecklistProgress
): ProgressSummary {
  let totalDone = 0;
  let totalRequired = 0;
  const categoryStats: Record<string, { done: number; total: number; percentage: number }> = {};

  for (const cat of checklist.categories) {
    let catDone = 0;
    let catTotal = 0;

    for (const item of cat.items) {
      catTotal += item.totalRequired;
      const userCount = progress[item.id] || 0;
      catDone += Math.min(Math.max(0, userCount), item.totalRequired);
    }

    totalDone += catDone;
    totalRequired += catTotal;

    const catPct = catTotal > 0 ? Math.round((catDone / catTotal) * 100) : 0;
    categoryStats[cat.id] = {
      done: catDone,
      total: catTotal,
      percentage: catPct,
    };
  }

  const finalTotal = totalRequired > 0 ? totalRequired : checklist.totalRequirements;
  const percentage = finalTotal > 0 ? Math.min(100, Math.round((totalDone / finalTotal) * 100)) : 0;

  return {
    totalDone,
    totalRequired: finalTotal,
    remaining: Math.max(0, finalTotal - totalDone),
    percentage,
    isComplete: finalTotal > 0 && totalDone >= finalTotal,
    categoryStats,
  };
}
