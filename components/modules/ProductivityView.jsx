"use client";
import { useState, useEffect } from "react";
import DraggableSlider from "@/components/ui/DraggableSlider";
import AIModelBadge from "@/components/ui/AIModelBadge";

function extractData(target) {
  if (!target) return null;
  if (target.routines && target.timeBlocks) return target;
  const raw = target.routines || target.microSteps || target;
  if (typeof raw === 'object' && !Array.isArray(raw) && raw.routines) return raw;
  if (typeof raw === 'object' && !Array.isArray(raw) && raw.timeBlocks) return raw;
  return null;
}

function TimeLine({ blocks = [] }) {
  if (!blocks.length) return null;
  return (
    <div>
      <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <span>⏱️</span> Günlük Zaman Çizelgesi
      </h4>
      <div className="space-y-2">
        {blocks.map((b, i) => {
          const type = b.type || 'routine';
          const colors = {
            focus: 'border-violet-500/40 bg-violet-900/10',
            break: 'border-emerald-500/30 bg-emerald-900/10',
            routine: 'border-white/10 bg-white/[0.02]',
          };
          const badges = {
            focus: 'bg-violet-600/20 text-violet-400 border-violet-500/30',
            break: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
            routine: 'bg-white/5 text-white/40 border-white/10',
          };
          return (
            <div key={i} className={`rounded-xl border p-3.5 flex items-center gap-4 transition-all hover:opacity-90 ${colors[type] || colors.routine}`}>
              <span className="text-[10px] font-mono font-bold text-white/40 w-24 shrink-0">{b.time}</span>
              <span className="text-xs font-medium text-white/80 flex-1">{b.label}</span>
              <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full border ${badges[type] || badges.routine}`}>
                {type === 'focus' ? 'Odak' : type === 'break' ? 'Mola' : 'Rutin'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoutinesList({ routines = {} }) {
  const morning = routines.morning || [];
  const afternoon = routines.afternoon || [];
  const evening = routines.evening || [];
  if (!morning.length && !afternoon.length && !evening.length) return null;
  const [checked, setChecked] = useState({});
  const toggle = (key) => setChecked(p => ({ ...p, [key]: !p[key] }));
  const Section = ({ title, items, period }) => (
    <div className="mb-4">
      <h5 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">{title}</h5>
      <div className="space-y-1.5">
        {items.map((item, i) => {
          const k = `${period}-${i}`;
          const done = checked[k];
          return (
            <label key={k} className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${done ? 'bg-emerald-900/10' : 'hover:bg-white/[0.03]'}`}>
              <input type="checkbox" checked={!!done} onChange={() => toggle(k)} className="mt-0.5 accent-violet-500" />
              <span className={`text-xs leading-relaxed ${done ? 'text-emerald-400/60 line-through' : 'text-white/70'}`}>{item}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
  return (
    <div>
      <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><span>✅</span> Rutin Kontrol Listesi</h4>
      <Section title="☀️ Sabah Rutinleri" items={morning} period="morning" />
      <Section title="🌤️ Öğle Rutinleri" items={afternoon} period="afternoon" />
      <Section title="🌙 Akşam Rutinleri" items={evening} period="evening" />
    </div>
  );
}

function SystemRules({ rules = [] }) {
  if (!rules.length) return null;
  return (
    <div className="bg-gradient-to-br from-violet-900/10 to-indigo-950/15 border border-violet-500/20 rounded-2xl p-5">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-3"> Bugünkü Üretkenlik Anayasan</h4>
      <ul className="space-y-2">
        {rules.map((rule, i) => (
          <li key={i} className="flex items-start gap-2.5 text-xs text-white/70 leading-relaxed">
            <span className="text-violet-400 mt-0.5 shrink-0">▸</span>
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );
}

const TECH_OPTIONS = [
  { value: "Pomodoro", label: "Pomodoro Tekniği (25 dk odak + 5 dk mola)" },
  { value: "ZamanBloklama", label: "Zaman Bloklama (Günü özel iş bloklarına bölme)" },
  { value: "Eisenhower", label: "Eisenhower Matrisi (Önemli/Acil ayrımı)" },
  { value: "90dkKurali", label: "90 Dakika Kuralı (90 dk çalışma + 20 dk mola)" },
  { value: "Ultradian", label: "Ultradiyen Ritimler (Biyolojik döngülere uyum)" },
];

const DEFAULT_PEAK = "09:00-12:00";
const DEFAULT_FOCUS = "4";

export default function ProductivityView({ onSelectView, userEmail, initialSessionId, initialRecordId }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [planData, setPlanData] = useState(null);
  const [peakHours, setPeakHours] = useState(DEFAULT_PEAK);
  const [focusHours, setFocusHours] = useState(DEFAULT_FOCUS);
  const [methods, setMethods] = useState(["Pomodoro"]);

  useEffect(() => { fetchPlan(); }, [initialRecordId]);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/modules/productivity");
      if (res.ok) {
        const data = await res.json();
        const rec = data.record;
        if (rec && rec.routines) {
          setPlanData(rec);
          setPeakHours(rec.peakHours || DEFAULT_PEAK);
          setFocusHours(String(rec.focusHours || DEFAULT_FOCUS));
          setMethods(rec.selectedMethods || ["Pomodoro"]);
        }
      }
    } catch (err) { console.error("Fetch error:", err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!peakHours || !focusHours) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/modules/productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peakHours, focusHours, techniques: methods }),
      });
      const data = await res.json();
      if (res.ok) {
        setPlanData(data.record);
      } else {
        setError(data.error || "Oluşturulamadı.");
      }
    } catch (err) { setError("Bağlantı hatası."); }
    finally { setSubmitting(false); }
  };

  const handleReset = () => {
    setPlanData(null);
    setPeakHours(DEFAULT_PEAK);
    setFocusHours(DEFAULT_FOCUS);
    setMethods(["Pomodoro"]);
    setError("");
  };

  const toggleMethod = (val) => {
    setMethods(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const pd = planData ? extractData(planData) : null;
  const hasPlan = pd && pd.routines && pd.timeBlocks;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0a0a16]">
        <div className="text-2xl animate-bounce">⚡</div>
        <p className="text-sm text-white/40 mt-3 ml-2">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin bg-[#0d0e15] text-white">
      <button onClick={() => onSelectView("chat")} className="mb-4 text-xs text-white/40 hover:text-white transition flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Sohbete Dön
      </button>

      <div className="max-w-4xl mx-auto">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs leading-relaxed">{error}</div>
        )}

        {!hasPlan ? (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl animate-scale-in">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-violet-300">Kişisel Üretkenlik Sistemin</h3>
              <AIModelBadge />
            </div>
            <p className="text-xs text-white/40 mb-6">
              AI, çalışma alışkanlıklarına göre sana özel bir zaman çizelgesi, rutin listesi ve üretkenlik anayasası oluşturacak.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 block mb-1.5">En verimli olduğun saat aralığı</label>
                <select value={peakHours} onChange={e => setPeakHours(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-violet-500/50 outline-none transition-all">
                  <option value="06:00-09:00">06:00 — 09:00 (Erken Kuş)</option>
                  <option value="09:00-12:00">09:00 — 12:00 (Klasik)</option>
                  <option value="12:00-15:00">12:00 — 15:00 (Öğle)</option>
                  <option value="15:00-18:00">15:00 — 18:00 (İkindi)</option>
                  <option value="18:00-21:00">18:00 — 21:00 (Akşam)</option>
                  <option value="21:00-00:00">21:00 — 00:00 (Gece Kuşu)</option>
                </select>
              </div>
              <div>
                <DraggableSlider
                  min={1}
                  max={10}
                  value={parseInt(focusHours)}
                  onChange={(v) => setFocusHours(v)}
                  label="Günlük odaklanabileceğin süre (saat)"
                />
                <div className="flex justify-between text-[10px] text-white/30 mt-0.5">
                  <span>1 saat</span>
                  <span className="text-violet-400 font-bold">{focusHours} saat</span>
                  <span>10 saat</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 block mb-2">Tercih ettiğin yöntemler</label>
                <div className="grid gap-2">
                  {TECH_OPTIONS.map(opt => {
                    const sel = methods.includes(opt.value);
                    return (
                      <label key={opt.value} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${sel ? 'bg-violet-600/15 border-violet-500/30' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/20'}`}>
                        <input type="checkbox" checked={sel} onChange={() => toggleMethod(opt.value)} className="accent-violet-500 rounded" />
                        <span className={`text-xs ${sel ? 'text-violet-300 font-semibold' : 'text-white/60'}`}>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <button type="submit" disabled={submitting || !peakHours || !focusHours} className="w-full glow-btn rounded-xl py-3 font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50">
                {submitting ? (
                  <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />AI Sistemini Oluşturuyor...</>
                ) : (
                  <>Kişisel Takvimi Oluştur ⚡</>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6 animate-scale-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Kişisel Üretkenlik Paneli</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  Zirve: {peakHours} · Günlük odak: {focusHours} saat · {methods.join(', ')}
                </p>
              </div>
              <button onClick={handleReset} className="text-[10px] font-semibold px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-all border border-white/10">
                Sistemi Yeniden Yapılandır
              </button>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
              <TimeLine blocks={pd.timeBlocks} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
                <RoutinesList routines={pd.routines} />
              </div>
              <div>
                <SystemRules rules={pd.rules} />
              </div>
            </div>

            <details className="text-[10px] text-white/20">
              <summary className="cursor-pointer hover:text-white/40">Ham veri</summary>
              <pre className="mt-2 p-3 bg-black/30 rounded-xl overflow-x-auto text-[9px] leading-relaxed">{JSON.stringify(pd, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
