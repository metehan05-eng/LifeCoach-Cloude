"use client";

import { signOut } from "next-auth/react";

export default function UserProfileCard({ user }) {
  const initial = user?.name?.[0]?.toUpperCase() || "M";

  return (
    <div className="flex items-center gap-2.5 border-t border-han-purple/10 bg-han-purple/[0.04] px-3.5 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-han-purple to-han-indigo text-sm font-bold text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]">
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
