"use client";

import { signOut } from "next-auth/react";

const SettingsIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export default function UserProfileCard({ user, onOpenSettings }) {
  const initial = user?.name?.[0]?.toUpperCase() || "M";

  return (
    <div className="lc-profile-card flex items-center gap-2.5 border-t border-han-purple/10 bg-han-purple/[0.04] px-3.5 py-2.5">
      {/* Sol: Avatar + İsim — tıklanınca Settings açılır */}
      <button
        type="button"
        onClick={onOpenSettings}
        className="lc-profile-trigger group flex flex-1 items-center gap-2.5 text-left"
        title="Ayarları Aç"
      >
        <div className="lc-profile-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-han-purple to-han-indigo text-sm font-bold text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold text-han-text">
            {user?.name || "Kullanıcı"}
          </div>
          <div className={`mt-0.5 text-[9px] font-bold ${user?.isPremium ? "text-han-gold" : "text-han-muted"}`}>
            {user?.isPremium ? "👑 Premium" : "✦ Free"}
          </div>
        </div>
        <span className="lc-profile-settings-icon text-han-muted opacity-0 transition-opacity group-hover:opacity-100">
          <SettingsIcon />
        </span>
      </button>

      {/* Sağ: Çıkış Düğmesi */}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-none bg-red-500/10 text-sm text-red-400/60 transition-colors hover:bg-red-500/15 hover:text-red-400"
        title="Çıkış Yap"
      >
        ↪
      </button>
    </div>
  );
}
