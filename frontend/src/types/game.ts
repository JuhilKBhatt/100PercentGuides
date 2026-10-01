export interface Developer {
  id: number;
  name: string;
  slug?: string;
  image_background?: string;
}

export interface Publisher {
  id: number;
  name: string;
  slug?: string;
}

export interface Genre {
  id: number;
  name: string;
  slug?: string;
}

export interface Game {
  id: number;
  name: string;
  background_image: string;
  released: string;
  rating?: number;
  steamAppId?: string;
  steamUrl?: string;
}

export interface GameDetails extends Game {
  description: string;
  description_raw?: string;
  playtime: number;
  developers?: Developer[];
  publishers?: Publisher[];
  genres?: Genre[];
  steamAppId?: string;
  steamUrl?: string;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  image: string;
  percent?: string;
  hidden?: boolean;
  steamApiName?: string;
  completed?: boolean;
  unlockTime?: number;
}

export type AchievementTier = "gold" | "silver" | "bronze";

export interface AchievementTierInfo {
  tier: AchievementTier;
  label: string;
  colorClass: string;
  dotClass: string;
  glowClass: string;
  tooltip: string;
  percentDisplay: string;
}
