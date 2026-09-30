"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getRecentlyVisited, clearRecentlyVisited, formatRelativeTime } from "@/utils/recentHistory";
import { RecentlyVisitedPage } from "@/types/history";
import { Game } from "@/types/game";
import { Clock, History, Trash2, ChevronRight, Gamepad2, Star, Sparkles } from "lucide-react";

interface RecentlyVisitedSectionProps {
  fallbackGames?: Game[];
}

export default function RecentlyVisitedSection({ fallbackGames = [] }: RecentlyVisitedSectionProps) {
  const [visitedPages, setVisitedPages] = useState<RecentlyVisitedPage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadHistory = () => {
      setVisitedPages(getRecentlyVisited());
      setIsLoaded(true);
    };

    loadHistory();

    const handleUpdate = () => {
      setVisitedPages(getRecentlyVisited());
    };

    window.addEventListener("100pg_recently_visited_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("100pg_recently_visited_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const handleClearHistory = () => {
    clearRecentlyVisited();
  };

  if (!isLoaded) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-64 bg-zinc-900 rounded-lg"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-zinc-950 rounded-2xl border border-zinc-900"></div>
          ))}
        </div>
      </div>
    );
  }

  const hasHistory = visitedPages.length > 0;

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-7 rounded-full bg-gradient-to-b from-orange-500 to-yellow-400 inline-block shadow-[0_0_12px_rgba(249,115,22,0.8)]"></span>
          <h2 className="text-3xl font-bold font-outfit text-white tracking-tight">
            Recently Visited
          </h2>
          {hasHistory && (
            <span className="text-xs font-mono font-medium text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 rounded-full">
              {visitedPages.length} {visitedPages.length === 1 ? "page" : "pages"}
            </span>
          )}
        </div>

        {hasHistory && (
          <button
            onClick={handleClearHistory}
            className="text-xs font-semibold text-zinc-400 hover:text-red-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-900 hover:border-red-500/40 hover:bg-red-500/10 transition-all cursor-pointer"
            title="Clear all recently visited history"
          >
            <Trash2 size={13} />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {hasHistory ? (
        /* Recently Visited Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visitedPages.map((page) => (
            <Link
              href={page.url}
              key={`${page.id}-${page.visitedAt}`}
              className="group flex flex-col bg-black border border-zinc-900 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:border-orange-500/50 hover:shadow-orange-500/10 transition-all duration-300 hover:-translate-y-1 relative"
            >
              {/* Thumbnail Container */}
              <div className="relative w-full h-48 overflow-hidden bg-zinc-950">
                {page.background_image ? (
                  <div
                    className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${page.background_image})` }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                    <Gamepad2 size={40} className="text-zinc-800" />
                  </div>
                )}
                {/* Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

                {/* Relative Visit Timestamp Badge */}
                <div className="absolute top-3 right-3 z-10">
                  <span className="text-[11px] font-medium bg-black/80 backdrop-blur-md text-orange-300 border border-orange-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md">
                    <Clock size={11} className="text-orange-400" />
                    <span>{formatRelativeTime(page.visitedAt)}</span>
                  </span>
                </div>

                {/* Rating Badge if available */}
                {page.rating ? (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="text-[11px] font-bold bg-black/80 backdrop-blur-md text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-md">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span>{page.rating}</span>
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Card Body */}
              <div className="p-5 flex flex-col justify-between flex-1 relative z-10 bg-black border-t border-zinc-900">
                <div>
                  <h3 className="font-outfit font-semibold text-lg text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                    {page.name}
                  </h3>
                  {page.subtitle ? (
                    <p className="text-xs text-orange-400/90 font-medium mt-1.5 line-clamp-1 flex items-center gap-1">
                      <Sparkles size={11} />
                      <span>{page.subtitle}</span>
                    </p>
                  ) : page.released ? (
                    <p className="text-xs text-zinc-500 mt-1.5">
                      Released: {page.released}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-900/80 flex items-center justify-between text-xs text-zinc-400 group-hover:text-orange-400 transition-colors">
                  <span className="font-medium">Continue Roadmap</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Empty State with Discovery Recommendations */
        <div className="space-y-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-zinc-950/70 border border-zinc-900/90 text-center flex flex-col items-center justify-center gap-3 relative overflow-hidden shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-500/10">
              <History size={26} />
            </div>
            <h3 className="text-xl font-bold text-white font-outfit mt-1">
              No Recently Visited Pages Yet
            </h3>
            <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
              Games and 100% checklists you visit will be saved here so you can quickly resume your achievement roadmaps.
            </p>
          </div>

          {fallbackGames.length > 0 && (
            <div className="space-y-4 pt-2">
              <h3 className="text-lg font-semibold text-zinc-300 font-outfit flex items-center gap-2">
                <Gamepad2 size={18} className="text-orange-400" />
                <span>Popular Games to Explore</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {fallbackGames.map((game) => (
                  <Link
                    href={`/game/${game.id}`}
                    key={game.id}
                    className="group flex flex-col bg-black border border-zinc-900 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:border-orange-500/50 hover:shadow-orange-500/10 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="relative w-full h-48 overflow-hidden bg-zinc-950">
                      {game.background_image ? (
                        <div
                          className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                          style={{ backgroundImage: `url(${game.background_image})` }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-950 border-b border-zinc-900 group-hover:bg-zinc-900 transition-colors">
                          <Gamepad2 size={40} className="text-zinc-800 group-hover:text-orange-500/60 transition-colors" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
                    </div>
                    <div className="p-5 flex flex-col justify-between flex-1 relative z-10 bg-black border-t border-zinc-900">
                      <h4 className="font-outfit font-semibold text-lg text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                        {game.name}
                      </h4>
                      <p className="text-sm text-zinc-400 mt-2">Released: {game.released}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
