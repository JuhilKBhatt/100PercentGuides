import { MetadataRoute } from "next";
import { getRecentGames } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://100percentguides.com";

  // Core static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Dynamic game hubs
  try {
    const recentGames = await getRecentGames();
    const gameRoutes: MetadataRoute.Sitemap = recentGames.map((game) => ({
      url: `${baseUrl}/game/${game.id}`,
      lastModified: game.released ? new Date(game.released) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...staticRoutes, ...gameRoutes];
  } catch (e) {
    console.error("Failed to generate dynamic game sitemap entries:", e);
    return staticRoutes;
  }
}
