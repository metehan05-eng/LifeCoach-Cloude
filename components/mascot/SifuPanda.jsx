"use client";

import styles from "./SifuPanda.module.css";

const STATE_CLASS = {
  idle: styles.idle,
  speaking: styles.speaking,
  happy: styles.happy,
  thoughtful: styles.thoughtful,
};

export default function SifuPanda({ emotion = "idle", size = 80, showBadge = true }) {
  const stateClass = STATE_CLASS[emotion] || styles.idle;

  return (
    <div
      className={`${styles.panda} ${stateClass}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Sifu Panda — ${emotion}`}
    >
      <div className={styles.body} style={{ transform: `scale(${size / 80})` }}>
        <div className={styles.belly} />
        <div className={styles.arm + " " + styles.armLeft} />
        <div className={styles.arm + " " + styles.armRight} />
        <div className={styles.head}>
          <div className={`${styles.ear} ${styles.earLeft}`} />
          <div className={`${styles.ear} ${styles.earRight}`} />
          <div className={`${styles.eyePatch} ${styles.eyePatchLeft}`} />
          <div className={`${styles.eyePatch} ${styles.eyePatchRight}`} />
          <div className={`${styles.eye} ${styles.eyeLeft}`} />
          <div className={`${styles.eye} ${styles.eyeRight}`} />
          <div className={styles.nose} />
          <div className={styles.mouth} />
        </div>
        {showBadge && <span className={styles.badge}>SIFU</span>}
      </div>
    </div>
  );
}
