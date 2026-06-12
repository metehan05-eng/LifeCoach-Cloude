"use client";
import { useRouter } from "next/navigation";
/**
 * ModuleCard – Dashboard 4 Ana Modül Kartı
 */
export default function ModuleCard({ emoji, title, description, href, color = "#8a2be2", disabled = false, onClick }) {
  const router = useRouter();

  const handleClick = (e) => {
    if (disabled) return;
    if (onClick) {
      onClick(e);
    } else {
      router.push(href);
    }
  };

  return (
    <button
      className="module-card"
      style={{ "--card-accent": color }}
      onClick={handleClick}
      disabled={disabled}
      aria-label={title}
    >
      {/* Glow overlay */}
      <div className="module-card-glow" />

      {/* Emoji */}
      <div className="module-card-emoji">{emoji}</div>

      {/* Content */}
      <div className="module-card-content">
        <h3 className="module-card-title">{title}</h3>
        <p className="module-card-desc">{description}</p>
      </div>

      {/* Arrow */}
      <div className="module-card-arrow">→</div>

      {/* Bottom neon border */}
      <div className="module-card-border" style={{ background: color }} />
    </button>
  );
}
