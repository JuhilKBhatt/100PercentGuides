"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, Gamepad2, ChevronRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { searchGames } from "@/lib/api";
import { Game } from "@/types/game";
import { Input } from "@/components/ui/input";

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [navigatingGame, setNavigatingGame] = useState<Game | null>(null);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const clientCacheRef = useRef<Map<string, Game[]>>(new Map());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setResults([]);
      setIsLoading(false);
      return;
    }

    const cached = clientCacheRef.current.get(trimmed.toLowerCase());
    if (cached) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setResults(cached);
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    const debounceTimer = setTimeout(async () => {
      try {
        const games = await searchGames(trimmed, controller.signal);
        clientCacheRef.current.set(trimmed.toLowerCase(), games);
        setResults(games);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Search error:", err);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [query]);

  const handleSelectGame = (game: Game, e: React.MouseEvent) => {
    e.preventDefault();
    setNavigatingGame(game);
    // Smoothly initiate Next.js App Router navigation while showing active animation
    router.push(`/game/${game.id}`);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto z-50" ref={searchRef}>
      {/* Top Laser Loading Bar on Item Click */}
      {navigatingGame && (
        <div className="fixed top-0 left-0 right-0 h-1.5 z-[999999] overflow-hidden bg-black/80 shadow-[0_0_20px_rgba(249,115,22,0.8)] pointer-events-none">
          <div className="h-full w-1/2 bg-gradient-to-r from-orange-600 via-amber-400 to-yellow-300 animate-laser" />
        </div>
      )}

      {/* Floating Bottom Navigation Toast on Item Click */}
      {navigatingGame && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[999999] pointer-events-none flex items-center gap-3.5 px-6 py-3.5 rounded-full bg-zinc-950/95 border border-orange-500/60 shadow-[0_12px_45px_rgba(249,115,22,0.45)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="relative flex items-center justify-center flex-shrink-0">
            <span className="w-3 h-3 rounded-full bg-orange-500 animate-ping absolute opacity-75" />
            <Loader2 className="w-5 h-5 text-orange-400 animate-spin relative" />
          </div>
          <div className="flex flex-col text-left pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white tracking-wide">
                Opening {navigatingGame.name}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="text-xs text-orange-300/80 font-medium">
              Loading 100% roadmap, achievements & guides...
            </span>
          </div>
        </div>
      )}

      {/* Main Search Input Container */}
      <div 
        className={`relative flex items-center transition-all duration-300 rounded-2xl ${
          isOpen && query.length > 0 ? "scale-[1.01]" : ""
        } ${
          isLoading ? "shadow-[0_0_30px_rgba(249,115,22,0.3)]" : ""
        }`}
      >
        <Search className={`absolute left-4 transition-colors duration-200 ${isLoading ? "text-orange-400 animate-pulse" : "text-orange-400"}`} size={20} />
        
        <Input 
          type="text" 
          placeholder="Search for a game to 100%..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full pl-12 pr-12 py-6 text-lg bg-black border rounded-2xl shadow-2xl transition-all text-white placeholder:text-zinc-500 focus-visible:ring-orange-500/50 focus-visible:border-orange-500 ${
            isLoading 
              ? "border-orange-500/70" 
              : "border-orange-500/30"
          }`}
          autoComplete="off"
          spellCheck="false"
        />

        {/* Animated Laser Progress Line inside Input while Typing/Loading */}
        {isLoading && (
          <div className="absolute bottom-0 left-6 right-6 h-[2px] overflow-hidden rounded-full bg-orange-500/20 pointer-events-none">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-orange-400 to-transparent animate-laser" />
          </div>
        )}

        {/* Right Loading Spinner or Gamepad Icon */}
        <div className="absolute right-4 flex items-center justify-center pointer-events-none">
          {isLoading ? (
            <div className="relative flex items-center justify-center">
              <span className="absolute w-6 h-6 rounded-full bg-orange-500/20 animate-ping" />
              <Loader2 className="animate-spin text-orange-400 relative" size={20} />
            </div>
          ) : (
            <Gamepad2 className="text-zinc-600/60" size={20} />
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 w-full mt-3 bg-black/95 backdrop-blur-2xl border border-orange-500/40 rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.95)] overflow-hidden max-h-[65vh] overflow-y-auto custom-scrollbar">
          
          {/* Header indicator when actively searching */}
          {isLoading && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-orange-500/20 bg-orange-950/20">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />
                <span className="text-xs font-semibold text-orange-300 uppercase tracking-wider">
                  Searching Game Database...
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">Live Search</span>
            </div>
          )}

          {/* Results List */}
          {results.length > 0 ? (
            <div className="flex flex-col p-2 space-y-1.5">
              {results.map((game) => {
                const isNavigatingThis = navigatingGame?.id === game.id;
                return (
                  <div
                    key={game.id}
                    onClick={(e) => handleSelectGame(game, e)}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer group relative ${
                      isNavigatingThis
                        ? "bg-orange-500/25 border border-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.4)] scale-[0.99]"
                        : navigatingGame
                        ? "opacity-40 hover:opacity-70"
                        : "hover:bg-orange-500/10 hover:border hover:border-orange-500/30 border border-transparent"
                    }`}
                  >
                    {/* Thumbnail with Loading Overlay */}
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-950 border border-zinc-900 shadow-md">
                      {game.background_image ? (
                        <img 
                          src={game.background_image} 
                          alt={game.name} 
                          className={`w-full h-full object-cover transition-transform duration-300 ${
                            isNavigatingThis ? "scale-110 brightness-50" : "group-hover:scale-105"
                          }`} 
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                          <Gamepad2 className="w-6 h-6 text-zinc-600" />
                        </div>
                      )}

                      {/* Active click spinner over thumbnail */}
                      {isNavigatingThis && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                          <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Game Details */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-lg font-semibold truncate transition-colors ${
                          isNavigatingThis 
                            ? "text-amber-300" 
                            : "text-white group-hover:text-amber-400"
                        }`}>
                          {game.name}
                        </h4>
                      </div>

                      {/* Status / Year */}
                      {isNavigatingThis ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/40 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                            Loading roadmap...
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-400">
                          {game.released ? new Date(game.released).getFullYear() : "Year Unknown"}
                        </span>
                      )}
                    </div>

                    {/* Chevron or Spinner */}
                    <div className="pr-2 text-zinc-500 group-hover:text-amber-400 transition-colors">
                      {isNavigatingThis ? (
                        <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                      ) : (
                        <ChevronRight className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : isLoading ? (
            /* Skeleton Loading State when results are initially loading */
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-950/40 border border-zinc-900/60">
                  <div className="w-16 h-16 rounded-lg animate-shimmer flex-shrink-0" />
                  <div className="flex flex-col flex-1 gap-2.5">
                    <div className="h-4 w-2/3 rounded-md animate-shimmer" />
                    <div className="h-3 w-1/4 rounded-md animate-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-400 flex flex-col items-center justify-center gap-2">
              <Gamepad2 className="w-8 h-8 text-zinc-600" />
              <p className="text-sm font-medium">No games found matching "{query}"</p>
              <span className="text-xs text-zinc-500">Try searching by title or franchise</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
