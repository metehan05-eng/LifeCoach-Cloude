"use client";

/**
 * LifeCoach AI — LC monogram logo
 * Variants: icon | favicon | chat | full | hero
 */

const GRADIENTS = (
  <defs>
    <linearGradient id="lc-purple-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#7c3aed" />
      <stop offset="45%" stopColor="#6366f1" />
      <stop offset="100%" stopColor="#22d3ee" />
    </linearGradient>
    <linearGradient id="lc-glow" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#6d28d9" />
      <stop offset="100%" stopColor="#06b6d4" />
    </linearGradient>
    <linearGradient id="lc-bolt" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#38bdf8" />
      <stop offset="100%" stopColor="#22d3ee" />
    </linearGradient>
    <filter id="lc-soft-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <radialGradient id="lc-bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stopColor="#12122a" />
      <stop offset="100%" stopColor="#060618" />
    </radialGradient>
  </defs>
);

/** LC monogram mark — L + C interlock, head silhouette, lightning */
function LCMark({ simplified = false }) {
  return (
    <g filter={simplified ? undefined : "url(#lc-soft-glow)"}>
      {/* Diamond frame */}
      {!simplified && (
        <rect
          x="24" y="24" width="52" height="52"
          fill="none" stroke="rgba(124,58,237,0.18)" strokeWidth="0.6"
          transform="rotate(45 50 50)"
        />
      )}

      {/* L — vertical stem + foot */}
      <path
        d="M22 68 L22 28 C22 22 20 18 16 16"
        fill="none" stroke="url(#lc-purple-cyan)" strokeWidth="5.5"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M22 68 L40 68"
        fill="none" stroke="url(#lc-purple-cyan)" strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* L particle dust (left) */}
      {!simplified && (
        <g opacity="0.7">
          <circle cx="14" cy="20" r="1.2" fill="#a78bfa" />
          <circle cx="11" cy="26" r="0.9" fill="#8b5cf6" />
          <circle cx="16" cy="32" r="1" fill="#c4b5fd" />
          <circle cx="10" cy="38" r="0.7" fill="#7c3aed" />
          <circle cx="13" cy="44" r="0.8" fill="#a78bfa" opacity="0.6" />
        </g>
      )}

      {/* C — curved around L */}
      <path
        d="M40 68 C52 68 60 58 60 46 C60 34 52 24 40 24 C36 24 32 25 29 27"
        fill="none" stroke="url(#lc-glow)" strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* Human head silhouette on L */}
      <ellipse cx="24" cy="20" rx="5" ry="6" fill="url(#lc-purple-cyan)" opacity="0.95" />
      <path
        d="M19 26 C20 29 23 30 26 29 C28 28 29 26 28 24"
        fill="url(#lc-purple-cyan)" opacity="0.85"
      />

      {/* Lightning bolt */}
      <path
        d="M30 10 L26 18 L30 18 L27 26 L34 15 L30 15 L33 10 Z"
        fill="url(#lc-bolt)"
      />
    </g>
  );
}

/** Favicon — bold simplified LC */
function LCFaviconMark() {
  return (
    <g>
      <path
        d="M18 52 L18 24 L18 24"
        fill="none" stroke="url(#lc-purple-cyan)" strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M18 52 L34 52" fill="none" stroke="url(#lc-purple-cyan)" strokeWidth="6" strokeLinecap="round" />
      <path
        d="M34 52 C44 52 50 44 50 34 C50 24 42 18 34 18"
        fill="none" stroke="url(#lc-glow)" strokeWidth="6" strokeLinecap="round"
      />
      <path d="M28 12 L24 20 L28 20 L25 28 L32 17 L28 17 L30 12 Z" fill="url(#lc-bolt)" />
    </g>
  );
}

export default function LCLogo({
  variant = "icon",
  className = "",
  size,
}) {
  const sizes = {
    favicon: 32,
    icon: 40,
    chat: 56,
    hero: 80,
    full: 48,
  };

  const dim = size || sizes[variant] || 40;

  if (variant === "full") {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        <svg width={dim} height={dim} viewBox="0 0 100 100" fill="none" aria-hidden="true">
          {GRADIENTS}
          <rect width="100" height="100" rx="22" fill="url(#lc-bg)" />
          <LCMark />
        </svg>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            LifeCoach <span className="text-violet-500 dark:text-violet-300">AI</span>
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
            HAN 4.2 Ultra Core
          </span>
        </div>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          fill="none"
          className="drop-shadow-[0_0_40px_rgba(124,58,237,0.45)]"
          aria-hidden="true"
        >
          {GRADIENTS}
          <rect width="100" height="100" rx="24" fill="url(#lc-bg)" />
          <rect width="100" height="100" rx="24" fill="none" stroke="rgba(124,58,237,0.25)" strokeWidth="1" />
          <LCMark />
        </svg>
        <span className="mt-4 text-lg font-semibold tracking-wide" style={{ color: 'var(--text-primary)' }}>LifeCoach AI</span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
          HAN 4.2 Ultra Core
        </span>
      </div>
    );
  }

  const simplified = variant === "favicon";
  const viewBox = "0 0 100 100";
  const radius = variant === "favicon" ? 20 : 22;

  return (
    <svg
      width={dim}
      height={dim}
      viewBox={viewBox}
      fill="none"
      className={className}
      role="img"
      aria-label="LifeCoach AI"
    >
      {GRADIENTS}
      <rect width="100" height="100" rx={radius} fill="url(#lc-bg)" />
      {variant !== "favicon" && (
        <rect width="100" height="100" rx={radius} fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth="0.8" />
      )}
      {simplified ? <LCFaviconMark /> : <LCMark simplified={false} />}
    </svg>
  );
}
