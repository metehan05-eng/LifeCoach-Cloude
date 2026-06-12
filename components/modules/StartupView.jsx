"use client";
import { useState, useEffect } from "react";

export default function StartupView({ onSelectView, userEmail, initialSessionId, initialRecordId }) {
  const [loading, setLoading] = useState(true);
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [ideaDescription, setIdeaDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    fetchRoadmaps();
  }, [initialRecordId]);

  const fetchRoadmaps = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/modules/startup");
      if (res.ok) {
        const data = await res.json();
        if (initialRecordId) {
          const found = data.records.find(r => r.id === initialRecordId);
          if (found) {
            setActiveRoadmap(found);
            setLoading(false);
            return;
          }
        }
        if (data.records && data.records.length > 0) {
          setActiveRoadmap(data.records[0]);
        }
      }
    } catch (err) {
      console.error("Yol haritası yükleme hatası:", err);
      setError("Veriler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ideaDescription.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/modules/startup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaDescription }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveRoadmap(data.record);
        setIdeaDescription("");
      } else {
        setError(data.error || "Yol haritası oluşturulamadı.");
      }
    } catch (err) {
      console.error("Startup hatası:", err);
      setError("Bağlantı hatası oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setActiveRoadmap(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0a16]">
        <div className="text-2xl animate-bounce">🚀</div>
        <p className="text-sm text-white/40 mt-3">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="startup-view relative flex-1 overflow-y-auto px-6 py-6 scrollbar-thin bg-[#0d0e15] text-white">
      {/* Close */}
      <button
        onClick={() => onSelectView("chat")}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all text-lg"
        aria-label="Kapat"
      >
        ✕
      </button>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-4xl">🚀</span>
          <h1 className="text-xl md:text-2xl font-bold mt-2">Startup Yol Haritası</h1>
          <p className="text-xs text-white/50 mt-1">
            Fikrini hızlıca çalışan bir prototipe (MVP) dönüştür. Pazarını tanı, adım adım ilerle.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs leading-relaxed">
            {error}
          </div>
        )}

        {!activeRoadmap ? (
          /* Idea input form */
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl animate-scale-in">
            <h3 className="text-sm font-bold text-cyan-300 mb-2">Girişim Fikrini Paylaş</h3>
            <p className="text-xs text-white/40 mb-4">
              Nasıl bir ürün veya hizmet geliştirmek istiyorsun? Çözmek istediğin problem nedir? 
              AI senin için MVP aşamalarını, teknoloji yığınını ve pazar hedeflerini analiz edecek.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={ideaDescription}
                onChange={(e) => setIdeaDescription(e.target.value)}
                placeholder="Örn: Yazılımcıların kod yazarken müzik dinlemesini optimize eden, üretkenlik odaklı bir Spotify entegrasyonu."
                className="w-full h-28 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-cyan-500/50 focus:outline-none transition-all resize-none"
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={submitting || !ideaDescription.trim()}
                className="w-full glow-btn bg-gradient-to-r from-cyan-600 to-teal-600 rounded-xl py-3.5 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Pazar ve MVP Analizi Yapılıyor...
                  </>
                ) : (
                  <>Startup Analizi Başlat 🚀</>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Roadmap View */
          <div className="space-y-6 animate-scale-in">
            {/* Project description card */}
            <div className="bg-gradient-to-br from-cyan-900/10 to-emerald-950/15 border border-cyan-500/15 rounded-2xl p-6 relative overflow-hidden">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Girişim Fikri</h3>
              <p className="text-base font-bold text-white mt-1 leading-relaxed">{activeRoadmap.ideaDescription}</p>

              {activeRoadmap.chatHistoryId && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => onSelectView("chat", activeRoadmap.chatHistory?.sessionId || activeRoadmap.chatHistoryId)}
                    className="text-[11px] font-semibold px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 rounded-xl transition-all border border-cyan-500/20 flex items-center gap-1.5"
                  >
                    💬 Yol Haritasını Detaylandır / Panda ile Konuş
                  </button>
                  <button
                    onClick={handleReset}
                    className="text-[11px] font-semibold px-3 py-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-all"
                  >
                    Yeni Fikir Planla
                  </button>
                </div>
              )}
            </div>

            {/* Layout Grid: Left MVP steps, Right Tech stack & Market Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: MVP Steps Accordion */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <span>📋</span> MVP Yol Haritası Aşamaları
                  </h4>
                  <div className="space-y-3">
                    {(activeRoadmap.mvpSteps || []).map((step, index) => {
                      const isActive = activeStepIndex === index;
                      return (
                        <div
                          key={index}
                          className={`border rounded-xl transition-all overflow-hidden ${
                            isActive
                              ? "bg-cyan-500/[0.04] border-cyan-500/30"
                              : "bg-white/[0.01] border-white/5 hover:border-white/10"
                          }`}
                        >
                          <button
                            onClick={() => setActiveStepIndex(index)}
                            className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isActive ? "bg-cyan-500 text-black" : "bg-white/10 text-white/60"
                              }`}>
                                {step.phase || index + 1}
                              </span>
                              <span>{step.title}</span>
                            </span>
                            <span className="text-[10px] text-cyan-400/80">{step.duration}</span>
                          </button>

                          {isActive && (
                            <div className="px-4 pb-4 pt-1 border-t border-cyan-500/10 space-y-3">
                              {/* Tasks */}
                              <div>
                                <span className="text-[10px] font-semibold text-cyan-300 block mb-1">Geliştirme Görevleri:</span>
                                <ul className="space-y-1.5">
                                  {(step.tasks || []).map((t, idx) => (
                                    <li key={idx} className="text-xs text-white/70 flex items-start gap-1.5">
                                      <span className="text-cyan-400/80 mt-0.5">•</span>
                                      {t}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {/* Tools */}
                              {step.tools && step.tools.length > 0 && (
                                <div>
                                  <span className="text-[10px] font-semibold text-cyan-300 block mb-1">Kullanılacak Araçlar:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {step.tools.map((tool, idx) => (
                                      <span key={idx} className="bg-white/5 px-2 py-0.5 rounded text-[10px] text-white/60">
                                        {tool}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Milestone */}
                              {step.milestone && (
                                <div className="p-2.5 bg-cyan-500/5 border border-cyan-500/10 rounded-lg text-xs text-cyan-300 italic">
                                  🎯 <strong>Milestone:</strong> {step.milestone}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Tech stack & Market Analysis */}
              <div className="lg:col-span-5 space-y-6">
                {/* Tech Stack */}
                {activeRoadmap.techStack && (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <span>🛠️</span> Teknoloji Yığını (Tech Stack)
                    </h4>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-white/45">Frontend</span>
                        <span className="font-semibold text-cyan-300">{activeRoadmap.techStack.frontend}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-white/45">Backend</span>
                        <span className="font-semibold text-cyan-300">{activeRoadmap.techStack.backend}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-white/45">Veritabanı</span>
                        <span className="font-semibold text-cyan-300">{activeRoadmap.techStack.database}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-white/45">Sunucu / Hosting</span>
                        <span className="font-semibold text-cyan-300">{activeRoadmap.techStack.deployment}</span>
                      </div>
                      {activeRoadmap.techStack.extras && (
                        <div>
                          <span className="text-white/45 block mb-1">Ekstra Entegrasyonlar</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {activeRoadmap.techStack.extras.map((ex, idx) => (
                              <span key={idx} className="bg-white/5 px-2 py-0.5 rounded text-[10px] text-white/60">
                                {ex}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Market Analysis */}
                {activeRoadmap.marketAnalysis && (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
                    <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <span>📊</span> Pazar & Rekabet Analizi
                    </h4>
                    <div className="space-y-4 text-xs">
                      {/* Financial Projections */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white/5 p-2 rounded">
                          <span className="block text-[9px] text-white/40">TAM</span>
                          <span className="font-semibold text-white/90">{activeRoadmap.marketAnalysis.tam || "—"}</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded">
                          <span className="block text-[9px] text-white/40">SAM</span>
                          <span className="font-semibold text-white/90">{activeRoadmap.marketAnalysis.sam || "—"}</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded">
                          <span className="block text-[9px] text-white/40">SOM</span>
                          <span className="font-semibold text-white/90">{activeRoadmap.marketAnalysis.som || "—"}</span>
                        </div>
                      </div>

                      {/* Advantages */}
                      {activeRoadmap.marketAnalysis.advantages && (
                        <div>
                          <span className="text-white/40 block mb-1.5">HAN Rakiplere Karşı Avantajlar:</span>
                          <div className="space-y-1">
                            {activeRoadmap.marketAnalysis.advantages.map((adv, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-emerald-400 font-semibold">
                                <span>⚡</span>
                                <span className="text-white/70 font-normal">{adv}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Target audience */}
                      {activeRoadmap.marketAnalysis.targetAudience && (
                        <div>
                          <span className="text-white/40 block mb-1">Hedef Kitle:</span>
                          <p className="text-white/75">{activeRoadmap.marketAnalysis.targetAudience}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
