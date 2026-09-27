"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { searchGames } from "@/lib/api";
import { Game } from "@/types/game";
import { Input } from "@/components/ui/input";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
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

  return (
    <div className="relative w-full max-w-2xl mx-auto z-50" ref={searchRef}>
      <div className={`relative flex items-center transition-all duration-300 ${isOpen && query.length > 0 ? "scale-[1.02]" : ""}`}>
        <Search className="absolute left-4 text-orange-400/80" size={20} />
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
          className="w-full pl-12 pr-12 py-6 text-lg bg-[#0e0f14]/80 backdrop-blur-md border-white/10 rounded-2xl shadow-2xl focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 placeholder:text-muted-foreground/60 transition-all text-white"
          autoComplete="off"
          spellCheck="false"
        />
        {isLoading && <Loader2 className="absolute right-4 animate-spin text-orange-500" size={20} />}
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 w-full mt-4 bg-[#0a0a0e]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto custom-scrollbar">
          {results.length > 0 ? (
            <div className="flex flex-col p-2 space-y-1">
              {results.map((game) => (
                <Link 
                  href={`/game/${game.id}`} 
                  key={game.id} 
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-orange-500/10 hover:border hover:border-orange-500/20 transition-all group"
                  onClick={() => setIsOpen(false)}
                >
                  {game.background_image ? (
                    <img src={game.background_image} alt={game.name} className="w-16 h-16 object-cover rounded-lg shadow-md group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-16 h-16 bg-white/5 rounded-lg border border-white/10"></div>
                  )}
                  <div className="flex flex-col">
                    <h4 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors">{game.name}</h4>
                    <span className="text-sm text-muted-foreground">{game.released ? new Date(game.released).getFullYear() : "Unknown year"}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              {isLoading ? "Searching..." : "No games found."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
