"use client";

import { useEffect } from "react";
import { addRecentlyVisited } from "@/utils/recentHistory";
import { RecentlyVisitedPage } from "@/types/history";

interface GameVisitTrackerProps {
  item: Omit<RecentlyVisitedPage, "visitedAt">;
}

export default function GameVisitTracker({ item }: GameVisitTrackerProps) {
  useEffect(() => {
    addRecentlyVisited(item);
  }, [item.id, item.url, item.name, item.background_image]);

  return null;
}
