"use client";
import { useState, useEffect } from "react";

const moduleConfig = [
  { key: "targets", icon: "🎯", label: "Hedefler", color: "#8a2be2", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  { key: "startups", icon: "🚀", label: "Startup Planları", color: "#06b6d4", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  { key: "decisions", icon: "⚖️", label: "Karar Analizleri", color: "#f59e0b", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { key: "productivities", icon: "⚡", label: "Üretkenlik Sistemleri", color: "#6366f1", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
];

export default function ModuleHistorySection({ onSelectView }) {
  const [records, setRecords] = useState({ targets: [], startups: [], decisions: [], productivities: [] });

  useEffect(() => {
    fetch("/api/modules/dashboard")
      .then((r) => r.json())
      .then((data) => {
        setRecords({
          targets: data.activeItems?.targets || [],
          startups: data.activeItems?.startups || [],
          decisions: data.activeItems?.decisions || [],
          productivities: data.activeItems?.productivities || [],
        });
      })
      .catch(() => {});
  }, []);

  const hasAny = Object.values(records).some((arr) => arr.length > 0);
  if (!hasAny) return null;

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
      <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Kullanılan Modüller</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {moduleConfig.map((mod) => {
          const items = records[mod.key];
          if (!items || items.length === 0) return null;

          return (
            <div
              key={mod.key}
              className={`rounded-xl ${mod.bg} ${mod.border} border p-3.5 backdrop-blur-xl hover:brightness-110 transition-all`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{mod.icon}</span>
                <span className="text-xs font-bold text-white/70">{mod.label}</span>
                <span className="ml-auto text-[10px] text-white/30">{items.length} kayıt</span>
              </div>
              <div className="space-y-1.5">
                {items.slice(0, 3).map((item) => (
                  <button
                    key={`${mod.key}-${item.id}`}
                    onClick={() => onSelectView(mod.key === "targets" ? "targets" : mod.key === "startups" ? "startup" : mod.key === "decisions" ? "decisions" : "productivity", item.sessionId, item.id)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-all text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-white/80 truncate">{item.title || item.ideaDescription || item.dilemma || "—"}</p>
                      <p className="text-[9px] text-white/40 truncate">
                        {item.type === "target"
                          ? `Kalan: ${item.daysLeft || 0} gün`
                          : item.type === "startup"
                          ? item.subtitle || ""
                          : item.subtitle || ""}
                      </p>
                    </div>
                    <span className="text-[10px] text-white/40 shrink-0">→</span>
                  </button>
                ))}
              </div>
              {items.length > 3 && (
                <p className="text-[10px] text-white/30 mt-1.5 text-center">+{items.length - 3} daha</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
