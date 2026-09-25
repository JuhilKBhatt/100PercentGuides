import React from 'react';
import styles from './AdBanner.module.css';

interface AdBannerProps {
  position: 'top' | 'bottom' | 'inline';
}

export default function AdBanner({ position }: AdBannerProps) {
  return (
    <div className={`${styles.adContainer} ${styles[position]}`}>
      <div className={styles.adContent}>
        <span className={styles.adLabel}>Advertisement</span>
        <div className={styles.adPlaceholder}>
          <p>Premium Ad Space</p>
          <span>728 x 90</span>
        </div>
      </div>
    </div>
  );
}
