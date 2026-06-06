"use client";

import { useState, useEffect } from "react";

const MESSAGES = [
  { role: "user", text: "Bu hafta 3 hedef belirlemek istiyorum." },
  {
    role: "ai",
    text: "Harika bir başlangıç. İşte SMART çerçevesinde önerim:\n\n1. Her sabah 20 dk odaklanma\n2. Haftada 3 antrenman\n3. Pazar günü haftalık değerlendirme",
  },
  { role: "user", text: "Mükemmel, hemen başlıyorum!" },
  {
    role: "ai",
    text: "+15 XP kazandın! Seviye 2'ye %72 ilerledin. Yarın sabah 08:00'de hatırlatma kurayım mı?",
  },
];

export default function ProductMockup() {
  const [visible, setVisible] = useState(2);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let idx = 2;
    const run = () => {
      if (idx >= MESSAGES.length) {
        idx = 0;
        setVisible(0);
        setTimeout(run, 1200);
        return;
      }
      if (MESSAGES[idx].role === "ai") {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setVisible((v) => v + 1);
          idx++;
          setTimeout(run, 2200);
        }, 900);
      } else {
        setVisible((v) => v + 1);
        idx++;
        setTimeout(run, 1800);
      }
    };
    const t = setTimeout(run, 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-full max-w-[540px]">
      <div className="absolute -inset-4 rounded-[28px] bg-gradient-to-br from-han-purple/20 via-transparent to-han-blue/10 blur-2xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0a0a14]/90 shadow-[0_32px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div className="flex gap-1.5">
            {["#ef4444", "#f59e0b", "#10b981"].map((c) => (
              <div key={c} className="h-2.5 w-2.5 rounded-full opacity-70" style={{ background: c }} />
            ))}
          </div>
          <span className="ml-2 text-[11px] font-medium text-white/40">LifeCoach AI · HAN 4.2</span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Çevrimiçi
          </span>
        </div>

        <div className="flex">
          {/* Mini sidebar */}
          <div className="hidden w-[130px] shrink-0 border-r border-white/[0.06] bg-white/[0.02] p-3 sm:block">
            <div className="mb-3 flex items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-han-purple to-han-indigo">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <span className="text-[9px] font-bold text-white/70">HAN AI</span>
            </div>
            <div className="mb-2 rounded-lg border border-han-purple/20 bg-han-purple/10 px-2 py-1.5 text-[8px] font-semibold text-violet-300">
              + Yeni Sohbet
            </div>
            <div className="space-y-1">
              {["Hedef Planlama", "Alışkanlık Takibi"].map((t) => (
                <div key={t} className="truncate rounded-md px-2 py-1 text-[8px] text-white/35">
                  {t}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-han-purple/15 bg-han-purple/[0.06] p-2">
              <div className="mb-1 flex justify-between text-[7px] font-bold text-violet-300">
                <span>SEVİYE 2</span>
                <span className="text-white/30">72/100</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-han-purple to-han-blue" />
              </div>
              <div className="mt-1.5 rounded-md border border-han-gold/20 bg-han-gold/10 py-0.5 text-center text-[7px] font-bold text-han-gold">
                Kasa Aç 🪙
              </div>
            </div>
          </div>

          {/* Chat area */}
          <div className="min-w-0 flex-1">
            <div className="flex min-h-[320px] flex-col gap-3 p-4 md:min-h-[360px] md:p-5">
              {MESSAGES.slice(0, visible).map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] ${
                      m.role === "user"
                        ? "bg-gradient-to-br from-cyan-500 to-han-blue"
                        : "bg-gradient-to-br from-han-purple to-han-indigo"
                    }`}
                  >
                    {m.role === "user" ? "M" : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                      </svg>
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed md:text-sm ${
                      m.role === "user"
                        ? "rounded-tr-sm border border-cyan-500/15 bg-cyan-500/10 text-cyan-50"
                        : "rounded-tl-sm border border-white/[0.08] bg-white/[0.04] text-white/80"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-han-purple to-han-indigo">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-1.5 w-1.5 rounded-full bg-violet-400/60" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-xs text-white/25">
                HAN AI&apos;ya bir şey sor...
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-han-purple to-han-indigo text-white">
                ↑
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
