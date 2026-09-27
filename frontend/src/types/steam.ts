export interface SteamGameMapping {
  gameId: string;
  steamAppId: string | null;
  steamUrl: string | null;
}

export interface SteamAchievement {
  name: string; // Internal API key e.g. ACH00
  displayName: string;
  description?: string;
  icon: string;
  icongray: string;
  percent?: number;
  achieved?: boolean;
  unlockTime?: number;
}

export interface SteamPlayerAchievementStatus {
  apiname: string;
  achieved: number;
  unlocktime: number;
}

export interface SteamPlayerStats {
  steamId: string;
  gameName: string;
  achievements: SteamPlayerAchievementStatus[];
  success: boolean;
}

export interface SteamOwnedGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url?: string;
}
