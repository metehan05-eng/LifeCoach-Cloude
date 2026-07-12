"use client";
import { useState } from "react";

function PhaseCard({ phase, index }) {
  const [expanded, setExpanded] = useState(index === 0);
  return (
    <div className="relative">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shrink-0">
            {index + 1}
          </div>
          {index < 8 && <div className="w-0.5 h-full min-h-[24px] bg-gradient-to-b from-violet-500/40 to-transparent" />}
        </div>
        <div className="flex-1 pb-8">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/25 rounded-xl p-4 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">{phase.name}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-violet-400 font-semibold">{phase.duration}</span>
                  <span className="text-[10px] text-white/30">{phase.topics?.length || 0} konu</span>
                </div>
              </div>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`text-white/30 transition-transform ${expanded ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>

          {expanded && (
            <div className="mt-3 space-y-3 pl-2 animate-scale-in">
              <p className="text-xs text-white/50 leading-relaxed">{phase.description}</p>

              {phase.topics?.length > 0 && (
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-2">Konular</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {phase.topics.map((t, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[10px] text-white/60">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {phase.milestones?.length > 0 && (
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2">Kazanımlar</h5>
                  <ul className="space-y-1">
                    {phase.milestones.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-white/60">
                        <span className="text-emerald-400 mt-0.5">✓</span>
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {phase.resources?.length > 0 && (
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">Kaynaklar</h5>
                  <div className="space-y-1">
                    {phase.resources.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          r.type === "video" ? "bg-red-500/15 text-red-400" :
                          r.type === "kitap" ? "bg-blue-500/15 text-blue-400" :
                          r.type === "kurs" ? "bg-green-500/15 text-green-400" :
                          r.type === "proje" ? "bg-purple-500/15 text-purple-400" :
                          "bg-white/10 text-white/50"
                        }`}>{r.type}</span>
                        <span className="text-white/60">{r.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {phase.weeklyPlan && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-1">Haftalık Plan</h5>
                  <p className="text-[11px] text-white/50">{phase.weeklyPlan}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LearningGuideView({ onSelectView }) {
  const [topic, setTopic] = useState("");
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setRoadmap(null);
    try {
      const res = await fetch("/api/modules/learning-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.roadmap) {
        setRoadmap(data.roadmap);
      } else {
        setError(data.error || "Bir hata oluştu.");
      }
    } catch {
      setError("Bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
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

      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-1">📚 Öğrenme Rehberi</h2>
          <p className="text-sm text-white/40">
            Bir konu belirle, AI sana adım adım öğrenme yol haritası oluştursun.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs leading-relaxed">
            {error}
          </div>
        )}

        {!roadmap && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
              <label className="block text-xs font-semibold text-white/60 mb-2">Ne öğrenmek istiyorsun?</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Örn: Python ile web geliştirme, Makine öğrenmesi, Gitar çalmak..."
                className="w-full h-24 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none transition-all resize-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !topic.trim()}
                className="mt-4 w-full glow-btn rounded-xl py-3 font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AI Yol Haritası Oluşturuyor...
                  </>
                ) : (
                  <>Yol Haritası Oluştur 🚀</>
                )}
              </button>
            </div>
          </form>
        )}

        {roadmap && (
          <div className="space-y-6 animate-scale-in">
            <div className="bg-gradient-to-br from-violet-900/10 to-indigo-950/15 border border-violet-500/15 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white">{roadmap.title}</h3>
              <p className="text-sm text-white/50 mt-2 leading-relaxed">{roadmap.summary}</p>
              <div className="flex items-center gap-4 mt-4">
                <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-full">
                  {roadmap.totalDuration}
                </span>
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                  {roadmap.difficulty}
                </span>
              </div>
            </div>

            {roadmap.prerequisites?.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-3">Ön Koşullar</h4>
                <ul className="space-y-1.5">
                  {roadmap.prerequisites.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                      <span className="text-amber-400 mt-0.5">▸</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <span>🗺️</span> Öğrenme Yol Haritası
              </h4>
              <div className="relative">
                {roadmap.phases?.map((phase, i) => (
                  <PhaseCard key={i} phase={phase} index={i} />
                ))}
              </div>
            </div>

            {roadmap.tips?.length > 0 && (
              <div className="bg-gradient-to-br from-amber-900/10 to-orange-950/15 border border-amber-500/15 rounded-2xl p-5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-3">💡 İpuçları</h4>
                <ul className="space-y-2">
                  {roadmap.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                      <span className="text-amber-400 mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setRoadmap(null); setTopic(""); }}
                className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-xs font-semibold text-white/50 hover:bg-white/[0.03] transition-all"
              >
                Yeni Konu Dene
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
