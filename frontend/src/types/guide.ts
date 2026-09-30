export interface GuideMap {
  id: string;
  name: string;
  imageUrl?: string;
  viewBox?: string;
  vectors?: MapVectors;
}

export interface CollectibleStepItem {
  id: number;
  name: string;
  region: string;
  locationText: string;
  details?: string;
  imageUrl?: string;
  mapId?: string;
  x: number;
  y: number;
}

export interface GuideRegion {
  id: string;
  name: string;
  itemCount: number;
  items: CollectibleStepItem[];
}

export interface MapVectors {
  land?: string;
  water?: string;
  river?: string;
}

export interface AttachedAchievement {
  id: number;
  name: string;
  image?: string;
  percent?: string;
  hidden?: boolean;
  description?: string;
}

export interface CollectibleGuide {
  gameId: string;
  gameSlug: string;
  guideSlug: string;
  title: string;
  subtitle?: string;
  totalCount: number;
  requiredForCompletion: number;
  mapViewBox?: string;
  mapVectors?: MapVectors;
  mapImageUrl?: string;
  maps?: GuideMap[];
  achievementId?: number | string;
  relatedAchievements?: AttachedAchievement[];
  regions: GuideRegion[];
}

export interface GuideMeta {
  gameId: string;
  guideSlug: string;
  title: string;
  subtitle?: string;
  totalCount: number;
  updatedAt?: number;
  mapsCount?: number;
  hasMap?: boolean;
  achievementsCount?: number;
  achievementId?: string | number;
  achievementIds?: (string | number)[];
}
