import React from "react";
import SearchBar from "@/components/SearchBar";
import AdCarousel from "@/components/AdCarousel";
import AdCard from "@/components/AdCard";
import RecentlyVisitedSection from "@/components/history/RecentlyVisitedSection";
import { getRecentGames } from "@/lib/api";

export default async function Home() {
  const recentGames = await getRecentGames();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-16 px-4 bg-black">
      <div className="text-center space-y-6 max-w-4xl mx-auto w-full">
        <h1 className="text-5xl md:text-7xl font-bold font-outfit text-white tracking-tight">
          Unlock Every <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 drop-shadow-md">Achievement</span>
        </h1>
        <p className="text-xl md:text-2xl text-zinc-300 font-medium">
          Track, sync and complete 100% of your games.
        </p>
        
        <div className="w-full pt-8 pb-12">
          <SearchBar />
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto space-y-16 mt-8">
        <AdCarousel />

        {/* Two Featured Ad Space Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <AdCard slotIndex={1} title="Sponsored Ad Space" />
          <AdCard slotIndex={2} title="Featured Partner Space" />
        </div>
        
        {/* Recently Visited Section */}
        <RecentlyVisitedSection fallbackGames={recentGames} />
      </div>
    </div>
  );
}
