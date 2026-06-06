"use client";

import { useRef } from "react";
import { IconStar } from "./icons";

const TESTIMONIALS = [
  {
    name: "Ayşe K.",
    role: "Girişimci",
    initials: "AK",
    color: "from-violet-500 to-purple-600",
    text: "HAN AI ile 3 ayda startup'ımı kurdum. Motivasyonumu hiç kaybetmedim. Gerçekten hayatımı değiştirdi!",
    stars: 5,
  },
  {
    name: "Mehmet D.",
    role: "Yazılım Mühendisi",
    initials: "MD",
    color: "from-blue-500 to-cyan-500",
    text: "Hedef belirleme konusunda çok zorlanıyordum. Artık her hafta net hedeflerim var ve hepsini gerçekleştiriyorum.",
    stars: 5,
  },
  {
    name: "Zeynep A.",
    role: "Öğrenci",
    initials: "ZA",
    color: "from-pink-500 to-rose-500",
    text: "Sınav döneminde HAN AI'nin motivasyon koçluğu olmasaydı başaramazdım. Mükemmel bir asistan!",
    stars: 5,
  },
  {
    name: "Can B.",
    role: "Sporcu",
    initials: "CB",
    color: "from-emerald-500 to-teal-500",
    text: "Antrenman planımı optimize etti, beslenme önerileri sundu. Artık rekorlarımı kırıyorum!",
    stars: 5,
  },
  {
    name: "Elif M.",
    role: "Yönetici",
    initials: "EM",
    color: "from-amber-500 to-orange-500",
    text: "Zaman yönetimi sorunum tamamen çözüldü. Verimlilik seviyem %200 arttı, ciddiyim!",
    stars: 5,
  },
  {
    name: "Emre T.",
    role: "Freelancer",
    initials: "ET",
    color: "from-indigo-500 to-violet-500",
    text: "Müşteri bulma, proje yönetimi, fiyatlandırma — her konuda bana yol gösterdi. Süper!",
    stars: 5,
  },
];

function TestimonialCard({ t, className = "" }) {
  return (
    <div
      className={`flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm transition-colors hover:border-han-purple/20 hover:bg-white/[0.04] ${className}`}
    >
      <div className="mb-3 flex gap-0.5">
        {Array.from({ length: t.stars }).map((_, i) => (
          <IconStar key={i} className="h-3.5 w-3.5 text-han-gold" />
        ))}
      </div>
      <p className="mb-5 flex-1 text-[13px] leading-relaxed text-white/70">
        &ldquo;{t.text}&rdquo;
      </p>
      <div className="flex items-center gap-3 border-t border-white/[0.06] pt-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t.color} text-xs font-bold text-white`}
        >
          {t.initials}
        </div>
        <div>
          <div className="text-sm font-bold text-han-text">{t.name}</div>
          <div className="text-[11px] text-han-muted">{t.role}</div>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  return (
    <section id="testimonials" className="relative z-10 overflow-hidden px-6 py-24 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
          <div className="text-center sm:text-left">
            <span className="mb-4 inline-block rounded-full border border-han-purple/20 bg-han-purple/[0.08] px-3.5 py-1 text-xs font-semibold tracking-wide text-violet-300">
              KULLANICI YORUMLARI
            </span>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-han-text md:text-4xl">
              Hayatları Değiştirenler
            </h2>
          </div>
          <div className="hidden gap-2 lg:flex">
            <button
              type="button"
              onClick={() => scroll(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/50 transition-colors hover:border-han-purple/25 hover:text-white"
              aria-label="Önceki"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/50 transition-colors hover:border-han-purple/25 hover:text-white"
              aria-label="Sonraki"
            >
              →
            </button>
          </div>
        </div>

        {/* Mobile & tablet: carousel */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory lg:hidden"
        >
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} t={t} className="h-full w-[300px] shrink-0 snap-start sm:w-[320px]" />
          ))}
        </div>

        {/* Desktop: clean grid */}
        <div className="hidden gap-4 lg:grid lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} t={t} className="h-full" />
          ))}
        </div>
      </div>
    </section>
  );
}
