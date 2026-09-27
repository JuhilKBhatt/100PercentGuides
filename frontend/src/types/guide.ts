export interface CollectibleStepItem {
  id: number;
  name: string;
  region: string;
  locationText: string;
  details?: string;
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

export interface CollectibleGuide {
  gameId: string;
  gameSlug: string;
  guideSlug: string;
  title: string;
  subtitle?: string;
  totalCount: number;
  requiredForCompletion: number;
  mapViewBox: string;
  mapVectors?: MapVectors;
  regions: GuideRegion[];
}

export interface GuideMeta {
  gameId: string;
  guideSlug: string;
  title: string;
  totalCount: number;
  updatedAt?: number;
}
