"use client";
/**
 * XPBar – Animasyonlu XP İlerleme Çubuğu
 * Parlayan mor neon efektli, level bilgisiyle birlikte gösterilir
 */
export default function XPBar({ xp = 0, level = 1, xpForNextLevel = 100, animated = true }) {
  const percent = Math.min(100, Math.round((xp / xpForNextLevel) * 100));

  return (
    <div className="xp-bar-container">
      <div className="xp-bar-header">
        <span className="xp-level-badge">
          <span className="xp-level-icon">⚡</span>
          Lvl {level}
        </span>
        <span className="xp-count">
          {xp} <span className="xp-separator">/</span> {xpForNextLevel} XP
        </span>
      </div>
      <div className="xp-track" role="progressbar" aria-valuenow={xp} aria-valuemin={0} aria-valuemax={xpForNextLevel}>
        <div
          className={`xp-fill ${animated ? "xp-fill-animated" : ""}`}
          style={{ width: `${percent}%` }}
        >
          <div className="xp-shine" />
        </div>
        {/* Milestone dots */}
        {[25, 50, 75].map((mark) => (
          <div
            key={mark}
            className={`xp-milestone ${percent >= mark ? "xp-milestone-reached" : ""}`}
            style={{ left: `${mark}%` }}
          />
        ))}
      </div>
    </div>
  );
}
