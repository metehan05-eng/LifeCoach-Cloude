"use client";
import { useState, useEffect } from "react";

function AnalysisCard({ analysis }) {
  if (!analysis) return null;
  return (
    <div className="bg-gradient-to-br from-cyan-900/10 to-emerald-950/15 border border-cyan-500/20 rounded-2xl p-6">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-4"> Stratejik Analiz</h4>
      <div className="space-y-4">
        <div>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-white/30">Değer Önerisi</span>
          <p className="text-sm text-white/80 mt-1 leading-relaxed">{analysis.valueProp}</p>
        </div>
        <div>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-white/30">Hedef Kitle</span>
          <p className="text-sm text-white/80 mt-1 leading-relaxed">{analysis.targetAudience}</p>
        </div>
        {analysis.techStack?.length > 0 && (
          <div>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/30">Teknoloji Yığını</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {analysis.techStack.map((tech, i) => (
                <span key={i} className="bg-cyan-600/15 text-cyan-300 border border-cyan-500/25 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MvpPhasesFlow({ phases = [], checked, onToggle }) {
  if (!phases.length) return null;
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
      <h4 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
        <span>📋</span> MVP Yol Haritası
      </h4>
      <div className="relative">
        {phases.map((phase, i) => {
          const allDone = (phase.tasks || []).every((_, ti) => checked[`${i}-${ti}`]);
          return (
            <div key={i} className="relative flex flex-col items-stretch">
              <div className={`rounded-xl border p-5 transition-all ${allDone ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/[0.08]'}`}>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${allDone ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-cyan-600 text-white border-cyan-400'}`}>
                    {allDone ? '✓' : i + 1}
                  </span>
                  <div>
                    <span className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-wider block">{phase.phase}</span>
                    <span className="text-sm font-bold text-white">{phase.title}</span>
                  </div>
                </div>
                <div className="space-y-1.5 ml-0.5">
                  {(phase.tasks || []).map((task, ti) => {
                    const k = `${i}-${ti}`;
                    const done = checked[k];
                    return (
                      <label key={ti} className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${done ? 'bg-emerald-900/10' : 'hover:bg-white/[0.03]'}`}>
                        <input type="checkbox" checked={!!done} onChange={() => onToggle(i, ti)} className="mt-0.5 accent-cyan-500" />
                        <span className={`text-xs leading-relaxed ${done ? 'text-emerald-400/60 line-through' : 'text-white/70'}`}>{task}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              {i < phases.length - 1 && (
                <div className="flex justify-center py-2">
                  <svg width="20" height="24" viewBox="0 0 20 24" fill="none" className="text-white/10">
                    <path d="M10 0V20M10 20L3 13M10 20L17 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

function LeanCanvasMatrix({ leanCanvas }) {
  if (!leanCanvas) return null;
  const box = (label, items, accent, icon) => (
    <div className={`rounded-xl border p-5 ${accent}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">{label}</span>
      </div>
      <ul className="space-y-1.5">
        {(items || []).map((item, i) => (
          <li key={i} className="text-xs text-white/70 flex items-start gap-2 leading-relaxed">
            <span className="mt-0.5 shrink-0">▸</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
      <h4 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
        <span>📊</span> Yalın Kanvas
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {box("Problemler", leanCanvas.problems, "border-rose-500/20 bg-rose-900/5", "🔥")}
        {box("Çözümler", leanCanvas.solutions, "border-emerald-500/20 bg-emerald-900/5", "💡")}
        {box("Gelir Modelleri", leanCanvas.revenues, "border-amber-500/20 bg-amber-900/5", "💰")}
        {box("Maliyetler", leanCanvas.costs, "border-violet-500/20 bg-violet-900/5", "📉")}
      </div>
    </div>
  );
}

export default function StartupView({ onSelectView, initialRecordId }) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [activeRecord, setActiveRecord] = useState(null);
  const [ideaText, setIdeaText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [checked, setChecked] = useState({});

  useEffect(() => { fetchRecords(); }, [initialRecordId]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/modules/startup");
      if (res.ok) {
        const data = await res.json();
        const all = data.records || [];
        setRecords(all);
        if (initialRecordId) {
          const found = all.find(r => r.id === initialRecordId);
          if (found) { setActiveRecord(found); setLoading(false); return; }
        }
        if (all.length > 0) setActiveRecord(all[0]);
      }
    } catch (err) { console.error("Yükleme hatası:", err); setError("Veriler yüklenirken hata."); }
    finally { setLoading(false); }
  };

  const selectRecord = (r) => {
    setActiveRecord(r);
    setShowForm(false);
    setChecked({});
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ideaText.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/modules/startup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaDescription: ideaText }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveRecord(data.record);
        setRecords(prev => [data.record, ...prev]);
        setIdeaText("");
        setShowForm(false);
        setChecked({});
      } else {
        setError(data.error || "Oluşturulamadı.");
      }
    } catch (err) { setError("Bağlantı hatası."); }
    finally { setSubmitting(false); }
  };

  const handleToggle = (phaseIdx, taskIdx) => {
    setChecked(p => ({ ...p, [`${phaseIdx}-${taskIdx}`]: !p[`${phaseIdx}-${taskIdx}`] }));
  };

  const analysis = activeRecord?.analysis;
  const phases = activeRecord?.mvpPhases || [];
  const leanCanvas = activeRecord?.leanCanvas;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0a0a16]">
        <div className="text-2xl animate-bounce">🚀</div>
        <p className="text-sm text-white/40 mt-3 ml-2">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0d0e15] text-white">
      {/* Sidebar */}
      <div className="w-52 shrink-0 border-r border-white/[0.06] overflow-y-auto flex flex-col bg-[#0a0a14]">
        <div className="p-3 border-b border-white/[0.06]">
          <button
            onClick={() => { setShowForm(true); setActiveRecord(null); }}
            className="w-full text-xs font-semibold rounded-xl py-2 px-3 transition-all flex items-center justify-center gap-1.5 bg-cyan-600/15 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-600/25"
          >
            <span>+</span> Yeni Girişim Analizi
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {records.length === 0 && !showForm && (
            <div className="text-xs text-white/20 text-center py-8">Henüz analiz yok</div>
          )}
          {records.map(r => (
            <button
              key={r.id}
              onClick={() => selectRecord(r)}
              className={`w-full text-left rounded-xl px-3 py-2.5 transition-all text-xs ${
                activeRecord?.id === r.id
                  ? 'bg-cyan-600/15 border border-cyan-500/25'
                  : 'hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <div className="truncate font-medium text-white/70">
                {(r.analysis?.valueProp || r.idea || "").substring(0, 45)}...
              </div>
              <div className="mt-1 text-[9px] text-white/30">
                {new Date(r.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                {' · '}{r.mvpPhases?.length || 0} faz
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
        <button onClick={() => onSelectView("chat")} className="mb-4 text-xs text-white/40 hover:text-white transition flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Sohbete Dön
        </button>

        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs leading-relaxed">{error}</div>
          )}

          {/* Form */}
          {showForm && !activeRecord && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl animate-scale-in">
              <h3 className="text-sm font-bold text-cyan-300 mb-2">Girişim Fikrini Paylaş</h3>
              <p className="text-xs text-white/40 mb-4">
                Nasıl bir ürün veya hizmet geliştirmek istiyorsun? AI, stratejik analiz, MVP fazları ve yalın kanvas çıkaracak.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                  value={ideaText}
                  onChange={e => setIdeaText(e.target.value)}
                  placeholder="Örn: Yazılımcıların kod yazarken müzik dinlemesini optimize eden, üretkenlik odaklı bir Spotify entegrasyonu."
                  className="w-full h-28 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-cyan-500/50 outline-none transition-all resize-none"
                  disabled={submitting}
                />
                <button
                  type="submit"
                  disabled={submitting || !ideaText.trim()}
                  className="w-full glow-btn bg-gradient-to-r from-cyan-600 to-teal-600 rounded-xl py-3.5 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />AI Analiz Ediyor...</>
                  ) : (
                    <>Startup Analizi Başlat 🚀</>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Empty state */}
          {!activeRecord && !showForm && records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="text-6xl mb-4 opacity-30">🚀</div>
              <h3 className="text-lg font-bold text-white/60 mb-2">Henüz Girişim Analizin Yok</h3>
              <p className="text-sm text-white/30 max-w-md mb-6">
                Fikrini AI ile analiz et, MVP yol haritası çıkar ve yalın kanvas ile iş modelini gör.
              </p>
              <button onClick={() => setShowForm(true)} className="glow-btn rounded-xl px-6 py-3 font-semibold text-xs flex items-center gap-2">
                <span>✨</span> İlk Analizi Başlat
              </button>
            </div>
          )}

          {/* Active record */}
          {activeRecord && (
            <div className="space-y-6 animate-scale-in">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">{analysis?.valueProp || "Girişim Analizi"}</h2>
                  <p className="text-xs text-white/40 mt-0.5 truncate">Hedef kitle: {analysis?.targetAudience || "—"}</p>
                </div>
                <button
                  onClick={() => { setShowForm(true); setActiveRecord(null); }}
                  className="shrink-0 text-[10px] font-semibold px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-all border border-white/10"
                >
                  Yeni Girişim Analizi
                </button>
              </div>

              {/* A) Stratejik Analiz Kartı */}
              <AnalysisCard analysis={analysis} />

              {/* B) MVP Yol Haritası Akışı */}
              <MvpPhasesFlow phases={phases} checked={checked} onToggle={handleToggle} />

              {/* C) Yalın Kanvas Matrisi */}
              <LeanCanvasMatrix leanCanvas={leanCanvas} />

              {/* Details toggle */}
              <details className="text-[10px] text-white/20">
                <summary className="cursor-pointer hover:text-white/40">Ham veri</summary>
                <pre className="mt-2 p-3 bg-black/30 rounded-xl overflow-x-auto text-[9px] leading-relaxed">{JSON.stringify(activeRecord, null, 2)}</pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
