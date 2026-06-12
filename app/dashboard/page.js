"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SifuAvatar from "@/components/modules/SifuAvatar";
import XPBar from "@/components/modules/XPBar";
import ModuleCard from "@/components/modules/ModuleCard";
import ActiveWorkItem from "@/components/modules/ActiveWorkItem";

const MODULES = [
  {
    emoji: "🎯",
    title: "Hedef Planla",
    description: "Günlük hedefini belirle, AI ile mikro adımlara böl",
    href: "/modules/targets",
    color: "#8a2be2",
  },
  {
    emoji: "⚡",
    title: "Üretkenlik Sistemi Kur",
    description: "Kişisel haftalık takvim ve rutin oluştur",
    href: "/modules/productivity",
    color: "#6366f1",
  },
  {
    emoji: "🚀",
    title: "Startup Yol Haritası",
    description: "Fikrini MVP'ye dönüştür, pazar analizi yap",
    href: "/modules/startup",
    color: "#06b6d4",
  },
  {
    emoji: "⚖️",
    title: "Karar Analizi",
    description: "İkilemini analiz et, en iyi kararı ver",
    href: "/modules/decisions",
    color: "#f59e0b",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchDashboard();
  }, []);

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

  // Tüm aktif işleri düz diziye çevir
  const allItems = dashData
    ? [
        ...( dashData.activeItems?.targets || []),
        ...( dashData.activeItems?.startups || []),
        ...( dashData.activeItems?.decisions || []),
        ...( dashData.activeItems?.productivities || []),
      ]
    : [];

  const filteredItems =
    activeTab === "all"
      ? allItems
      : allItems.filter((i) => i.type === activeTab);

  const user = dashData?.user || { level: 1, xpProgress: 0, xpForNextLevel: 100, xpPercent: 0, name: "Kullanıcı" };
  const stats = dashData?.stats || {};

  return (
    <div className="dashboard-root">
      {/* ── HEADER ──────────────────────────────────── */}
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          {/* Logo */}
          <div className="dashboard-logo" onClick={() => router.push("/")}>
            <span className="dashboard-logo-icon">🧠</span>
            <div>
              <span className="dashboard-logo-main">LifeCoach AI</span>
              <span className="dashboard-logo-sub">HAN 4.2 Ultra Core</span>
            </div>
          </div>

          {/* Avatar + XP */}
          <div className="dashboard-user-area">
            <div className="dashboard-xp-area">
              <XPBar
                xp={user.xpProgress}
                level={user.level}
                xpForNextLevel={user.xpForNextLevel}
                animated
              />
            </div>
            <SifuAvatar size="md" glowing />
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ───────────────────────────── */}
      <main className="dashboard-main">

        {/* Hoşgeldin Mesajı */}
        <div className="dashboard-welcome animate-slide-up">
          <h1 className="dashboard-welcome-title">
            Merhaba, <span className="gradient-text">{user.name || "Kahraman"}</span> 👋
          </h1>
          <p className="dashboard-welcome-sub">
            Bugün hangi alana odaklanmak istiyorsun?
          </p>
        </div>

        {/* İstatistik Chip'leri */}
        <div className="dashboard-stats animate-fade-in">
          <div className="stat-chip">
            <span className="stat-chip-val">{stats.completedTargets || 0}</span>
            <span className="stat-chip-lbl">Tamamlanan Hedef</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-val">{stats.totalStartups || 0}</span>
            <span className="stat-chip-lbl">Startup Planı</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-val">{stats.totalDecisions || 0}</span>
            <span className="stat-chip-lbl">Karar Analizi</span>
          </div>
          <div className="stat-chip stat-chip-xp">
            <span className="stat-chip-val">Lvl {user.level}</span>
            <span className="stat-chip-lbl">Seviye</span>
          </div>
        </div>

        {/* ── 4 MODÜL KARTLARI (Grid) ─────────────── */}
        <section className="dashboard-modules">
          <h2 className="dashboard-section-title">🛸 Modüller</h2>
          <div className="module-grid">
            {MODULES.map((mod, i) => (
              <div key={mod.href} style={{ animationDelay: `${i * 0.08}s` }} className="animate-slide-up">
                <ModuleCard {...mod} />
              </div>
            ))}
          </div>
        </section>

        {/* ── AKTİF İŞLER LİSTESİ ────────────────── */}
        <section className="dashboard-active-works">
          <div className="dashboard-active-header">
            <h2 className="dashboard-section-title">📋 Aktif & Geçmiş İşlerim</h2>
            <div className="active-tabs">
              {[
                { key: "all", label: "Tümü" },
                { key: "target", label: "🎯 Hedefler" },
                { key: "startup", label: "🚀 Startup" },
                { key: "decision", label: "⚖️ Kararlar" },
                { key: "productivity", label: "⚡ Üretkenlik" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`active-tab ${activeTab === tab.key ? "active-tab-on" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="dashboard-loading">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-item" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="dashboard-empty">
              <div className="dashboard-empty-icon">🌱</div>
              <p className="dashboard-empty-title">Henüz kayıt yok</p>
              <p className="dashboard-empty-sub">Yukarıdaki modüllerden birini seçerek başla!</p>
            </div>
          ) : (
            <div className="active-works-list">
              {filteredItems.map((item, i) => (
                <div key={`${item.type}-${item.id}`} style={{ animationDelay: `${i * 0.06}s` }} className="animate-slide-up">
                  <ActiveWorkItem item={item} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── BOTTOM NAV (Mobil) ──────────────────── */}
      <nav className="dashboard-bottom-nav">
        {MODULES.map((mod) => (
          <button
            key={mod.href}
            className="bottom-nav-btn"
            onClick={() => router.push(mod.href)}
          >
            <span className="bottom-nav-icon">{mod.emoji}</span>
            <span className="bottom-nav-label">{mod.title.split(" ")[0]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
