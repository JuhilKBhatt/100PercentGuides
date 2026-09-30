export interface RecentlyVisitedPage {
  id: string | number;
  url: string;
  name: string;
  background_image?: string;
  visitedAt: number;
  released?: string;
  rating?: number;
  subtitle?: string;
}
