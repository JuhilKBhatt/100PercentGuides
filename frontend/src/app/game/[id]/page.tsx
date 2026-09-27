import React from "react";
import AdCarousel from "@/components/AdCarousel";
import BuyButton from "@/components/BuyButton";
import { getGameDetails, getGameAchievements, listGameGuides } from "@/lib/api";
import GuidesListSection from "@/components/guide/GuidesListSection";
import AchievementsList from "@/components/achievement/AchievementsList";
import { cleanGameDescription } from "@/utils/format";
import { getAffiliateBuyUrl } from "@/utils/affiliate";
import { getAchievementTierInfo } from "@/utils/achievement";
import { Calendar, Building2, Gamepad2, Star, Clock } from "lucide-react";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Hero Banner with Background Image */}
      <div 
        className="relative w-full min-h-[460px] md:min-h-[500px] bg-cover bg-center flex items-end overflow-hidden" 
        style={{ backgroundImage: `url(${game.background_image})` }}
      >
        {/* Solid black gradient overlays to completely eliminate any grey haze */}
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

              {game.steamAppId && (
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-zinc-900">
                  <span className="text-zinc-400 flex items-center gap-2 text-xs">
                    <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.029 4.524 4.524s-2.03 4.524-4.524 4.524h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.733L.438 15.05C1.562 20.166 6.342 24 11.979 24c6.627 0 12-5.373 12-12S18.605 0 11.979 0z" />
                    </svg>
                    Steam Game ID
                  </span>
                  <a
                    href={game.steamUrl || `https://store.steampowered.com/app/${game.steamAppId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                    title="View Steam App ID (Steam Login Tracking Ready)"
                  >
                    <span>{game.steamAppId}</span>
                    <span className="text-[10px] text-zinc-500 font-sans">↗</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        {/* Buy Button CTA above Ads and under Hero Banner */}
        <BuyButton gameName={game.name} buyUrl={affiliateBuyUrl} />

        {/* Ads Section */}
        <AdCarousel />


        {/* About Section */}
        <div className="p-6 bg-black border border-zinc-900 rounded-2xl shadow-xl prose prose-invert max-w-none text-zinc-300">
          <h3 className="text-2xl font-bold font-outfit mb-4 bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400">
            About {game.name}
          </h3>
          <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }}></div>
        </div>
        
        {/* Interactive Collectible Guides Loaded from Database */}
        <GuidesListSection 
          gameId={id} 
          gameSlug={game.name.toLowerCase().replace(/\s+/g, "-")} 
          initialGuides={initialGuides} 
        />

        {/* Achievements Section with Hidden / Secret Achievement Support */}
        <AchievementsList achievements={achievements} />
      </div>
    </div>
  );
}