"use client";
import { useState, useRef } from "react";

export default function MusicView({ onSelectView }) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/modules/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.analysis) {
        setResult(data);
      } else {
        setError(data.error || "Bir hata oluştu.");
      }
    } catch {
      setError("Bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !result?.audioUrl) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const handleReset = () => {
    setResult(null);
    setPrompt("");
    setPlaying(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d0e15] text-white px-6 py-6">
      <button
        onClick={() => onSelectView("chat")}
        className="mb-4 text-xs text-white/40 hover:text-white transition flex items-center gap-1.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Sohbete Dön
      </button>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-1">🎵 Müzik Üret</h2>
          <p className="text-sm text-white/40">
            Bir tarz veya ruh hali belirle, AI sana özel bir müzik parçası oluştursun.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs leading-relaxed">
            {error}
          </div>
        )}

        {!result && (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="bg-gradient-to-br from-violet-900/10 to-indigo-950/15 border border-violet-500/15 rounded-2xl p-6 backdrop-blur-xl">
              <label className="block text-xs font-semibold text-white/60 mb-2">
                Nasıl bir müzik istiyorsun?
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Örn: Sakin bir piyano melodisi, EDM tarzı enerjik bir parça, Lo-fi chill çalışma müziği..."
                className="w-full h-24 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none transition-all resize-none"
                disabled={loading}
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {["Sakin Piyano", "Enerjik EDM", "Lo-fi Chill", "Akustik Gitar", "Jazz", "Ambient"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPrompt(s)}
                    className="px-3 py-1.5 rounded-full text-[10px] font-medium bg-white/[0.03] border border-white/[0.08] text-white/40 hover:border-violet-500/30 hover:text-violet-300 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="mt-4 w-full glow-btn rounded-xl py-3 font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AI Müzik Oluşturuyor...
                  </>
                ) : (
                  <>Müzik Oluştur 🎵</>
                )}
              </button>
            </div>
          </form>
        )}

        {result && result.analysis && (
          <div className="space-y-6 animate-scale-in">
            <div className="bg-gradient-to-br from-violet-900/10 to-indigo-950/15 border border-violet-500/15 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-1">{result.analysis.title}</h3>
              <p className="text-xs text-white/50 mt-1">{result.analysis.description}</p>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 text-[10px] font-semibold border border-violet-500/20">
                  {result.analysis.genre}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                  {result.analysis.mood}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-semibold border border-amber-500/20">
                  {result.analysis.bpm} BPM
                </span>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-semibold border border-blue-500/20">
                  {result.analysis.key}
                </span>
              </div>

              {result.analysis.instruments?.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Enstrümanlar</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.analysis.instruments.map((inst, i) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] text-white/50">
                        {inst}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {result.audioUrl && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
                <h4 className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                  <span>🔊</span> Müzik Çalar
                </h4>

                <audio
                  ref={audioRef}
                  src={result.audioUrl}
                  onEnded={() => setPlaying(false)}
                  preload="metadata"
                />

                <div className="flex items-center gap-4">
                  <button
                    onClick={handlePlayPause}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg hover:scale-105 transition-all"
                  >
                    {playing ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{result.analysis.title}</div>
                    <div className="text-xs text-white/40">{result.analysis.duration} • {result.analysis.genre}</div>
                  </div>

                  <a
                    href={result.audioUrl}
                    download
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 hover:bg-white/10 transition-all"
                    title="İndir"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </a>
                </div>

                <div className="mt-4 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300 ${playing ? 'animate-pulse' : ''}`}
                    style={{ width: playing ? '100%' : '0%' }}
                  />
                </div>
              </div>
            )}

            {result.analysis.productionPrompt && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">Üretim Promptu</h4>
                <pre className="text-[11px] text-white/40 font-mono whitespace-pre-wrap">{result.analysis.productionPrompt}</pre>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-xs font-semibold text-white/50 hover:bg-white/[0.03] transition-all"
              >
                Yeni Müzik Dene
              </button>
              <button
                onClick={() => onSelectView("chat")}
                className="flex-1 glow-btn rounded-xl py-3 font-semibold text-xs"
              >
                Sohbete Dön
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
