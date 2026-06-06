"use client";

import { useEffect, useState } from "react";
import styles from "./LoadingScreen.module.css";

function LightningIcon() {
  return (
    <svg
      className={styles.lightning}
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LoadingScreen({ isLoading = true }) {
  const [visible, setVisible] = useState(isLoading);
  const [mounted, setMounted] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
      return;
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 500);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (!mounted) return null;

  return (
    <div
      className={`${styles.overlay} ${visible ? styles.overlayVisible : styles.overlayHidden}`}
      role="status"
      aria-live="polite"
      aria-label="Yükleniyor"
    >
      <div className={styles.nebulaWrap} aria-hidden="true">
        <div className={styles.nebula} />
        <div className={styles.nebulaInner} />
      </div>

      <div className={styles.center}>
        <LightningIcon />
        <div className={styles.lcLetters}>
          <span>L</span>
          <span>C</span>
        </div>
        <span className={styles.subtitle}>LifeCoach AI</span>
        <div className={styles.dots} aria-hidden="true">
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
      </div>
    </div>
  );
}
