"use client";

import SifuPanda from "./SifuPanda";
import VoiceOverlay from "./VoiceOverlay";

function MicIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

export default function SifuPandaPanel({
  emotion = "idle",
  isMobile = false,
  isRecording = false,
  isSpeaking = false,
  voiceEnabled = false,
  voiceOverlayOpen = false,
  interimText = "",
  onMicPress,
  onMicRelease,
  onToggleVoice,
  onCloseOverlay,
  compact = false,
}) {
  if (compact && isMobile) return null;

  return (
    <>
      <VoiceOverlay
        isOpen={voiceOverlayOpen}
        isRecording={isRecording}
        isSpeaking={isSpeaking}
        interimText={interimText}
        onClose={onCloseOverlay}
      />

      <div
        className={`pointer-events-auto ${
          isMobile
            ? "absolute right-3 top-16 z-30"
            : "absolute right-4 top-20 z-30"
        }`}
      >
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#0c0c18]/80 p-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="rounded-xl bg-gradient-to-br from-han-purple/10 to-han-blue/5 p-1">
            <SifuPanda emotion={emotion} size={isMobile ? 56 : 72} />
          </div>

          <span className="text-[9px] font-bold uppercase tracking-widest text-violet-400/60">
            Sifu Panda
          </span>

          <div className="flex gap-1.5">
            <button
              type="button"
              onMouseDown={onMicPress}
              onMouseUp={onMicRelease}
              onTouchStart={(e) => {
                e.preventDefault();
                onMicPress?.();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                onMicRelease?.();
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                isRecording
                  ? "border-red-400/40 bg-red-500/20 text-red-300 shadow-[0_0_16px_rgba(239,68,68,0.3)]"
                  : "border-han-purple/20 bg-han-purple/10 text-violet-300 hover:border-han-purple/40 hover:bg-han-purple/20"
              }`}
              title="Basılı tut — konuş"
              aria-label="Mikrofon"
            >
              <MicIcon active={isRecording} />
            </button>

            <button
              type="button"
              onClick={onToggleVoice}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition-all ${
                voiceEnabled
                  ? "border-han-gold/30 bg-han-gold/15 text-han-gold"
                  : "border-white/10 bg-white/5 text-white/40"
              }`}
              title={voiceEnabled ? "Sesli yanıt açık" : "Sesli yanıt kapalı"}
              aria-label="Sesli yanıt"
            >
              🔊
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
