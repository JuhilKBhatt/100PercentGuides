import React from "react";
import AdCarousel from "@/components/AdCarousel";
import { getGameDetails, getGameAchievements } from "@/lib/api";
import { cleanGameDescription } from "@/utils/format";
import { Calendar, Building2, Gamepad2, Star, Clock } from "lucide-react";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGameDetails(id);
  const achievements = await getGameAchievements(id);

  if (!game) {
    return <div className="container mx-auto py-24 text-center text-white">Game not found.</div>;
  }

  const developerNames = game.developers?.map((d) => d.name).join(", ");
  const publisherNames = game.publishers?.map((p) => p.name).join(", ");
  const genreNames = game.genres?.map((g) => g.name).join(", ");
  const completionTime = game.playtime && game.playtime > 0 ? `~${game.playtime} hours` : "40-60 hours";
  const sanitizedDescription = cleanGameDescription(game.description);

  return (
    <div className="pb-16 bg-black">
      {/* Hero Banner with Background Image */}
      <div 
        className="relative w-full min-h-[440px] md:min-h-[480px] bg-cover bg-center flex items-end overflow-hidden" 
        style={{ backgroundImage: `url(${game.background_image})` }}
      >
        {/* Crisp black overlays - no grey interpolation */}
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
        
        <div className="container relative w-full h-full flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 pb-10 pt-28 z-10">
          {/* Left Side: Game Name & Dev Studio */}
          <div className="space-y-3 max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-outfit text-white drop-shadow-2xl tracking-tight">
              {game.name}
            </h1>
            {developerNames && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded-md bg-orange-500/20 border border-orange-500/40 text-orange-300 shadow-sm">
                  Dev Studio
                </span>
                <span className="text-base sm:text-lg text-orange-400 font-semibold drop-shadow-md">
                  {developerNames}
                </span>
              </div>
            )}
          </div>

          {/* Right Side: Blur Box with Game Metadata */}
          <div className="w-full lg:w-[360px] bg-black/80 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
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
                <span className="text-muted-foreground flex items-center gap-2">
                  <Calendar size={15} className="text-orange-400" />
                  Release Date
                </span>
                <span className="font-medium text-white text-right">
                  {game.released ? new Date(game.released).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "TBA"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Building2 size={15} className="text-orange-400" />
                  Publisher
                </span>
                <span className="font-medium text-white text-right truncate max-w-[190px]" title={publisherNames}>
                  {publisherNames || "Independent"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Gamepad2 size={15} className="text-orange-400" />
                  Genres
                </span>
                <span className="font-medium text-white text-right truncate max-w-[190px]" title={genreNames}>
                  {genreNames || "General"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Star size={15} className="text-yellow-400" />
                  Rating
                </span>
                <span className="font-bold text-amber-400">
                  {game.rating ? `${game.rating} / 5` : "Unrated"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/10">
                <span className="text-muted-foreground flex items-center gap-2 font-medium">
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

      <div className="container mt-8">
        <AdCarousel />
        
        <div className="space-y-10 mt-8 max-w-5xl mx-auto">
          {/* About Section */}
          <div className="p-6 bg-[#0a0a0d]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl prose prose-invert max-w-none">
            <h3 className="text-2xl font-bold font-outfit mb-4 text-orange-400">About {game.name}</h3>
            <div dangerouslySetInnerHTML={{ __html: sanitizedDescription }}></div>
          </div>
          
          {/* Achievements Section */}
          <div>
            <h2 className="text-3xl font-bold font-outfit mb-6 text-white flex items-center gap-3">
              <span className="w-2.5 h-7 rounded-full bg-gradient-to-b from-orange-500 to-yellow-400 inline-block"></span>
              Achievements ({achievements.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.length > 0 ? (
                achievements.map((ach) => (
                  <div key={ach.id} className="flex gap-4 p-4 bg-[#0a0a0d]/90 backdrop-blur-xl border border-white/10 rounded-xl hover:border-orange-500/40 hover:bg-orange-500/5 transition-all group">
                    {ach.image ? (
                      <img src={ach.image} alt={ach.name} className="w-16 h-16 rounded-lg object-cover shadow-md group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10"></div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-white group-hover:text-amber-400 transition-colors">{ach.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ach.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground col-span-full">No achievements found for this game.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
