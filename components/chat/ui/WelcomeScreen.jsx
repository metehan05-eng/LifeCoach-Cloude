"use client";
import { useState, useEffect } from "react";
import ChatInput from "../ChatInput";
import { QUICK_ACTIONS } from "@/lib/quick-actions";
import DashboardList from "@/components/modules/DashboardList";
import ModuleHistorySection from "@/components/modules/ModuleHistorySection";
import TargetsView from "@/components/modules/TargetsView";
import ProductivityView from "@/components/modules/ProductivityView";
import StartupView from "@/components/modules/StartupView";
import DecisionsView from "@/components/modules/DecisionsView";

// Pill buton ikon tanımları
const PILL_ICONS = {
  goal_plan: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  productivity: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4" /><path d="M12 18v4" /><path d="M4.93 4.93l2.83 2.83" /><path d="M16.24 16.24l2.83 2.83" />
      <path d="M2 12h4" /><path d="M18 12h4" /><path d="M4.93 19.07l2.83-2.83" /><path d="M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  startup: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    </svg>
  ),
  decision: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" /><path d="M10 22h4" />
    </svg>
  ),
};

const MODULE_MAP = {
  goal_plan: "targets",
  productivity: "productivity",
  startup: "startup",
  decision: "decisions",
};

// Günün saatine göre selamlama
function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "Gece yarısı yoğunluğu";
  if (h < 12) return "Günaydın";
  if (h < 17) return "İyi öğleden sonralar";
  if (h < 21) return "İyi akşamlar";
  return "İyi geceler";
}

export default function WelcomeScreen({
  isMobile,
  inputValue,
  onInputChange,
  onSend,
  isLoading,
  onVoiceToggle,
  isRecording,
  interimText,
  onQuickAction,
  onSelectView,
  userEmail,
}) {
  const [activeModule, setActiveModule] = useState(null);
  const [userName, setUserName] = useState("");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    setGreeting(getGreeting());
    // Kullanıcı adını API'den al
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => { if (d?.name) setUserName(d.name.split(" ")[0]); })
      .catch(() => {});
  }, []);

  const handleModuleClose = (view, sessionId, recordId) => {
    setActiveModule(null);
    if (view !== "chat" || sessionId) {
      onSelectView(view, sessionId, recordId);
    }
  };

  if (activeModule === "targets") {
    return <TargetsView onSelectView={handleModuleClose} userEmail={userEmail} />;
  }
  if (activeModule === "productivity") {
    return <ProductivityView onSelectView={handleModuleClose} userEmail={userEmail} />;
  }
  if (activeModule === "startup") {
    return <StartupView onSelectView={handleModuleClose} userEmail={userEmail} />;
  }
  if (activeModule === "decisions") {
    return <DecisionsView onSelectView={handleModuleClose} userEmail={userEmail} />;
  }

  return (
    <div className="app-scroll vip-aurora-bg flex flex-1 flex-col overflow-y-auto">
      {/* ── Ortalanmış Ana Alan (Star-Quality VIP Welcome) ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 md:px-6">

        {/* VIP Status Badge */}
        <div className="animate-fade-in mb-4 flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3.5 py-1 backdrop-blur-xl">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-[11px] font-bold tracking-wide text-violet-300">
            HAN AI 4.2 Ultra Core • Mentörün Hazır
          </span>
        </div>

        {/* Karşılama Metni */}
        <div className="animate-fade-in mb-8 text-center">
          <h1 className="mb-2 text-[28px] font-extrabold tracking-tight sm:text-[34px] md:text-[38px]">
            <span
              className="welcome-gradient-text"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #a78bfa, #6366f1, #38bdf8)",
                backgroundSize: "200% 200%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              ✦ {greeting}{userName ? `, ${userName}` : ""}
            </span>
          </h1>
          <p
            className="text-sm font-semibold tracking-wide md:text-[16px]"
            style={{ color: "var(--text-muted)" }}
          >
            Bugün birlikte nasıl bir başarı hikayesi yazıyoruz?
          </p>
        </div>

        {/* Input Kutusu */}
        <div
          className="animate-slide-up w-full"
          style={{ maxWidth: "660px", animationDelay: "0.08s" }}
        >
          <ChatInput
            value={inputValue}
            onChange={onInputChange}
            onSend={onSend}
            isLoading={isLoading}
            centered
            isMobile={isMobile}
            minimal
            onVoiceToggle={onVoiceToggle}
            isRecording={isRecording}
            interimText={interimText}
            voiceMode="stt"
          />
        </div>

        {/* ── Pill Aksiyon Butonları (Claude Alt Butonları) ── */}
        <div
          className="animate-slide-up mt-5 flex flex-wrap items-center justify-center gap-2.5"
          style={{ animationDelay: "0.15s" }}
        >
          {QUICK_ACTIONS.map((card, i) => (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                const moduleId = MODULE_MAP[card.id];
                if (moduleId) setActiveModule(moduleId);
                else onQuickAction?.(card.id);
              }}
              disabled={isLoading}
              className="lc-pill-btn interactive-press"
              style={{ animationDelay: `${0.18 + i * 0.05}s` }}
            >
              <span className="lc-pill-icon">
                {PILL_ICONS[card.id]}
              </span>
              {card.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Alt Bölüm: Geçmiş & Özet ── */}
      <div className="w-full px-4 pb-6 md:px-6">
        <DashboardList
          onSelectView={(view, sessionId, recordId) => {
            if (view === "chat") {
              onSelectView(view, sessionId, recordId);
            } else {
              const moduleId =
                view === "target"
                  ? "targets"
                  : view === "startup"
                    ? "startup"
                    : view === "decision"
                      ? "decisions"
                      : view === "productivity"
                        ? "productivity"
                        : view;
              setActiveModule(moduleId);
            }
          }}
        />
        <ModuleHistorySection
          onSelectView={(view) => {
            setActiveModule(view);
          }}
        />
      </div>
    </div>
  );
}
