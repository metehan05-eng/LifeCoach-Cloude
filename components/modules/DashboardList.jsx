"use client";
import { useState, useEffect } from "react";

const typeConfig = {
  target: { icon: "🎯", color: "#8a2be2", actionLabel: "Devam Et", subtitlePrefix: "Kalan Süre" },
  startup: { icon: "🚀", color: "#06b6d4", actionLabel: "Detayları Gör", subtitlePrefix: "Aşama" },
  productivity: { icon: "⚡", color: "#6366f1", actionLabel: "Detayları Gör", subtitlePrefix: "Sistem" },
  decision: { icon: "⚖️", color: "#f59e0b", actionLabel: "Detayları Gör", subtitlePrefix: "Analiz" },
};

export default function DashboardList({ onSelectView }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/modules/dashboard")
      .then((r) => r.json())
      .then((data) => {
        const all = [
          ...(data.activeItems?.targets || []).map((t) => ({ ...t, type: "target" })),
          ...(data.activeItems?.startups || []).map((s) => ({ ...s, type: "startup" })),
          ...(data.activeItems?.decisions || []).map((d) => ({ ...d, type: "decision" })),
          ...(data.activeItems?.productivities || []).map((p) => ({ ...p, type: "productivity" })),
        ];
        setItems(all.filter((i) => i.status === "aktif"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAction = (item) => {
    if (onSelectView) {
      onSelectView(item.type === "target" ? "chat" : item.type, item.sessionId, item.id);
    }
  };

  if (loading) {
    return (
      <div className="w-full mt-6 space-y-2.5">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 animate-slide-up" style={{ animationDelay: "0.25s" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Geçmiş & Devam Eden İşler</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/40">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => {
          const cfg = typeConfig[item.type] || typeConfig.target;
          return (
            <div
              key={`${item.type}-${item.id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 transition-all group"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <span className="text-lg shrink-0">{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/90 truncate">{item.title}</p>
                <p className="text-[10px] text-white/40 mt-0.5">
                  {item.type === "target"
                    ? `(Kalan Süre: ${item.daysLeft || 0} Gün)`
                    : item.type === "startup"
                    ? `(Aşama: ${item.subtitle || "—"})`
                    : item.subtitle || ""}
                </p>
              </div>
              <button
                onClick={() => handleAction(item)}
                className="shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                style={{ "--btn-color": cfg.color }}
              >
                {cfg.actionLabel} →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
