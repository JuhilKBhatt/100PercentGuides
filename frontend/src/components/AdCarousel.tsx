"use client";

import React, { useState, useEffect } from "react";
import AdBanner from "./AdBanner";
import styles from "./AdCarousel.module.css";

export default function AdCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.carouselContainer}>
      <div 
        className={styles.carouselTrack}
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        <div className={styles.slide}><AdBanner position="inline" /></div>
        <div className={styles.slide}><AdBanner position="inline" /></div>
        <div className={styles.slide}><AdBanner position="inline" /></div>
      </div>
      <div className={styles.dots}>
        {[0, 1, 2].map(idx => (
          <span 
            key={idx} 
            className={`${styles.dot} ${currentIndex === idx ? styles.active : ""}`}
            onClick={() => setCurrentIndex(idx)}
          />
        ))}
      </div>
    </div>
  );
}
