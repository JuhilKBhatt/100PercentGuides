import React from "react";
import type { Metadata } from "next";
import AdCarousel from "@/components/AdCarousel";
import BuyButton from "@/components/BuyButton";
import JsonLd from "@/components/seo/JsonLd";
import { getGameDetails, getGameAchievements, listGameGuides } from "@/lib/api";
import AchievementsList from "@/components/achievement/AchievementsList";
import { cleanGameDescription } from "@/utils/format";
import { getAffiliateBuyUrl } from "@/utils/affiliate";
import { Calendar, Building2, Gamepad2, Star, Clock } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://100percentguides.com";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const game = await getGameDetails(id);

  if (!game) {
    return {
      title: "Game Not Found",
      description: "The requested game achievement guide could not be found.",
    };
  }

  const title = `${game.name} 100% Achievement Guide & Roadmap`;
  const description = `Complete 100% achievement guide, interactive maps, and trophy roadmap for ${game.name}. Track live Steam unlocks and step-by-step checklists.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/game/${id}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/game/${id}`,
      type: "website",
      images: game.background_image ? [{ url: game.background_image }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: game.background_image ? [game.background_image] : [],
    },
  };
}

export default async function GamePage({ params }: Props) {
  const { id } = await params;
  const game = await getGameDetails(id);
  const achievements = await getGameAchievements(id);
  const initialGuides = await listGameGuides(id);

  if (!game) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-center text-white py-24">
        <p className="text-xl font-medium text-zinc-400">Game not found.</p>
      </div>
    );
  }

  const developerNames = game.developers?.map((d) => d.name).join(", ");
  const publisherNames = game.publishers?.map((p) => p.name).join(", ");
  const genreNames = game.genres?.map((g) => g.name).join(", ");
  const completionTime = game.playtime && game.playtime > 0 ? `~${game.playtime} hours` : "40-60 hours";
  const sanitizedDescription = cleanGameDescription(game.description);
  const affiliateBuyUrl = getAffiliateBuyUrl(game.name);

  // Schema.org Structured Data
  const gameSchema = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.name,
    description: sanitizedDescription.slice(0, 300),
    image: game.background_image,
    operatingSystem: "Windows, PlayStation, Xbox",
    applicationCategory: "Game",
    genre: game.genres?.map((g) => g.name),
    author: {
      "@type": "Organization",
      name: developerNames || "Game Developer",
    },
    publisher: {
      "@type": "Organization",
      name: publisherNames || "Game Publisher",
    },
    aggregateRating: game.rating
      ? {
          "@type": "AggregateRating",
          ratingValue: game.rating,
          bestRating: 5,
          ratingCount: 100,
        }
      : undefined,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: game.name,
        item: `${siteUrl}/game/${id}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Schema.org Structured Data */}
      <JsonLd data={gameSchema} />
      <JsonLd data={breadcrumbSchema} />

      {/* Hero Banner with Background Image */}
      <div 
        className="relative w-full min-h-[460px] md:min-h-[500px] bg-cover bg-center flex items-end overflow-hidden" 
        style={{ backgroundImage: `url(${game.background_image})` }}
      >
        {/* Solid black gradient overlays */}
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
        
        <div className="relative w-full max-w-6xl mx-auto px-4 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 pb-10 pt-28 z-10">
          {/* Left Side: Game Name & Dev Studio */}
          <div className="space-y-3 max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-outfit text-white drop-shadow-2xl tracking-tight">
              {game.name}
            </h1>
            {developerNames && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded-md bg-orange-500/15 border border-orange-500/40 text-orange-300 shadow-sm">
                  Dev Studio
                </span>
                <span className="text-base sm:text-lg text-amber-400 font-semibold drop-shadow-md">
                  {developerNames}
                </span>
              </div>
            )}
          </div>

          {/* Right Side: Blur Box with Game Metadata */}
          <div className="w-full lg:w-[360px] bg-black/90 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                Game Information
              </span>
              {game.rating ? (
                <div className="flex items-center gap-1 text-amber-400 font-bold text-sm bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  <span>{game.rating} / 5</span>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Calendar size={15} className="text-orange-400" />
                  Release Date
                </span>
                <span className="font-medium text-white text-right">
                  {game.released ? new Date(game.released).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "TBA"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Building2 size={15} className="text-orange-400" />
                  Publisher
                </span>
                <span className="font-medium text-white text-right truncate max-w-[190px]" title={publisherNames}>
                  {publisherNames || "Independent"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Gamepad2 size={15} className="text-orange-400" />
                  Genres
                </span>
                <span className="font-medium text-white text-right truncate max-w-[190px]" title={genreNames}>
                  {genreNames || "General"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Star size={15} className="text-yellow-400" />
                  Rating
                </span>
                <span className="font-bold text-amber-400">
                  {game.rating ? `${game.rating} / 5` : "Unrated"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-zinc-800">
                <span className="text-zinc-400 flex items-center gap-2 font-medium">
                  <Clock size={15} className="text-orange-400" />
                  100% Completion
                </span>
                <span className="font-extrabold text-amber-400 bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-500/30">
                  {completionTime}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        {/* Buy Button CTA above Ads and under Hero Banner */}
        <BuyButton gameName={game.name} buyUrl={affiliateBuyUrl} />

        {/* Ads Section */}
        <AdCarousel />
        
        {/* Achievements Section with Integrated Step-by-Step Checklists */}
        <AchievementsList 
          achievements={achievements} 
          steamAppId={game.steamAppId} 
          gameName={game.name}
          gameId={id}
          initialGuides={initialGuides}
        />
      </div>
    </div>
  );
}
