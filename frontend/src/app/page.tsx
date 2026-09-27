import React from "react";
import SearchBar from "@/components/SearchBar";
import AdCarousel from "@/components/AdCarousel";
import Link from "next/link";
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
        
        <div className="space-y-8">
          <h2 className="text-3xl font-bold font-outfit text-white flex items-center gap-3">
            <span className="w-2.5 h-7 rounded-full bg-gradient-to-b from-orange-500 to-yellow-400 inline-block"></span>
            Recently Released
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentGames.map((game) => (
              <Link 
                href={`/game/${game.id}`} 
                key={game.id} 
                className="group flex flex-col bg-black border border-zinc-900 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:border-orange-500/50 hover:shadow-orange-500/10 transition-all duration-300 hover:-translate-y-1"
              >
                <div 
                  className="w-full h-48 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" 
                  style={{ backgroundImage: `url(${game.background_image})` }} 
                />
                <div className="p-5 flex flex-col justify-between flex-1 relative z-10 bg-black border-t border-zinc-900">
                  <h3 className="font-outfit font-semibold text-lg text-white group-hover:text-amber-400 transition-colors line-clamp-1">{game.name}</h3>
                  <p className="text-sm text-zinc-400 mt-2">Released: {game.released}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
