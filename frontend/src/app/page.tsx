import React from 'react';
import SearchBar from '@/components/SearchBar';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.heroSection}>
      <h1 className={styles.heroTitle}>
        Unlock Every <span className="gradient-text">Achievement</span>
      </h1>
      <p className={styles.heroSubtitle}>
        The ultimate mobile-first platform to track, sync, and complete 100% of your games.
      </p>
      
      <div className={styles.searchContainer}>
        <SearchBar />
      </div>

      <div className={styles.features}>
        <div className={`glass-panel ${styles.featureCard}`}>
          <h3>Sync Profile</h3>
          <p>Link your Steam or Xbox account to dynamically filter guides based on what you have left.</p>
        </div>
        <div className={`glass-panel ${styles.featureCard}`}>
          <h3>Step-by-step</h3>
          <p>Guaranteed 100% completion routes crafted by experts so you never miss a collectible.</p>
        </div>
        <div className={`glass-panel ${styles.featureCard}`}>
          <h3>Mobile First</h3>
          <p>Designed to be used on your phone while you game on your TV or monitor.</p>
        </div>
      </div>
    </div>
  );
}
