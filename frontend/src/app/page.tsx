import React from "react";
import SearchBar from "@/components/SearchBar";
import AdCarousel from "@/components/AdCarousel";
import styles from "./page.module.css";
import Link from "next/link";
import { getRecentGames } from "@/lib/api";

export default async function Home() {
  const recentGames = await getRecentGames();

  return (
    <div className={styles.heroSection}>
      <h1 className={styles.heroTitle}>
        Unlock Every <span className="gradient-text">Achievement</span>
      </h1>
      <p className={styles.heroSubtitle}>
        Track, sync and complete 100% of your games.
      </p>
      
      <div className={styles.searchContainer}>
        <SearchBar />
      </div>

      <div className={styles.contentSection}>
        <AdCarousel />
        
        <h2 className={styles.sectionTitle}>Recently Released</h2>
        <div className={styles.gamesGrid}>
          {recentGames.map((game) => (
            <Link href={`/game/${game.id}`} key={game.id} className={`glass-panel ${styles.gameCard}`}>
              <div 
                className={styles.gameCardImage} 
                style={{ backgroundImage: `url(${game.background_image})` }} 
              />
              <div className={styles.gameCardContent}>
                <h3>{game.name}</h3>
                <p>Released: {game.released}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
