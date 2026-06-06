"use client";

import React, { useState, useEffect } from "react";

export default function ChatHeader({
  onToggleSidebar,
  sidebarOpen,
  sessionTitle,
  isMobile,
  onConvertToProject,
  onOpenSettings,
}) {
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-han-purple/[0.06] bg-[rgba(6,6,18,0.9)] px-4 backdrop-blur-[32px]">
      <button
        type="button"
        onClick={onToggleSidebar}
        title={sidebarOpen ? "Sidebar gizle" : "Sidebar göster"}
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl border border-han-purple/15 bg-han-purple/[0.08] text-han-purple-light transition-colors hover:bg-han-purple/20"
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          {mounted && sidebarOpen && !isMobile ? (
            <>
              <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <>
              <line x1="3" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="3" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-han-text md:text-[14px]">
          {sessionTitle || "Yeni Sohbet"}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <div className="h-[5px] w-[5px] animate-pulse-dot rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
          <span className="text-[10px] font-medium text-han-muted">
            {isMobile ? "Çevrimiçi" : "HAN 4.2 Ultra Core · Çevrimiçi"}
          </span>
        </div>
      </div>

      {!isMobile && (
        <div className="whitespace-nowrap rounded-full border border-han-purple/20 bg-gradient-to-br from-han-purple/15 to-han-indigo/10 px-3 py-1 text-[10.5px] font-semibold text-han-purple-light">
          HAN 4.2 Ultra Core
        </div>
      )}

      <button
        type="button"
        onClick={() => onConvertToProject?.()}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-han-purple/15 bg-han-purple/[0.08] text-sm text-han-purple-light transition-colors hover:bg-han-purple/20 hover:text-violet-200"
        title="Bu Sohbeti Projeye Dönüştür"
      >
        📁
      </button>

      <button
        type="button"
        onClick={() => setShowComingSoon(true)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/25 bg-violet-500/10 text-sm text-violet-300 transition-colors hover:bg-violet-500/20 hover:text-han-text"
        title="HAN Code IDE"
      >
        ⚔️
      </button>

      <button
        type="button"
        onClick={() => onOpenSettings?.()}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-sm text-han-muted transition-colors hover:bg-white/[0.06] hover:text-han-text"
        title="Ayarlar"
      >
        ⚙
      </button>

      {showComingSoon && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70"
          onClick={() => setShowComingSoon(false)}
        >
          <div
            className="w-[90%] max-w-sm rounded-2xl border border-han-purple/25 bg-gradient-to-br from-han-purple/15 to-han-indigo/10 p-8 text-center backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-5xl">⚔️</div>
            <h2 className="mb-3 bg-gradient-to-r from-han-purple to-han-indigo bg-clip-text text-2xl font-bold text-transparent">
              Coming Soon
            </h2>
            <h3 className="mb-4 text-xl font-semibold text-violet-300">Han Code</h3>
            <p className="mb-6 text-sm leading-relaxed text-white/70">
              Elite AI Software Engineer. Mobil, web, desktop, backend — her şeyi yapabilir.
            </p>
            <button
              type="button"
              onClick={() => setShowComingSoon(false)}
              className="rounded-xl bg-gradient-to-r from-han-purple to-han-indigo px-8 py-3 text-sm font-semibold text-white transition-transform hover:scale-105"
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
