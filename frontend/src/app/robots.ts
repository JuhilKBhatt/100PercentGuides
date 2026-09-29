import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://100percentguides.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/auth/",
          "/api/steam/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
