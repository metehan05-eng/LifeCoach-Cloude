"use client";

import { useEffect, useRef } from "react";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import SifuPanda from "./SifuPanda";

export default function SifuPandaVoiceAgent({ onBack, isMobile, onEmotionChange }) {
  const {
    isConnected,
    isListening,
    isSpeaking,
    transcript,
    messages,
    error,
    toggleConnection,
  } = useVoiceAgent({ onEmotionChange });

  const emotion = isListening ? "listening" : isSpeaking ? "speaking" : "idle";
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-6 sm:gap-6">
      {/* Panda Avatar */}
      <div className="relative">
        <div className={`absolute inset-0 rounded-full transition-all duration-700 ${
          isListening ? "bg-emerald-500/10 scale-150 blur-2xl animate-pulse" :
          isSpeaking ? "bg-violet-500/10 scale-125 blur-2xl" :
          "bg-transparent"
        }`} />
        <div className={`relative rounded-full bg-gradient-to-br ${
          isListening ? "from-emerald-500/15 to-teal-600/10" :
          isSpeaking ? "from-violet-500/15 to-indigo-600/10" :
          "from-emerald-500/10 to-teal-600/5"
        } p-6 shadow-[0_0_64px_rgba(16,185,129,0.15)] sm:p-8 transition-all duration-300`}>
          <SifuPanda
            emotion={emotion}
            size={isMobile ? 120 : 160}
            isSpeaking={isSpeaking}
            isListening={isListening}
          />
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <h2 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--text-primary)" }}>
          Sifu Panda
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {isListening && transcript ? `"${transcript}"` :
           isListening ? "Listening..." :
           isSpeaking ? "Sifu Panda is speaking..." :
           isConnected ? "Connected" :
           "Tap the mic to start"}
        </p>
        {/* Error display */}
        {error && !isConnected && (
          <p className="mt-2 max-w-xs text-xs text-red-400/80 leading-relaxed">
            ⚠️ {error}
          </p>
        )}
      </div>

      {/* Mic Button */}
      <button
        type="button"
        onClick={toggleConnection}
        className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 transition-all sm:h-20 sm:w-20 ${
          isConnected
            ? 'scale-110 border-red-400/50 bg-red-500/20 shadow-[0_0_48px_rgba(239,68,68,0.3)]'
            : 'border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_32px_rgba(16,185,129,0.15)] hover:border-emerald-500/60 hover:bg-emerald-500/15'
        }`}
        aria-label={isConnected ? 'Kapat' : 'Mikrofon'}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={isConnected ? 'text-red-400' : 'text-emerald-400'}
        >
          {isConnected ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </>
          )}
        </svg>
      </button>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="animate-pulse text-sm text-violet-500/70">Sifu Panda is speaking...</div>
      )}

      {/* Conversation */}
      {messages.length > 0 && (
        <div className="w-full max-w-md max-h-40 overflow-y-auto space-y-2 px-2 scrollbar-thin scrollbar-thumb-white/10">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-violet-500/10 text-violet-200/80 border border-violet-400/10"
                  : "bg-white/5 text-white/60 border border-white/10"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Back button */}
      <button
        type="button"
        onClick={() => {
          if (isConnected) toggleConnection();
          onBack?.();
        }}
        className="mt-2 rounded-xl border px-5 py-2 text-xs font-semibold transition-all hover:opacity-80"
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
      >
        Sohbete Dön
      </button>
    </div>
  );
}
