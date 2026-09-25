"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./SearchBar.module.css";
import { Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { Game, searchGames } from "@/lib/api";

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
    <div className={styles.searchWrapper} ref={searchRef}>
      <div className={`${styles.searchBox} ${isOpen && query.length > 0 ? styles.active : ""}`}>
        <Search className={styles.searchIcon} size={20} />
        <input 
          type="text" 
          placeholder="Search for a game to 100%..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={styles.searchInput}
          autoComplete="off"
          spellCheck="false"
        />
        {isLoading && <Loader2 className={styles.spinner} size={20} />}
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className={`glass-panel ${styles.dropdown}`}>
          {results.length > 0 ? (
            <div className={styles.resultsList}>
              {results.map((game) => (
                <Link 
                  href={`/game/${game.id}`} 
                  key={game.id} 
                  className={styles.resultItem}
                  onClick={() => setIsOpen(false)}
                >
                  {game.background_image ? (
                    <img src={game.background_image} alt={game.name} className={styles.resultImg} />
                  ) : (
                    <div className={styles.placeholderImg}></div>
                  )}
                  <div className={styles.resultInfo}>
                    <h4>{game.name}</h4>
                    <span>{game.released ? new Date(game.released).getFullYear() : "Unknown year"}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.noResults}>
              {isLoading ? "Searching..." : "No games found."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
