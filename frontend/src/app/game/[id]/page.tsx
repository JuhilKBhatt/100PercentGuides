import React from "react";
import AdCarousel from "@/components/AdCarousel";
import BuyButton from "@/components/BuyButton";
import { getGameDetails, getGameAchievements } from "@/lib/api";
import { cleanGameDescription } from "@/utils/format";
import { getAffiliateBuyUrl } from "@/utils/affiliate";
import { getAchievementTierInfo } from "@/utils/achievement";
import { Calendar, Building2, Gamepad2, Star, Clock } from "lucide-react";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGameDetails(id);
  const achievements = await getGameAchievements(id);

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
        
        {/* Achievements Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-3xl font-bold font-outfit text-white flex items-center gap-3">
              <span className="w-2.5 h-7 rounded-full bg-gradient-to-b from-orange-500 to-yellow-400 inline-block"></span>
              Achievements ({achievements.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.length > 0 ? (
              achievements.map((ach) => {
                const tierInfo = getAchievementTierInfo(ach.percent);
                return (
                  <div 
                    key={ach.id} 
                    className="flex gap-4 p-4 bg-black border border-zinc-900 rounded-xl hover:border-orange-500/50 hover:shadow-[0_0_25px_rgba(249,115,22,0.12)] transition-all group"
                  >
                    {ach.image ? (
                      <img 
                        src={ach.image} 
                        alt={ach.name} 
                        className="w-16 h-16 rounded-lg object-cover shadow-md group-hover:scale-105 transition-transform border border-zinc-900 shrink-0" 
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-zinc-950 border border-zinc-900 shrink-0"></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span 
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${tierInfo.dotClass} ${tierInfo.glowClass}`}
                            title={tierInfo.tooltip}
                            aria-label={tierInfo.tooltip}
                          />
                          <h4 className="font-semibold text-white group-hover:text-amber-400 transition-colors truncate">
                            {ach.name}
                          </h4>
                        </div>
                        {tierInfo.percentDisplay && (
                          <span 
                            className="text-[11px] font-medium text-zinc-500 shrink-0 font-mono"
                            title={tierInfo.tooltip}
                          >
                            {tierInfo.percentDisplay}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{ach.description}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-zinc-500 col-span-full">No achievements found for this game.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
