"use client";
import { useState, useEffect } from "react";
import WeeklySchedule from "./WeeklySchedule";

export default function ProductivityView({ onSelectView, userEmail, initialSessionId, initialRecordId }) {
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState(null);
  const [peakHours, setPeakHours] = useState("09:00-12:00");
  const [focusHours, setFocusHours] = useState("4");
  const [techniques, setTechniques] = useState(["Pomodoro"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const techOptions = [
    { value: "Pomodoro", label: "Pomodoro Tekniği (25 dk odak + 5 dk mola)" },
    { value: "ZamanBloklama", label: "Zaman Bloklama (Günü özel iş bloklarına bölme)" },
    { value: "Eisenhower", label: "Eisenhower Matrisi (Önemli/Acil ayrımı)" },
    { value: "90dkKurali", label: "90 Dakika Kuralı (90 dk çalışma + 20 dk mola)" },
    { value: "Ultradian", label: "Ultradiyen Ritimler (Biyolojik döngülere uyum)" },
  ];

  useEffect(() => {
    fetchProductivityPlan();
  }, [initialRecordId]);

  const fetchProductivityPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/modules/productivity");
      if (res.ok) {
        const data = await res.json();
        if (initialRecordId) {
          const found = data.records.find(r => r.id === initialRecordId);
          if (found) {
            setActivePlan(found);
            setLoading(false);
            return;
          }
        }
        if (data.records && data.records.length > 0) {
          setActivePlan(data.records[0]);
        }
      }
    } catch (err) {
      console.error("Üretkenlik planı alınamadı:", err);
      setError("Veriler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (tech) => {
    if (techniques.includes(tech)) {
      setTechniques(techniques.filter(t => t !== tech));
    } else {
      setTechniques([...techniques, tech]);
    }
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
        body: JSON.stringify({
          peakHours,
          focusHours: parseInt(focusHours),
          techniques,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActivePlan(data.record);
      } else {
        setError(data.error || "Üretkenlik sistemi oluşturulamadı.");
      }
    } catch (err) {
      console.error("İstek hatası:", err);
      setError("Bağlantı hatası oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setActivePlan(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0a16]">
        <div className="text-2xl animate-bounce">⚡</div>
        <p className="text-sm text-white/40 mt-3">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="productivity-view flex-1 overflow-y-auto px-6 py-6 scrollbar-thin bg-[#0d0e15] text-white">
      {/* Back to Dashboard */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onSelectView("dashboard")}
          className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1.5 transition-colors"
        >
          ← Dashboard'a Dön
        </button>
        {activePlan && (
          <button
            onClick={handleReset}
            className="text-xs font-semibold text-white/40 hover:text-white transition-colors"
          >
            Sistemi Yeniden Kur
          </button>
        )}
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-4xl">⚡</span>
          <h1 className="text-xl md:text-2xl font-bold mt-2">Üretkenlik Sistemi Kur</h1>
          <p className="text-xs text-white/50 mt-1">
            Zamanını yönetme, odağını yönet. Kendi ideal zaman bloklamanı ve rutinlerini yapılandır.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs leading-relaxed">
            {error}
          </div>
        )}

        {!activePlan ? (
          /* Input Form */
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl animate-scale-in">
            <h3 className="text-sm font-bold text-indigo-300 mb-4">Üretkenlik Profili</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Peak Hours */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-2">
                  Günde Enerjinin En Yüksek Olduğu Saatler (Zirve Saatler)
                </label>
                <input
                  type="text"
                  value={peakHours}
                  onChange={(e) => setPeakHours(e.target.value)}
                  placeholder="Örn: 09:00-12:00 veya 14:00-17:00"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none transition-all"
                  required
                />
              </div>

              {/* Focus Hours */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-2">
                  Günde Kaç Saat Kesintisiz Odaklanmak İstiyorsun?
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={focusHours}
                  onChange={(e) => setFocusHours(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none transition-all"
                  required
                />
              </div>

              {/* Techniques */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-3">
                  Tercih Ettiğin Üretkenlik Metotları (Birden fazla seçebilirsin)
                </label>
                <div className="space-y-2.5">
                  {techOptions.map((opt) => {
                    const isChecked = techniques.includes(opt.value);
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => handleCheckboxChange(opt.value)}
                        className={`w-full flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                          isChecked
                            ? "bg-indigo-600/10 border-indigo-500/40 text-white"
                            : "bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isChecked ? "bg-indigo-500 border-indigo-500" : "border-white/30"
                        }`}>
                          {isChecked && (
                            <svg width="10" height="8" viewBox="0 0 12 10" fill="none">
                              <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="text-xs font-semibold">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full glow-btn bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl py-3.5 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Zaman Blokları Tasarlanıyor...
                  </>
                ) : (
                  <>Kişisel Takvimi Oluştur ⚡</>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Active Schedule View */
          <div className="space-y-6 animate-scale-in">
            {/* Header info */}
            <div className="bg-gradient-to-br from-indigo-900/10 to-violet-950/15 border border-indigo-500/15 rounded-2xl p-6 relative overflow-hidden">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Aktif Üretkenlik Profili</h3>
              <p className="text-base font-bold text-white mt-1 leading-relaxed">
                Zirve Saatler: <span className="text-indigo-300">{activePlan.peakHours}</span> • Günlük Odak: <span className="text-indigo-300">{activePlan.focusHours} Saat</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {activePlan.techniques?.map((tech) => (
                  <span key={tech} className="bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded-md text-[10px] font-medium text-indigo-300">
                    {tech}
                  </span>
                ))}
              </div>

              {activePlan.chatHistoryId && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => onSelectView("chat", activePlan.chatHistory?.sessionId || activePlan.chatHistoryId)}
                    className="text-[11px] font-semibold px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl transition-all border border-indigo-500/20 flex items-center gap-1.5"
                  >
                    💬 Takvimi Revize Et / Panda ile Konuş
                  </button>
                </div>
              )}
            </div>

            {/* Weekly Schedule */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <span>🗓️</span> Haftalık Program
              </h4>
              <WeeklySchedule
                schedule={activePlan.weeklySchedule || []}
                routines={activePlan.routines || []}
                tips={activePlan.tips || ["Günde en az 3 derin çalışma seansı yapın."]}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
