"use client";
import { useState, useEffect } from "react";

/* ── A) Artı/Eksi Terazisi ── */
function ProsConsGrid({ prosCons, optionALabel, optionBLabel }) {
  if (!prosCons) return null;
  const colA = prosCons.optionA || { pros: [], cons: [] };
  const colB = prosCons.optionB || { pros: [], cons: [] };
  const Col = ({ label, data, accent }) => (
    <div className={`rounded-xl border p-5 ${accent}`}>
      <h5 className="text-xs font-bold text-white/80 mb-4">{label}</h5>
      <div className="space-y-3">
        {/* Pros */}
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 mb-2 block">✅ Artılar</span>
          <div className="space-y-1.5">
            {(data.pros || []).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-[9px] font-bold text-emerald-400">
                  {item.score}
                </span>
                <span className="text-white/70">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Cons */}
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-rose-400 mb-2 block">❌ Eksiler</span>
          <div className="space-y-1.5">
            {(data.cons || []).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="shrink-0 w-6 h-6 rounded-full bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-[9px] font-bold text-rose-400">
                  {item.score}
                </span>
                <span className="text-white/70">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
      <h4 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
        <span>⚖️</span> Artı/Eksi Terazisi
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Col label={optionALabel || "Seçenek A"} data={colA} accent="border-violet-500/20 bg-violet-900/5" />
        <Col label={optionBLabel || "Seçenek B"} data={colB} accent="border-amber-500/20 bg-amber-900/5" />
      </div>
    </div>
  );
}

/* ── B) Gelecek Zaman Simülasyonu ── */
function TimeSimulation({ simulation, optionALabel, optionBLabel }) {
  if (!simulation) return null;
  const [tab, setTab] = useState("m3");
  const periods = [
    { key: "m3", label: "3 Ay" },
    { key: "m6", label: "6 Ay" },
    { key: "m12", label: "12 Ay" },
  ];
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
      <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <span>🔮</span> Gelecek Zaman Simülasyonu
      </h4>
      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 bg-white/[0.03] rounded-xl p-1 w-fit">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setTab(p.key)}
            className={`text-[11px] font-semibold px-4 py-1.5 rounded-lg transition-all ${
              tab === p.key ? 'bg-violet-600/30 text-violet-300 border border-violet-500/30' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-violet-500/20 bg-violet-900/5 p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-2 block">{optionALabel || "Seçenek A"}</span>
          <p className="text-xs text-white/70 leading-relaxed">{simulation.optionA?.[tab] || "—"}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-900/5 p-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2 block">{optionBLabel || "Seçenek B"}</span>
          <p className="text-xs text-white/70 leading-relaxed">{simulation.optionB?.[tab] || "—"}</p>
        </div>
      </div>
    </div>
  );
}

/* ── C) Risk ve Karar Kartı ── */
function RiskVerdictCard({ riskScores, coachVerdict, optionALabel, optionBLabel }) {
  if (!riskScores) return null;
  const scoreA = riskScores.optionA ?? 50;
  const scoreB = riskScores.optionB ?? 50;
  const bar = (label, score, color) => (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/60">{label}</span>
        <span className={`font-bold ${color.text}`}>%{score}</span>
      </div>
      <div className="h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color.bg}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
  return (
    <div className="bg-gradient-to-br from-violet-900/10 to-indigo-950/15 border border-violet-500/20 rounded-2xl p-6">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-5">📊 Risk ve Karar Kartı</h4>
      {bar(optionALabel || "Seçenek A", scoreA, { bg: "bg-emerald-500", text: "text-emerald-400" })}
      {bar(optionBLabel || "Seçenek B", scoreB, { bg: "bg-amber-500", text: "text-amber-400" })}
      <div className="mt-2 text-[10px] text-white/30 text-right">
        0 = Düşük risk · 100 = Yüksek risk
      </div>
      {coachVerdict && (
        <div className="mt-6 p-5 rounded-xl bg-violet-600/10 border border-violet-500/25">
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 block mb-2">LifeCoach AI Önerisi</span>
          <p className="text-sm text-white/90 leading-relaxed italic">{coachVerdict}</p>
        </div>
      )}
    </div>
  );
}

/* ── Ana Bileşen ── */
export default function DecisionsView({ onSelectView, initialRecordId }) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [activeRecord, setActiveRecord] = useState(null);
  const [dilemma, setDilemma] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchRecords(); }, [initialRecordId]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/modules/decisions");
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
    setError("");
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
        setActiveRecord(data.record);
        setRecords(prev => [data.record, ...prev]);
        setDilemma("");
        setShowForm(false);
      } else {
        setError(data.error || "Oluşturulamadı.");
      }
    } catch (err) { setError("Bağlantı hatası."); }
    finally { setSubmitting(false); }
  };

  const ad = activeRecord?.analysisData || {};
  const optionA = activeRecord?.optionA || ad?.prosCons?.optionA?.label || "Seçenek A";
  const optionB = activeRecord?.optionB || ad?.prosCons?.optionB?.label || "Seçenek B";

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0a0a16]">
        <div className="text-2xl animate-bounce">⚖️</div>
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
            className="w-full text-xs font-semibold rounded-xl py-2 px-3 transition-all flex items-center justify-center gap-1.5 bg-amber-600/15 text-amber-400 border border-amber-500/20 hover:bg-amber-600/25"
          >
            <span>+</span> Yeni Analiz
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
                  ? 'bg-amber-600/15 border border-amber-500/25'
                  : 'hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <div className="truncate font-medium text-white/70">
                {(r.dilemma || "").substring(0, 45)}...
              </div>
              <div className="mt-1 text-[9px] text-white/30">
                {new Date(r.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
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
              <h3 className="text-sm font-bold text-amber-300 mb-2">İkilemini Paylaş</h3>
              <p className="text-xs text-white/40 mb-4">
                Hangi iki seçenek arasında karar veremiyorsun? AI, puanlanmış artı/eksi listesi, 3/6/12 aylık senaryolar ve risk analizi çıkaracak.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                  value={dilemma}
                  onChange={e => setDilemma(e.target.value)}
                  placeholder="Örn: Kurumsal şirketteki yazılım mühendisliği işime devam mı etmeliyim, yoksa istifa edip arkadaşımla SaaS projemiz üzerine mi odaklanmalıyım?"
                  className="w-full h-28 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-amber-500/50 outline-none transition-all resize-none"
                  disabled={submitting}
                />
                <button
                  type="submit"
                  disabled={submitting || !dilemma.trim()}
                  className="w-full glow-btn bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl py-3.5 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Seçenekler ve Riskler Hesaplanıyor...</>
                  ) : (
                    <>Karar Analizini Başlat ⚖️</>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Empty state */}
          {!activeRecord && !showForm && records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="text-6xl mb-4 opacity-30">⚖️</div>
              <h3 className="text-lg font-bold text-white/60 mb-2">Henüz Karar Analizin Yok</h3>
              <p className="text-sm text-white/30 max-w-md mb-6">
                İkilemini AI ile analiz et, artı/eksi puanlaması, zaman senaryoları ve risk değerlendirmesi gör.
              </p>
              <button onClick={() => setShowForm(true)} className="glow-btn rounded-xl px-6 py-3 font-semibold text-xs flex items-center gap-2">
                <span>✨</span> İlk Analizi Başlat
              </button>
            </div>
          )}

          {/* Active analysis */}
          {activeRecord && (
            <div className="space-y-6 animate-scale-in">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">{activeRecord.dilemma}</h2>
                  <p className="text-xs text-white/40 mt-0.5">
                    {optionA} ↔ {optionB}
                  </p>
                </div>
                <button
                  onClick={() => { setShowForm(true); setActiveRecord(null); }}
                  className="shrink-0 text-[10px] font-semibold px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-all border border-white/10"
                >
                  Yeni Analiz Yap
                </button>
              </div>

              {/* A) Artı/Eksi Terazisi */}
              <ProsConsGrid prosCons={ad.prosCons} optionALabel={optionA} optionBLabel={optionB} />

              {/* B) Gelecek Zaman Simülasyonu */}
              <TimeSimulation simulation={ad.simulation} optionALabel={optionA} optionBLabel={optionB} />

              {/* C) Risk ve Karar Kartı */}
              <RiskVerdictCard riskScores={ad.riskScores} coachVerdict={ad.coachVerdict} optionALabel={optionA} optionBLabel={optionB} />

              {/* Ham veri */}
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
