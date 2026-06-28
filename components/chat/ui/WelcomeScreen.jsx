"use client";
import { useState } from "react";
import ChatInput from "../ChatInput";
import { QUICK_ACTIONS } from "@/lib/quick-actions";
import { LCLogo } from "@/components/brand";
import DashboardList from "@/components/modules/DashboardList";
import ModuleHistorySection from "@/components/modules/ModuleHistorySection";
import TargetsView from "@/components/modules/TargetsView";
import ProductivityView from "@/components/modules/ProductivityView";
import StartupView from "@/components/modules/StartupView";
import DecisionsView from "@/components/modules/DecisionsView";

const CARD_ICONS = {
  goal_plan: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  productivity: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4" /><path d="M12 18v4" /><path d="M4.93 4.93l2.83 2.83" /><path d="M16.24 16.24l2.83 2.83" />
      <path d="M2 12h4" /><path d="M18 12h4" /><path d="M4.93 19.07l2.83-2.83" /><path d="M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  startup: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    </svg>
  ),
  decision: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" /><path d="M10 22h4" />
    </svg>
  ),
};

const CARD_COLORS = {
  goal_plan: { icon: "text-violet-600", bg: "bg-violet-500/10", border: "border-violet-500/20" },
  productivity: { icon: "text-blue-600", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  startup: { icon: "text-cyan-600", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  decision: { icon: "text-purple-600", bg: "bg-purple-500/10", border: "border-purple-500/20" },
};

const MODULE_MAP = {
  goal_plan: "targets",
  productivity: "productivity",
  startup: "startup",
  decision: "decisions",
};

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
    <div className="app-scroll flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-3 py-6 sm:gap-7 sm:px-4 sm:py-8 md:gap-8 md:px-6">
      <div className="animate-fade-in w-full max-w-2xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg sm:h-16 sm:w-16">
          <LCLogo variant="icon" size={isMobile ? 28 : 32} />
        </div>
        <h1
          className="mb-2 text-xl font-semibold tracking-tight sm:text-2xl md:text-[28px]"
          style={{ color: "var(--text-primary)" }}
        >
          Nasıl yardımcı olabilirim?
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed sm:text-[15px]" style={{ color: "var(--text-muted)" }}>
          Hedeflerine ulaşmana, kararlar vermene ve büyümene yardım etmek için buradayım.
        </p>
      </div>

      <div className="animate-slide-up w-full max-w-2xl" style={{ animationDelay: "0.08s" }}>
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

      <div className="grid w-full max-w-2xl grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-4">
        {QUICK_ACTIONS.map((card, i) => {
          const colors = CARD_COLORS[card.id];
          return (
            <button
              key={card.id}
              type="button"
               onClick={() => {
                  const moduleId = MODULE_MAP[card.id];
                  if (moduleId) setActiveModule(moduleId);
                  else onQuickAction?.(card.id);
                }}
              disabled={isLoading}
              className="animate-slide-up group flex min-h-[76px] flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[84px] sm:gap-2.5 sm:p-3.5"
              style={{
                borderColor: "var(--border-subtle)",
                background: "var(--bg-card)",
                animationDelay: `${0.12 + i * 0.06}s`,
              }}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border sm:h-9 sm:w-9 ${colors.bg} ${colors.border} ${colors.icon}`}>
                {CARD_ICONS[card.id]}
              </span>
              <span
                className="text-xs font-medium leading-snug sm:text-[13px]"
                style={{ color: "var(--text-primary)" }}
              >
                {card.label}
              </span>
            </button>
          );
        })}
      </div>

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
  );
}
