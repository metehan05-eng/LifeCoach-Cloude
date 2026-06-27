"use client";
import { useState, useEffect } from "react";

function PlanSummary({ data }) {
  if (!data?.summary) return null;
  return (
    <div className="bg-gradient-to-br from-amber-900/10 to-orange-950/15 border border-amber-500/15 rounded-2xl p-5">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">🧠 Stratejik Analiz</h4>
      <p className="text-sm text-white/80 leading-relaxed">{data.summary}</p>
    </div>
  );
}

function FlowChart({ steps = [], onStepToggle }) {
  if (!steps.length) return null;
  return (
    <div className="relative">
      <h4 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
        <span>🔷</span> Akış Şeması
      </h4>
      <div className="relative flex flex-col items-center">
        {steps.map((step, i) => {
          const done = step.completed || false;
          return (
            <div key={step.order || i} className="flex flex-col items-center w-full">
              <div
                onClick={() => onStepToggle && onStepToggle(step.order)}
                className={`relative w-full cursor-pointer group transition-all duration-300 rounded-2xl border p-5 ${
                  done
                    ? 'bg-emerald-900/10 border-emerald-500/30'
                    : 'bg-white/[0.02] border-white/[0.08] hover:border-violet-500/30 hover:bg-white/[0.04]'
                }`}
              >
                <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  done
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-violet-600 text-white border-violet-400'
                }`}>
                  {done ? '✓' : step.order}
                </div>
                <div className="absolute top-4 right-4">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    done
                      ? 'bg-emerald-500 border-emerald-400'
                      : 'border-white/20 group-hover:border-violet-400/50'
                  }`}>
                    {done && (
                      <svg viewBox="0 0 12 10" fill="none" className="w-2.5 h-2.5">
                        <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <h5 className={`text-sm font-bold pr-8 ${done ? 'text-emerald-300' : 'text-white'}`}>{step.title}</h5>
                <p className={`text-xs mt-2 leading-relaxed ${done ? 'text-emerald-300/60' : 'text-white/50'}`}>{step.description}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex flex-col items-center py-1">
                  <svg width="24" height="28" viewBox="0 0 24 28" fill="none" className="text-white/15">
                    <path d="M12 0V24M12 24L5 17M12 24L19 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyPlans({ plans = [] }) {
  if (!plans.length) return null;
  return (
    <div>
      <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <span>📅</span> Haftalık Program
      </h4>
      <div className="space-y-3">
        {plans.map((plan, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:border-violet-500/20 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-full">{plan.weekNumber}</span>
              <span className="text-xs font-semibold text-white/80">{plan.focus}</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">{plan.tasks}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onNewClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-6xl mb-4 opacity-30">🎯</div>
      <h3 className="text-lg font-bold text-white/60 mb-2">Henüz Hedefin Yok</h3>
      <p className="text-sm text-white/30 max-w-md mb-6">
        Büyük hedeflerini AI ile yapılandır, adım adım akış şemasına dönüştür ve haftalık programla takip et.
      </p>
      <button
        onClick={onNewClick}
        className="glow-btn rounded-xl px-6 py-3 font-semibold text-xs flex items-center gap-2"
      >
        <span>✨</span> İlk Hedefini Oluştur
      </button>
    </div>
  );
}

function extractPlanData(target) {
  if (!target) return null;
  const raw = target.microSteps;
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw) && raw.summary) return raw;
  return null;
}

export default function TargetsView({ onSelectView, userEmail, initialSessionId, initialRecordId }) {
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState([]);
  const [activeTarget, setActiveTarget] = useState(null);
  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [targetText, setTargetText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState("");
  const [xpAnimation, setXpAnimation] = useState(null);

  useEffect(() => {
    fetchTargets();
  }, [initialRecordId]);

  const fetchTargets = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/modules/targets");
      if (res.ok) {
        const data = await res.json();
        const allTargets = data.targets || [];
        setTargets(allTargets);

        if (initialRecordId) {
          const found = allTargets.find(t => t.id === initialRecordId);
          if (found) {
            setActiveTarget(found);
            setSelectedTargetId(found.id);
            setLoading(false);
            return;
          }
        }

        if (data.todayTarget) {
          setActiveTarget(data.todayTarget);
          setSelectedTargetId(data.todayTarget.id);
        } else if (allTargets.length > 0) {
          setActiveTarget(allTargets[0]);
          setSelectedTargetId(allTargets[0].id);
        } else {
          setActiveTarget(null);
          setSelectedTargetId(null);
        }
      }
    } catch (err) {
      console.error("Hedef bilgisi alınamadı:", err);
      setError("Hedef yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const selectTarget = (target) => {
    setActiveTarget(target);
    setSelectedTargetId(target.id);
    setShowNewForm(false);
    setError("");
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
      if (res.ok && data.target) {
        setActiveTarget(data.target);
        setSelectedTargetId(data.target.id);
        setTargetText("");
        setShowNewForm(false);
        setTargets(prev => [data.target, ...prev]);
      } else if (res.ok && !data.target) {
        setError("Hedef oluşturuldu ancak yüklenemedi. Lütfen sayfayı yenileyin.");
      } else {
        if (data.code === "DAILY_LIMIT_REACHED") {
          setError("Bugün zaten bir hedef belirledin! Her gün yalnızca 1 hedef oluşturabilirsin.");
          if (data.existingTarget) {
            setActiveTarget(data.existingTarget);
            setSelectedTargetId(data.existingTarget.id);
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

  const handleStepToggle = async (stepOrder) => {
    if (!activeTarget) return;

    const planData = extractPlanData(activeTarget);
    const steps = planData?.steps || [];
    const step = steps.find(s => s.order === stepOrder);
    if (!step) return;

    const newCompleted = !step.completed;

    try {
      const res = await fetch(`/api/modules/targets/${activeTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepOrder, completed: newCompleted }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveTarget(data.target);
        setTargets(prev => prev.map(t => t.id === data.target.id ? data.target : t));
        if (data.xpDelta > 0) {
          setXpAnimation(data.xpDelta);
          setTimeout(() => setXpAnimation(null), 2000);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error("Adım güncellenemedi:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0a16]">
        <div className="text-2xl animate-bounce">🎯</div>
        <p className="text-sm text-white/40 mt-3">Yükleniyor...</p>
      </div>
    );
  }

  const planData = extractPlanData(activeTarget);

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0d0e15] text-white">
      {/* Target History Sidebar */}
      <div className="w-56 shrink-0 border-r border-white/[0.06] overflow-y-auto flex flex-col bg-[#0a0a14]">
        <div className="p-3 border-b border-white/[0.06]">
          <button
            onClick={() => { setShowNewForm(true); setActiveTarget(null); setSelectedTargetId(null); }}
            className={`w-full text-xs font-semibold rounded-xl py-2 px-3 transition-all flex items-center justify-center gap-1.5 ${
              showNewForm
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/30'
                : 'bg-violet-600/15 text-violet-400 border border-violet-500/20 hover:bg-violet-600/25'
            }`}
          >
            <span>+</span> Yeni Hedef
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {targets.length === 0 && !showNewForm && (
            <div className="text-xs text-white/20 text-center py-8">Henüz hedef yok</div>
          )}
          {targets.map(t => (
            <button
              key={t.id}
              onClick={() => selectTarget(t)}
              className={`w-full text-left rounded-xl px-3 py-2.5 transition-all text-xs ${
                selectedTargetId === t.id
                  ? 'bg-violet-600/15 border border-violet-500/25'
                  : 'hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                  t.status === 'tamamlandı' ? 'bg-emerald-500' : 'bg-violet-500'
                }`} />
                <span className={`truncate font-medium ${
                  selectedTargetId === t.id ? 'text-white' : 'text-white/60'
                }`}>
                  {t.targetText?.substring(0, 40)}{t.targetText?.length > 40 ? '...' : ''}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-[9px] uppercase tracking-wider ${
                  t.status === 'tamamlandı' ? 'text-emerald-500/60' : 'text-violet-500/60'
                }`}>
                  {t.status === 'tamamlandı' ? 'Tamamlandı' : 'Aktif'}
                </span>
                <span className="text-[9px] text-white/20">
                  {new Date(t.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
        <button
          onClick={() => onSelectView("chat")}
          className="mb-4 text-xs text-white/40 hover:text-white transition flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Sohbete Dön
        </button>

        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs leading-relaxed">
              {error}
            </div>
          )}

          {/* New Target Form */}
          {showNewForm && !activeTarget && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl animate-scale-in">
              <h3 className="text-sm font-bold text-violet-300 mb-2">Yeni Hedef</h3>
              <p className="text-xs text-white/40 mb-4">
                Bugün üzerinde çalışmak istediğin büyük hedefi veya projeyi yaz. AI bunu bir akış şemasına ve haftalık programa dönüştürecek.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                  value={targetText}
                  onChange={(e) => setTargetText(e.target.value)}
                  placeholder="Örn: 3 ay içinde sıfırdan bir mobil uygulama yapıp yayınlamak istiyorum."
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
                      AI Hedefi Yapılandırıyor...
                    </>
                  ) : (
                    <>Hedefi AI ile Yapılandır ⚡</>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Empty State */}
          {!activeTarget && !showNewForm && targets.length === 0 && (
            <EmptyState onNewClick={() => { setShowNewForm(true); }} />
          )}

          {/* Selected Target Details */}
          {activeTarget && (
            <div className="space-y-6 animate-scale-in">
              <div className="bg-gradient-to-br from-violet-900/10 to-indigo-950/15 border border-violet-500/15 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full filter blur-xl pointer-events-none" />
                <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  activeTarget.status === 'tamamlandı'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                }`}>
                  {activeTarget.status === 'tamamlandı' ? 'Tamamlandı' : 'Aktif'}
                </span>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Hedef</h3>
                <p className="text-base font-bold text-white mt-1 leading-relaxed">{activeTarget.targetText}</p>

                {activeTarget.chatHistoryId && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => onSelectView("chat", activeTarget.chatHistory?.sessionId || activeTarget.chatHistoryId)}
                      className="text-[11px] font-semibold px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 rounded-xl transition-all border border-violet-500/20 flex items-center gap-1.5"
                    >
                      💬 Panda ile Sohbet Et
                    </button>
                  </div>
                )}
              </div>

              {planData && <PlanSummary data={planData} />}

              {planData && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
                  <FlowChart steps={planData.steps} onStepToggle={handleStepToggle} />
                </div>
              )}

              {planData && planData.weeklyPlans?.length > 0 && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
                  <WeeklyPlans plans={planData.weeklyPlans} />
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {xpAnimation && (
        <div className="fixed bottom-10 right-10 bg-violet-600 text-white font-extrabold px-4 py-2.5 rounded-full shadow-[0_0_24px_rgba(138,43,226,0.6)] border border-violet-300/30 animate-bounce flex items-center gap-1.5 z-50">
          <span>⚡</span> +{xpAnimation} XP KAZANILDI!
        </div>
      )}
    </div>
  );
}
