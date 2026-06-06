"use client";

import SifuPanda from "./SifuPanda";

export default function VoiceOverlay({
  isOpen,
  isRecording,
  isSpeaking,
  interimText,
  onClose,
}) {
  if (!isOpen) return null;

  const emotion = isSpeaking ? "speaking" : isRecording ? "thoughtful" : "idle";
  const status = isSpeaking
    ? "Sifu Panda konuşuyor..."
    : isRecording
      ? "Dinliyorum..."
      : "Sesli mod";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#0b0d17]/95 backdrop-blur-md md:hidden">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60"
        aria-label="Kapat"
      >
        ✕
      </button>

      <div className="mb-6 h-32 w-32 rounded-full bg-gradient-to-br from-han-purple/20 to-han-blue/10 p-4 shadow-[0_0_48px_rgba(124,58,237,0.25)]">
        <SifuPanda emotion={emotion} size={96} />
      </div>

      <p className="mb-2 text-lg font-bold text-han-text">{status}</p>
      {interimText && (
        <p className="max-w-[85%] text-center text-sm text-han-muted">&ldquo;{interimText}&rdquo;</p>
      )}

      {isRecording && (
        <div className="mt-8 flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-violet-400"
              style={{
                height: `${12 + (i % 3) * 8}px`,
                animation: `pulse 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
