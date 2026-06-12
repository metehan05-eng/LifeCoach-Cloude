"use client";
import { useRouter } from "next/navigation";
/**
 * ActiveWorkItem – Aktif İş Listesi Elemanı
 * Devam Eden / Detayları Gör / Revize Et butonlarıyla
 */

const typeConfig = {
  target: { icon: "🎯", label: "Devam Eden Hedef", color: "#8a2be2", action: "Devam Et", route: "/modules/targets" },
  productivity: { icon: "⚡", label: "Üretkenlik Sistemi", color: "#6366f1", action: "Detayları Gör", route: "/modules/productivity" },
  startup: { icon: "🚀", label: "Startup Yol Haritası", color: "#06b6d4", action: "Detayları Gör", route: "/modules/startup" },
  decision: { icon: "⚖️", label: "Karar Analizi", color: "#f59e0b", action: "Revize Et", route: "/modules/decisions" },
};

export default function ActiveWorkItem({ item, onSelectView }) {
  const router = useRouter();
  const cfg = typeConfig[item.type] || typeConfig.target;

  const handleAction = () => {
    if (onSelectView) {
      onSelectView(item.type, item.chatHistory?.sessionId || item.sessionId || null, item.id);
    } else {
      const url = item.sessionId
        ? `${cfg.route}?session=${item.sessionId}&id=${item.id}`
        : cfg.route;
      router.push(url);
    }
  };

  return (
    <div className="active-work-item" style={{ "--item-accent": cfg.color }}>
      {/* Left: icon + info */}
      <div className="active-work-left">
        <div className="active-work-icon" style={{ background: `${cfg.color}22`, border: `1px solid ${cfg.color}44` }}>
          {cfg.icon}
        </div>
        <div className="active-work-info">
          <span className="active-work-type">{cfg.label}</span>
          <span className="active-work-title">{item.title}</span>
          <span className="active-work-subtitle">{item.subtitle}</span>
          {item.progress !== undefined && (
            <div className="active-work-progress-track">
              <div
                className="active-work-progress-fill"
                style={{ width: `${item.progress}%`, background: cfg.color }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right: badge + button */}
      <div className="active-work-right">
        {item.daysLeft !== undefined && item.daysLeft > 0 && (
          <span className="active-work-days">
            {item.daysLeft}g kaldı
          </span>
        )}
        <button
          className="active-work-btn"
          style={{ "--btn-color": cfg.color }}
          onClick={handleAction}
        >
          {cfg.action}
        </button>
      </div>
    </div>
  );
}
