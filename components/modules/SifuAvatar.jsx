"use client";
/**
 * SifuAvatar – Sifu Panda Avatarı
 * Animasyonlu, yuvarlak çerçeveli panda avatar bileşeni
 */
export default function SifuAvatar({ size = "md", glowing = true, className = "" }) {
  const sizes = {
    sm: { outer: 40, inner: 36, font: "1.4rem" },
    md: { outer: 56, inner: 50, font: "2rem" },
    lg: { outer: 80, inner: 72, font: "2.8rem" },
    xl: { outer: 110, inner: 100, font: "4rem" },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div
      className={`sifu-avatar-wrapper ${glowing ? "sifu-glowing" : ""} ${className}`}
      style={{ width: s.outer, height: s.outer }}
    >
      <div className="sifu-avatar-ring" style={{ width: s.outer, height: s.outer }}>
        <div className="sifu-avatar-inner" style={{ width: s.inner, height: s.inner, fontSize: s.font }}>
          🐼
        </div>
      </div>
      {glowing && <div className="sifu-glow-pulse" />}
    </div>
  );
}
