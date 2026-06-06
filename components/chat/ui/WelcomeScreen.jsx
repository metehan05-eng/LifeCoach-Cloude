"use client";

import ChatInput from "../ChatInput";

const QUICK_ACTIONS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
      </svg>
    ),
    label: "Hedef Planla",
    prompt: "Hedef Planla",
    accent: "text-han-purple border-han-purple/30 bg-han-purple/10",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4" /><path d="M12 18v4" /><path d="M4.93 4.93l2.83 2.83" /><path d="M16.24 16.24l2.83 2.83" />
        <path d="M2 12h4" /><path d="M18 12h4" /><path d="M4.93 19.07l2.83-2.83" /><path d="M16.24 7.76l2.83-2.83" />
      </svg>
    ),
    label: "Üretkenlik Sistemi Kur",
    prompt: "Üretkenlik Sistemi Kur",
    accent: "text-han-blue border-han-blue/30 bg-han-blue/10",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    ),
    label: "Startup Yol Haritası",
    prompt: "Startup Yol Haritası",
    accent: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" /><path d="M10 22h4" />
      </svg>
    ),
    label: "Karar Analizi",
    prompt: "Karar Analizi",
    accent: "text-han-purple-light border-han-purple-light/30 bg-han-purple-light/10",
  },
];

function HanLogo({ size = "lg" }) {
  const dim = size === "lg" ? "h-20 w-20" : "h-16 w-16";
  const icon = size === "lg" ? 36 : 28;

  return (
    <div
      className={`${dim} mx-auto mb-5 flex animate-float items-center justify-center rounded-3xl bg-gradient-to-br from-han-purple via-han-indigo to-violet-500 shadow-glow`}
    >
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    </div>
  );
}

export default function WelcomeScreen({
  isMobile,
  inputValue,
  onInputChange,
  onSend,
  isLoading,
  onQuickAction,
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-4 py-8 md:gap-10 md:px-6 md:py-10">
      {/* Greeting */}
      <div className="animate-fade-in text-center">
        <HanLogo size={isMobile ? "md" : "lg"} />
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

      {/* Prompt Input — centered above cards (ChatGPT/Gemini style) */}
      <div className="animate-slide-up w-full max-w-2xl" style={{ animationDelay: "0.1s" }}>
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSend={onSend}
          isLoading={isLoading}
          centered
          isMobile={isMobile}
          minimal
        />
        <p className="mt-2 text-center text-[10px] text-white/20">
          Kişisel verilerini paylaşmaktan kaçın. HAN AI hata yapabilir.
        </p>
      </div>

      {/* Quick Action Cards — 4-column symmetric grid */}
      <div className="grid w-full max-w-3xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-3">
        {QUICK_ACTIONS.map((card, i) => (
          <button
            key={card.label}
            type="button"
            onClick={() => onQuickAction(card.prompt)}
            className="animate-slide-up group flex flex-col items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-han-purple/25 hover:bg-white/[0.05] hover:shadow-[0_8px_32px_rgba(124,58,237,0.12)] md:p-5"
            style={{ animationDelay: `${0.15 + i * 0.07}s` }}
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${card.accent}`}>
              {card.icon}
            </span>
            <span className="text-[13px] font-semibold leading-snug text-han-text group-hover:text-white md:text-sm">
              {card.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
