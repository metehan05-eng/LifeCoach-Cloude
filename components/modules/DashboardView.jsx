"use client";
import { useState, useEffect } from "react";
import SifuAvatar from "./SifuAvatar";
import XPBar from "./XPBar";
import ModuleCard from "./ModuleCard";
import ActiveWorkItem from "./ActiveWorkItem";

const MODULES = [
  {
    id: "targets",
    emoji: "🎯",
    title: "Hedef Planla",
    description: "Günlük hedefini belirle, AI ile mikro adımlara böl",
    color: "#8a2be2",
  },
  {
    id: "productivity",
    emoji: "⚡",
    title: "Üretkenlik Sistemi Kur",
    description: "Kişisel haftalık takvim ve rutin oluştur",
    color: "#6366f1",
  },
  {
    id: "startup",
    emoji: "🚀",
    title: "Startup Yol Haritası",
    description: "Fikrini MVP'ye dönüştür, pazar analizi yap",
    color: "#06b6d4",
  },
  {
    id: "decisions",
    emoji: "⚖️",
    title: "Karar Analizi",
    description: "İkilemini analiz et, en iyi kararı ver",
    color: "#f59e0b",
  },
];

export default function DashboardView({ onSelectView, userEmail }) {
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchDashboard();
  }, [userEmail]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/modules/dashboard");
      if (res.ok) {
        const data = await res.json();
        setDashData(data);
      }
    } catch (err) {
      console.error("Dashboard verisi alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  const allItems = dashData
    ? [
        ...(dashData.activeItems?.targets || []),
        ...(dashData.activeItems?.startups || []),
        ...(dashData.activeItems?.decisions || []),
        ...(dashData.activeItems?.productivities || []),
      ]
    : [];

  const filteredItems =
    activeTab === "all"
      ? allItems
      : allItems.filter((i) => i.type === activeTab);

  const user = dashData?.user || { level: 1, xpProgress: 0, xpForNextLevel: 100, xpPercent: 0, name: "Kahraman" };
  const stats = dashData?.stats || {};

  return (
    <div className="dashboard-view-container flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
      {/* ── HEADER (Welcome + Stats) ───────────────────────────── */}
      <div className="dashboard-welcome-section flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-han-purple/[0.06] pb-6">
        <div className="animate-slide-up">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Merhaba, <span className="gradient-text font-extrabold">{user.name || "Kahraman"}</span> 👋
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Bugün hangi alana odaklanmak istiyorsun? Kendini geliştirmeye hazır mısın?
          </p>
        </div>

        {/* User Stats / XP */}
        <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 backdrop-blur-xl animate-fade-in md:min-w-[280px]">
          <SifuAvatar size="md" glowing />
          <div className="flex-1 min-w-0">
            <XPBar
              xp={user.xpProgress}
              level={user.level}
              xpForNextLevel={user.xpForNextLevel}
              animated
            />
          </div>
        </div>
      </div>

      {/* İstatistik Chip'leri */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 animate-fade-in">
        <div className="stat-chip bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-center">
          <span className="block text-2xl font-bold text-violet-400">{stats.completedTargets || 0}</span>
          <span className="text-xs text-white/40">Tamamlanan Hedef</span>
        </div>
        <div className="stat-chip bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-center">
          <span className="block text-2xl font-bold text-cyan-400">{stats.totalStartups || 0}</span>
          <span className="text-xs text-white/40">Startup Planı</span>
        </div>
        <div className="stat-chip bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-center">
          <span className="block text-2xl font-bold text-amber-400">{stats.totalDecisions || 0}</span>
          <span className="text-xs text-white/40">Karar Analizi</span>
        </div>
        <div className="stat-chip bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-center">
          <span className="block text-2xl font-bold text-emerald-400">Lvl {user.level}</span>
          <span className="text-xs text-white/40">Seviye</span>
        </div>
      </div>

      {/* ── 4 MODÜL KARTLARI (Grid) ─────────────── */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>🛸</span> Life OS Modülleri
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULES.map((mod, i) => (
            <div key={mod.id} style={{ animationDelay: `${i * 0.08}s` }} className="animate-slide-up">
              <ModuleCard
                emoji={mod.emoji}
                title={mod.title}
                description={mod.description}
                color={mod.color}
                onClick={() => onSelectView(mod.id)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── AKTİF İŞLER LİSTESİ ────────────────── */}
      <section className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📋</span> Aktif & Geçmiş İşlerim
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "all", label: "Tümü" },
              { key: "target", label: "🎯 Hedefler" },
              { key: "startup", label: "🚀 Startup" },
              { key: "decision", label: "⚖️ Kararlar" },
              { key: "productivity", label: "⚡ Üretkenlik" },
            ].map((tab) => (
              <button
                key={tab.key}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  activeTab === tab.key
                    ? "bg-han-purple/20 border-han-purple/40 text-violet-300"
                    : "bg-white/[0.02] border-transparent text-white/50 hover:bg-white/[0.04]"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 w-full rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/[0.01] border border-white/[0.04] rounded-2xl">
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-sm font-semibold text-white/70">Henüz aktif kayıt yok</p>
            <p className="text-xs text-white/40 mt-1">Yukarıdaki modüllerden birini seçerek başla!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item, i) => (
              <div key={`${item.type}-${item.id}`} style={{ animationDelay: `${i * 0.06}s` }} className="animate-slide-up">
                <ActiveWorkItem item={item} onSelectView={onSelectView} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
