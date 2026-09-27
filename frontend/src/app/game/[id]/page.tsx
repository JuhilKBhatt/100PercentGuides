import React from "react";
import AdCarousel from "@/components/AdCarousel";
import AdBanner from "@/components/AdBanner";
import { getGameDetails, getGameAchievements } from "@/lib/api";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGameDetails(id);
  const achievements = await getGameAchievements(id);

  if (!game) {
    return <div className="container mx-auto py-24 text-center">Game not found.</div>;
  }

  const developerNames = game.developers?.map((d) => d.name).join(", ");

  return (
    <div className="pb-16">
      <div 
        className="relative w-full h-[40vh] min-h-[300px] bg-cover bg-center" 
        style={{ backgroundImage: `url(${game.background_image})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background to-background/20 via-background/60"></div>
        <div className="container relative h-full flex flex-col justify-end pb-8">
          <h1 className="text-4xl md:text-5xl font-bold font-outfit text-white drop-shadow-lg">{game.name}</h1>
          {developerNames && (
            <p className="text-base md:text-lg text-orange-400 font-medium mt-1.5 drop-shadow-md flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-300">
                Developer
              </span>
              <span>{developerNames}</span>
            </p>
          )}
          <p className="text-sm text-amber-300/90 mt-1 drop-shadow-md font-medium">Released: {game.released}</p>
        </div>
      </div>

      <div className="container mt-8">
        <AdCarousel />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="p-6 bg-[#0e0f14]/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl prose prose-invert max-w-none">
              <h3 className="text-2xl font-bold font-outfit mb-4 text-orange-400">About {game.name}</h3>
              <div dangerouslySetInnerHTML={{ __html: game.description }}></div>
            </div>
            
            <h2 className="text-3xl font-bold font-outfit mb-6 text-white flex items-center gap-3">
              <span className="w-2.5 h-7 rounded-full bg-gradient-to-b from-orange-500 to-yellow-400 inline-block"></span>
              Achievements ({achievements.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.length > 0 ? (
                achievements.map((ach) => (
                  <div key={ach.id} className="flex gap-4 p-4 bg-[#0e0f14]/85 backdrop-blur-xl border border-white/10 rounded-xl hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group">
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
          
          <div className="space-y-6">
            <div className="p-6 bg-[#0e0f14]/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
              <h3 className="text-xl font-bold font-outfit mb-4 text-orange-400">Game Stats</h3>
              {developerNames && (
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-muted-foreground">Studio</span>
                  <span className="font-medium text-white text-right max-w-[60%]">{developerNames}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-b border-white/10">
                <span className="text-muted-foreground">Rating</span>
                <span className="font-bold text-amber-400">{game.rating} / 5</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-muted-foreground">Playtime</span>
                <span className="font-bold text-amber-400">~{game.playtime} hours</span>
              </div>
            </div>
            
            <div className="sticky top-24">
               <AdBanner position="inline" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
