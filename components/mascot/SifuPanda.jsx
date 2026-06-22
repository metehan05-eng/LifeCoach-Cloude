"use client";

import styles from "./SifuPanda.module.css";

const STATE_CLASS = {
  idle: styles.idle,
  speaking: styles.speaking,
  happy: styles.happy,
  thoughtful: styles.thoughtful,
  listening: styles.listening,
};

export default function SifuPanda({
  emotion = "idle",
  size = 80,
  showBadge = true,
  isSpeaking = false,
  isListening = false,
}) {
  const resolvedEmotion = isListening ? "listening" : isSpeaking ? "speaking" : emotion;
  const stateClass = STATE_CLASS[resolvedEmotion] || styles.idle;
  const scale = size / 80;

  return (
    <div
      className={`${styles.wrapper} ${stateClass}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Sifu Panda — ${resolvedEmotion}`}
    >
      <div className={styles.glowRing} style={{ transform: `scale(${scale})` }} />
      <div className={styles.panda} style={{ transform: `scale(${scale})` }}>
        <div className={styles.body}>
          <div className={styles.belly} />
          <div className={`${styles.arm} ${styles.armLeft}`} />
          <div className={`${styles.arm} ${styles.armRight}`} />
          <div className={styles.head}>
            <div className={`${styles.ear} ${styles.earLeft}`} />
            <div className={`${styles.ear} ${styles.earRight}`} />
            <div className={`${styles.eyePatch} ${styles.eyePatchLeft}`} />
            <div className={`${styles.eyePatch} ${styles.eyePatchRight}`} />
            <div className={`${styles.eye} ${styles.eyeLeft}`}>
              <div className={styles.pupil} />
            </div>
            <div className={`${styles.eye} ${styles.eyeRight}`}>
              <div className={styles.pupil} />
            </div>
            <div className={styles.nose} />
            <div className={styles.mouth}>
              <div className={styles.mouthInner} />
            </div>
            <div className={styles.cheekLeft} />
            <div className={styles.cheekRight} />
          </div>
          {showBadge && <span className={styles.badge}>SIFU</span>}
        </div>
      </div>
    </div>
  );
}
