"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './SearchBar.module.css';
import { Search, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface GameResult {
  id: number;
  name: string;
  background_image: string;
  released: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GameResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchGames = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.results) {
          setResults(data.results.slice(0, 6)); // limit to 6
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchGames, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <div className={styles.searchWrapper} ref={searchRef}>
      <div className={`${styles.searchBox} ${isOpen && query.length > 0 ? styles.active : ''}`}>
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
          className={styles.searchInput}
        />
        {isLoading && <Loader2 className={styles.spinner} size={20} />}
      </div>

      {isOpen && query.length >= 2 && (
        <div className={`glass-panel ${styles.dropdown}`}>
          {results.length > 0 ? (
            <div className={styles.resultsList}>
              {results.map((game) => (
                <Link href={`/game/${game.id}`} key={game.id} className={styles.resultItem}>
                  {game.background_image ? (
                    <img src={game.background_image} alt={game.name} className={styles.resultImg} />
                  ) : (
                    <div className={styles.placeholderImg}></div>
                  )}
                  <div className={styles.resultInfo}>
                    <h4>{game.name}</h4>
                    <span>{game.released ? new Date(game.released).getFullYear() : 'Unknown year'}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.noResults}>
              {isLoading ? 'Searching...' : 'No games found.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
