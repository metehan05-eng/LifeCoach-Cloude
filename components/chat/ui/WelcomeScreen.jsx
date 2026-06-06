"use client";

import ChatInput from "../ChatInput";
import { QUICK_ACTIONS } from "@/lib/quick-actions";
import { LCLogo } from "@/components/brand";

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

const CARD_ACCENTS = {
  goal_plan: "text-han-purple border-han-purple/30 bg-han-purple/10",
  productivity: "text-han-blue border-han-blue/30 bg-han-blue/10",
  startup: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  decision: "text-han-purple-light border-han-purple-light/30 bg-han-purple-light/10",
};

export default function WelcomeScreen({
  isMobile,
  inputValue,
  onInputChange,
  onSend,
  isLoading,
  onQuickAction,
  onVoiceStart,
  onVoiceStop,
  isRecording,
  voiceEnabled,
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-6 sm:gap-8 sm:py-8 md:gap-10 md:px-6 md:py-10">
      <div className="animate-fade-in text-center">
        <div className="animate-float mx-auto drop-shadow-[0_0_48px_rgba(124,58,237,0.4)]">
          <LCLogo variant="chat" size={isMobile ? 64 : 80} />
        </div>
        <h1 className="font-display mb-2.5 text-2xl font-extrabold tracking-tight text-han-text md:text-3xl">
          Merhaba! Ben{" "}
          <span className="bg-gradient-to-r from-han-purple-light via-violet-300 to-han-indigo bg-clip-text text-transparent">
            HAN AI
          </span>
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-han-muted md:text-[15px]">
          Hedeflerine ulaşmana, kararlar vermene ve büyümana yardım etmek için buradayım.
        </p>
      </div>

      <div className="animate-slide-up w-full max-w-2xl" style={{ animationDelay: "0.1s" }}>
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSend={onSend}
          isLoading={isLoading}
          centered
          isMobile={isMobile}
          minimal
          onVoiceStart={onVoiceStart}
          onVoiceStop={onVoiceStop}
          isRecording={isRecording}
          voiceEnabled={voiceEnabled}
        />
        <p className="mt-2 text-center text-[10px] text-white/20">
          Kişisel verilerini paylaşmaktan kaçın. HAN AI hata yapabilir.
        </p>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
        {QUICK_ACTIONS.map((card, i) => (
          <button
            key={card.id}
            type="button"
            disabled={isLoading}
            onClick={() => onQuickAction(card.id)}
            className="animate-slide-up group flex min-h-[88px] flex-col items-start gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-left backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-han-purple/25 hover:bg-white/[0.05] hover:shadow-[0_8px_32px_rgba(124,58,237,0.12)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[96px] sm:gap-3 sm:p-4 md:p-5"
            style={{ animationDelay: `${0.15 + i * 0.07}s` }}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:h-10 sm:w-10 ${CARD_ACCENTS[card.id]}`}>
              {CARD_ICONS[card.id]}
            </span>
            <span className="text-xs font-semibold leading-snug text-han-text group-hover:text-white sm:text-[13px] md:text-sm">
              {card.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
