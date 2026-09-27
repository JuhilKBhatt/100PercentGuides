import { AchievementTierInfo } from "@/types";

/**
 * Calculates achievement rarity tier based on unlock percentage:
 * - <= 5%  : Gold (Ultra Rare)
 * - <= 50% : Silver (Rare / Uncommon)
 * - > 50%  : Bronze (Common)
 *
 * @param percent Unlock percentage as string or number from RAWG API
 * @returns AchievementTierInfo with styling and tooltip attributes
 */
export function getAchievementTierInfo(percent?: string | number): AchievementTierInfo {
  const numericValue = typeof percent === "string" ? parseFloat(percent) : typeof percent === "number" ? percent : NaN;
  const isAvailable = !isNaN(numericValue);
  const percentDisplay = isAvailable ? `${numericValue.toFixed(1)}%` : "";

  // Gold Tier: 5% or less unlocked (Ultra Rare)
  if (isAvailable && numericValue <= 5) {
    return {
      tier: "gold",
      label: "Gold",
      colorClass: "text-amber-400",
      dotClass: "bg-amber-400",
      glowClass: "shadow-[0_0_8px_rgba(251,191,36,0.9)] ring-1 ring-amber-400/50",
      tooltip: `Gold Tier: ${numericValue.toFixed(1)}% of players unlocked this`,
      percentDisplay,
    };
  }

  // Silver Tier: 50% or less unlocked (Rare / Uncommon)
  if (isAvailable && numericValue <= 50) {
    return {
      tier: "silver",
      label: "Silver",
      colorClass: "text-slate-300",
      dotClass: "bg-slate-300",
      glowClass: "shadow-[0_0_8px_rgba(226,232,240,0.85)] ring-1 ring-slate-300/50",
      tooltip: `Silver Tier: ${numericValue.toFixed(1)}% of players unlocked this`,
      percentDisplay,
    };
  }

  // Bronze Tier: rest (> 50% or default)
  return {
    tier: "bronze",
    label: "Bronze",
    colorClass: "text-amber-700",
    dotClass: "bg-[#cd7f32]",
    glowClass: "shadow-[0_0_8px_rgba(205,127,50,0.85)] ring-1 ring-[#cd7f32]/50",
    tooltip: isAvailable
      ? `Bronze Tier: ${numericValue.toFixed(1)}% of players unlocked this`
      : "Bronze Tier: Common achievement",
    percentDisplay,
  };
}
