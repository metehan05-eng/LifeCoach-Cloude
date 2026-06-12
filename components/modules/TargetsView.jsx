"use client";
import { useState, useEffect } from "react";
import MicroStepList from "./MicroStepList";
import YouTubeCarousel from "./YouTubeCarousel";

export default function TargetsView({ onSelectView, userEmail, initialSessionId, initialRecordId }) {
  const [loading, setLoading] = useState(true);
  const [activeTarget, setActiveTarget] = useState(null);
  const [targetText, setTargetText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [xpAnimation, setXpAnimation] = useState(null); // { amount }

  useEffect(() => {
    fetchActiveTarget();
  }, [initialRecordId]);

  const fetchActiveTarget = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/modules/targets");
      if (res.ok) {
        const data = await res.json();
        // Eğer belirli bir recordId ile gelmişsek onu bul, aksi takdirde bugün aktif hedef var mı ona bak
        if (initialRecordId) {
          const found = data.targets.find(t => t.id === initialRecordId);
          if (found) {
            setActiveTarget(found);
            setLoading(false);
            return;
          }
        }
        if (data.todayTarget) {
          setActiveTarget(data.todayTarget);
        } else {
          setActiveTarget(null);
        }
      }
    } catch (err) {
      console.error("Hedef bilgisi alınamadı:", err);
      setError("Hedef yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetText.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/modules/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetText }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveTarget(data.target);
        setTargetText("");
      } else {
        if (data.code === "DAILY_LIMIT_REACHED") {
          setError("Bugün zaten bir hedef belirledin! Her gün yalnızca 1 hedef oluşturabilirsin.");
          if (data.existingTarget) {
            setActiveTarget(data.existingTarget);
          }
        } else {
          setError(data.error || "Hedef oluşturulamadı.");
        }
      }
    } catch (err) {
      console.error("Hedef oluşturma hatası:", err);
      setError("Bağlantı hatası oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStepComplete = async (stepId, completed, xpReward) => {
    if (!activeTarget) return;

    try {
      const res = await fetch(`/api/modules/targets/${activeTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, completed }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveTarget(data.target);
        if (data.xpDelta > 0) {
          setXpAnimation(data.xpDelta);
          setTimeout(() => setXpAnimation(null), 2000);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error("Adım güncellenemedi:", err);
      throw err;
    }
  };

  const handleResetTarget = () => {
    setActiveTarget(null);
    setError("");
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0a16]">
        <div className="text-2xl animate-bounce">🎯</div>
        <p className="text-sm text-white/40 mt-3">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="targets-view relative flex-1 overflow-y-auto px-6 py-6 scrollbar-thin bg-[#0d0e15] text-white">
      {/* Close */}
      <button
        onClick={() => onSelectView("chat")}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all text-lg"
        aria-label="Kapat"
      >
        ✕
      </button>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-4xl">🎯</span>
          <h1 className="text-xl md:text-2xl font-bold mt-2">Hedef Planlama Modülü</h1>
          <p className="text-xs text-white/50 mt-1">
            Günü verimli geçirmenin ilk kuralı: Tek bir büyük odak belirle.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs leading-relaxed">
            {error}
          </div>
        )}

        {/* Form State: No Active Target */}
        {!activeTarget ? (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl animate-scale-in">
            <h3 className="text-sm font-bold text-violet-300 mb-2">Günün Odak Noktası</h3>
            <p className="text-xs text-white/40 mb-4">
              Bugün tamamlamak istediğin en önemli görev veya edinmek istediğin beceri nedir? 
              AI bu hedefi senin için yönetilebilir mikro adımlara bölecek.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
                placeholder="Örn: 2 saat Node.js API dokümantasyonu oku ve basit bir CRUD uygulama yaz."
                className="w-full h-24 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none transition-all resize-none"
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={submitting || !targetText.trim()}
                className="w-full glow-btn rounded-xl py-3 font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AI Mikro Adımları Hazırlıyor...
                  </>
                ) : (
                  <>Hedefi AI ile Yapılandır ⚡</>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Active Target View */
          <div className="space-y-6 animate-scale-in">
            {/* Target Card */}
            <div className="bg-gradient-to-br from-violet-900/10 to-indigo-950/15 border border-violet-500/15 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full filter blur-xl pointer-events-none" />
              {activeTarget && (
                <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  activeTarget.status === 'tamamlandı'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                }`}>
                  {activeTarget.status === 'tamamlandı' ? 'Tamamlandı' : 'Aktif'}
                </span>
              )}
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Günün Hedefi</h3>
              <p className="text-base font-bold text-white mt-1 leading-relaxed">{activeTarget.targetText}</p>
              
              <div className="mt-4 p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <span className="text-[10px] font-semibold text-violet-300 block">Sifu Panda'nın Motivasyon Mesajı</span>
                <p className="text-xs text-white/70 italic mt-0.5">&ldquo;Her büyük başarı, küçük adımların birikimidir. Bugün atılacak her adım seni bir adım öne taşır! 🚀&rdquo;</p>
              </div>

              {activeTarget.chatHistoryId && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => onSelectView("chat", activeTarget.chatHistory?.sessionId || activeTarget.chatHistoryId)}
                    className="text-[11px] font-semibold px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 rounded-xl transition-all border border-violet-500/20 flex items-center gap-1.5"
                  >
                    💬 Panda ile Sohbet Et
                  </button>
                  {activeTarget.status === 'tamamlandı' && (
                    <button
                      onClick={handleResetTarget}
                      className="text-[11px] font-semibold px-3 py-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-all"
                    >
                      Yeni Hedef Ekle
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Micro Steps Checklist */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <span>📋</span> Mikro Adımlar
              </h4>
              <MicroStepList
                steps={activeTarget.microSteps}
                targetId={activeTarget.id}
                onStepComplete={handleStepComplete}
              />
            </div>

            {/* YouTube Videos */}
            <YouTubeCarousel searchQuery={activeTarget.targetText} />
          </div>
        )}
      </div>

      {/* Floating XP Animation Popup */}
      {xpAnimation && (
        <div className="fixed bottom-10 right-10 bg-violet-600 text-white font-extrabold px-4 py-2.5 rounded-full shadow-[0_0_24px_rgba(138,43,226,0.6)] border border-violet-300/30 animate-bounce flex items-center gap-1.5 z-50">
          <span>⚡</span> +{xpAnimation} XP KAZANILDI!
        </div>
      )}
    </div>
  );
}
