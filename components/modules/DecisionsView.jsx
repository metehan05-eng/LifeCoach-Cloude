"use client";
import { useState, useEffect } from "react";
import ProConCard from "./ProConCard";
import ScenarioMatrix from "./ScenarioMatrix";

export default function DecisionsView({ onSelectView, userEmail, initialSessionId, initialRecordId }) {
  const [loading, setLoading] = useState(true);
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [dilemma, setDilemma] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDecisions();
  }, [initialRecordId]);

  const fetchDecisions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/modules/decisions");
      if (res.ok) {
        const data = await res.json();
        if (initialRecordId) {
          const found = data.records.find(r => r.id === initialRecordId);
          if (found) {
            setActiveAnalysis(found);
            setLoading(false);
            return;
          }
        }
        if (data.records && data.records.length > 0) {
          setActiveAnalysis(data.records[0]);
        }
      }
    } catch (err) {
      console.error("Karar kayıtları yüklenemedi:", err);
      setError("Veriler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dilemma.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/modules/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dilemma }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveAnalysis(data.record);
        setDilemma("");
      } else {
        setError(data.error || "Karar analizi oluşturulamadı.");
      }
    } catch (err) {
      console.error("Karar analizi hatası:", err);
      setError("Bağlantı hatası oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setActiveAnalysis(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0a16]">
        <div className="text-2xl animate-bounce">⚖️</div>
        <p className="text-sm text-white/40 mt-3">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="decisions-view relative flex-1 overflow-y-auto px-6 py-6 scrollbar-thin bg-[#0d0e15] text-white">
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
          <span className="text-4xl">⚖️</span>
          <h1 className="text-xl md:text-2xl font-bold mt-2">Karar Analizi</h1>
          <p className="text-xs text-white/50 mt-1">
            İki seçenek arasında mı kaldın? Artı ve eksileri tart, olası riskleri ve gelecek senaryolarını gör.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs leading-relaxed">
            {error}
          </div>
        )}

        {!activeAnalysis ? (
          /* Dilemma input form */
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl animate-scale-in">
            <h3 className="text-sm font-bold text-amber-300 mb-2">İkilemini Paylaş</h3>
            <p className="text-xs text-white/40 mb-4">
              Hangi iki seçenek arasında karar veremiyorsun? Seçenekleri ve hedeflerini belirt. 
              AI senin için puanlanmış artı-eksi listesi, 3/6/12 aylık senaryoları ve risk analizini hazırlayacak.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={dilemma}
                onChange={(e) => setDilemma(e.target.value)}
                placeholder="Örn: Kurumsal şirketteki yazılım mühendisliği işime devam mı etmeliyim (Seçenek A), yoksa istifa edip arkadaşımla SaaS projemiz üzerine mi odaklanmalıyım (Seçenek B)?"
                className="w-full h-28 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none transition-all resize-none"
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={submitting || !dilemma.trim()}
                className="w-full glow-btn bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl py-3.5 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Seçenekler ve Riskler Hesaplanıyor...
                  </>
                ) : (
                  <>Karar Analizini Başlat ⚖️</>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Active Dilemma View */
          <div className="space-y-6 animate-scale-in">
            {/* Dilemma card */}
            <div className="bg-gradient-to-br from-amber-900/10 to-yellow-950/15 border border-amber-500/15 rounded-2xl p-6 relative overflow-hidden">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Analiz Edilen İkilem</h3>
              <p className="text-base font-bold text-white mt-1 leading-relaxed">{activeAnalysis.dilemma}</p>

              {activeAnalysis.chatHistoryId && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => onSelectView("chat", activeAnalysis.chatHistory?.sessionId || activeAnalysis.chatHistoryId)}
                    className="text-[11px] font-semibold px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-xl transition-all border border-amber-500/20 flex items-center gap-1.5"
                  >
                    💬 Analizi Detaylandır / Panda ile Konuş
                  </button>
                  <button
                    onClick={handleReset}
                    className="text-[11px] font-semibold px-3 py-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-all"
                  >
                    Yeni İkilem Analiz Et
                  </button>
                </div>
              )}
            </div>

            {/* AI Recommendation Summary */}
            {activeAnalysis.proConAnalysis?.recommendation && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Sifu Panda'nın Karar Tavsiyesi</span>
                <p className="text-xs text-white/80 leading-relaxed mt-1">{activeAnalysis.proConAnalysis.recommendation}</p>
              </div>
            )}

            {/* Pro/Con Comparison Rings & Lists */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <span>📊</span> Artı / Eksi Puanlama Tartısı
              </h4>
              <ProConCard
                proConAnalysis={activeAnalysis.proConAnalysis}
                recommendation={activeAnalysis.proConAnalysis?.recommendation}
                recommendedOption={activeAnalysis.proConAnalysis?.recommendedOption}
              />
            </div>

            {/* Scenario Timeline Matrix & Risk Matrix */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
              <ScenarioMatrix
                timelineScenarios={activeAnalysis.timelineScenarios || {}}
                riskMatrix={activeAnalysis.riskMatrix || []}
                optionALabel={activeAnalysis.proConAnalysis?.optionA?.label || "Seçenek A"}
                optionBLabel={activeAnalysis.proConAnalysis?.optionB?.label || "Seçenek B"}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
