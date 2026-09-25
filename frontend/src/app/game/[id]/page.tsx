import React from 'react';
import AdBanner from '@/components/AdBanner';
import styles from './game.module.css';

async function getGameDetails(id: string) {
  const RAWG_API_KEY = process.env.RAWG_API_KEY;
  if (!RAWG_API_KEY) return null;
  const res = await fetch(`https://api.rawg.io/api/games/${id}?key=${RAWG_API_KEY}`, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  return res.json();
}

async function getGameAchievements(id: string) {
  const RAWG_API_KEY = process.env.RAWG_API_KEY;
  if (!RAWG_API_KEY) return null;
  const res = await fetch(`https://api.rawg.io/api/games/${id}/achievements?key=${RAWG_API_KEY}`, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  return res.json();
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGameDetails(id);
  const achievementsData = await getGameAchievements(id);
  const achievements = achievementsData?.results || [];

  if (!game) {
    return <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>Game not found.</div>;
  }

  return (
    <div className={styles.gamePage}>
      <div className={styles.heroBanner} style={{ backgroundImage: `url(${game.background_image})` }}>
        <div className={styles.heroOverlay}></div>
        <div className={`container ${styles.heroContent}`}>
          <h1 className={styles.gameTitle}>{game.name}</h1>
          <p className={styles.gameMeta}>Released: {game.released}</p>
        </div>
      </div>

      <div className="container">
        <AdBanner position="inline" />
        
        <div className={styles.contentGrid}>
          <div className={styles.mainContent}>
            <div className={`glass-panel ${styles.descriptionBox}`}>
              <h3>About {game.name}</h3>
              <div dangerouslySetInnerHTML={{ __html: game.description }}></div>
            </div>
            
            <h2 className={styles.sectionTitle}>Achievements ({achievements.length})</h2>
            <div className={styles.achievementsList}>
              {achievements.length > 0 ? (
                achievements.map((ach: any) => (
                  <div key={ach.id} className={`glass-panel ${styles.achievementCard}`}>
                    <img src={ach.image} alt={ach.name} className={styles.achImage} />
                    <div className={styles.achInfo}>
                      <h4>{ach.name}</h4>
                      <p>{ach.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No achievements found for this game.</p>
              )}
            </div>
          </div>
          
          <div className={styles.sidebar}>
            <div className={`glass-panel ${styles.sidebarWidget}`}>
              <h3>Game Stats</h3>
              <div className={styles.statRow}>
                <span>Rating</span>
                <span>{game.rating} / 5</span>
              </div>
              <div className={styles.statRow}>
                <span>Playtime</span>
                <span>~{game.playtime} hours</span>
              </div>
            </div>
            
            <div style={{ marginTop: '24px' }}>
               <AdBanner position="inline" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
