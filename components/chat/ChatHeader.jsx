"use client";

import React, { useState, useEffect } from "react";
import { useAppTheme } from "@/hooks/useAppTheme";

function ThemeIcon({ theme }) {
  if (theme === "light") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export default function ChatHeader({
  onToggleSidebar,
  sidebarOpen,
  sessionTitle,
  isMobile,
  onOpenSettings,
  onOpenVision,
}) {
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme, mounted: themeMounted } = useAppTheme();

  useEffect(() => setMounted(true), []);

  const btnClass =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors md:h-8 md:w-8";

  return (
    <header
      className="safe-pt safe-px relative z-20 flex min-h-14 shrink-0 items-center gap-3 border-b px-3 backdrop-blur-[32px] sm:px-4"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--chat-header-bg)",
      }}
    >
      <button
        type="button"
        onClick={onToggleSidebar}
        title={sidebarOpen ? "Sidebar gizle" : "Sidebar göster"}
        className={`${btnClass} border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]`}
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
        <div
          className="truncate text-sm font-semibold md:text-[14px]"
          style={{ color: "var(--text-primary)" }}
        >
          {sessionTitle || "Yeni Sohbet"}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <div className="h-[5px] w-[5px] animate-pulse-dot rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
          <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            Çevrimiçi
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {onOpenVision && (
          <button
            type="button"
            onClick={onOpenVision}
            className={`${btnClass} border-indigo-500/25 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20`}
            title="HAN Vision — Yüz Analizi"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}

        {themeMounted && (
          <button
            type="button"
            onClick={toggleTheme}
            className={`${btnClass} border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]`}
            title={theme === "dark" ? "Açık tema" : "Koyu tema"}
          >
            <ThemeIcon theme={theme} />
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpenSettings?.()}
          className={`${btnClass} border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]`}
          title="Ayarlar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </header>
  );
}
