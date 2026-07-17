"use client";

const TrophyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3" /><path d="M12 2v6" /><path d="M18 18l-2-4" /><path d="M6 18l2-4" />
  </svg>
);

const CrateIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
    <path d="M3 10v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M12 3v7" /><path d="M9 17l3-3 3 3" />
  </svg>
);

const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
  </svg>
);

export default function GamificationPanel({ user, onRanking, onOpenCrate }) {
  const level = user?.level || 1;
  const xpInLevel = user?.totalXp ? user.totalXp % 100 : 0;

  return (
    <div className="mx-3 mb-2.5 rounded-2xl border border-han-purple/15 p-3.5 shadow-[0_4px_24px_rgba(124,58,237,0.06)] backdrop-blur-xl"
      style={{ background: 'var(--bg-elevated)' }}>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-han-purple-light">
          <StarIcon />
          SEVİYE {level}
        </div>
        <span className="text-[9.5px] font-semibold" style={{ color: 'var(--text-muted)' }}>
          {xpInLevel}/100 XP
        </span>
      </div>

      <div className="mb-3 h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--border-subtle)' }}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-han-purple via-han-purple-light to-han-indigo shadow-[0_0_8px_rgba(124,58,237,0.4)] transition-all duration-500"
          style={{ width: `${xpInLevel}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onRanking}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-han-indigo/15 bg-han-indigo/[0.08] px-2 py-2 text-[11px] font-bold text-indigo-300 transition-colors hover:border-han-indigo/30 hover:bg-han-indigo/15 hover:text-indigo-200"
        >
          <TrophyIcon />
          Sıralama
        </button>
        <button
          type="button"
          onClick={onOpenCrate}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-han-gold/25 bg-gradient-to-br from-han-gold/10 to-han-gold-dark/[0.06] px-2 py-2 text-[11px] font-extrabold text-han-gold shadow-glow-gold transition-all hover:border-han-gold/40 hover:from-han-gold/20 hover:to-han-gold-dark/10"
        >
          <CrateIcon />
          Kasa Aç ({user?.han_coins || 0} 🪙)
        </button>
      </div>
    </div>
  );
}
