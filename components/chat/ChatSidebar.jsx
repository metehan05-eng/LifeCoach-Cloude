"use client";

import React, { useState, useEffect } from "react";
import GamificationPanel from "./ui/GamificationPanel";
import UserProfileCard from "./ui/UserProfileCard";
import { LCLogo } from "@/components/brand";

const groupByDate = (sessions) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const week = new Date(today);
  week.setDate(week.getDate() - 7);
  const groups = { Bugün: [], Dün: [], "Bu Hafta": [], "Daha Eski": [] };
  sessions.forEach((s) => {
    const d = new Date(s.createdAt);
    if (d.toDateString() === today.toDateString()) groups["Bugün"].push(s);
    else if (d.toDateString() === yesterday.toDateString()) groups["Dün"].push(s);
    else if (d >= week) groups["Bu Hafta"].push(s);
    else groups["Daha Eski"].push(s);
  });
  return groups;
};

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export default function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  isOpen,
  onToggle,
  user,
}) {
  const [hoveredId, setHoveredId] = useState(null);
  const [sidebarTab, setSidebarTab] = useState("chats");
  const [mounted, setMounted] = useState(false);
  const [groups, setGroups] = useState(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted) setGroups(groupByDate(sessions));
  }, [mounted, sessions]);

  if (!mounted || !groups) {
    return (
      <aside
        className={`h-screen shrink-0 overflow-hidden bg-han-surface transition-all duration-300 ${
          isOpen ? "w-[280px] min-w-[280px]" : "w-0 min-w-0"
        }`}
      >
        {isOpen && (
          <div className="p-5 text-sm text-white/20">Yükleniyor...</div>
        )}
      </aside>
    );
  }

  return (
    <>
      {isOpen && (
        <div
          onClick={onToggle}
          className="sidebar-overlay fixed inset-0 z-40 hidden bg-black/50 backdrop-blur-sm md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`relative z-50 flex h-screen shrink-0 flex-col overflow-hidden border-r border-han-purple/10 bg-gradient-to-b from-[rgba(8,8,26,0.98)] to-[rgba(12,12,36,0.96)] backdrop-blur-[40px] transition-all duration-300 ${
          isOpen ? "w-[280px] min-w-[280px]" : "w-0 min-w-0"
        }`}
      >
        {/* Logo + New Chat */}
        <div className="flex flex-col gap-2.5 border-b border-han-purple/[0.06] px-4 pb-3 pt-5">
          <LCLogo variant="full" size={36} />

          <button
            type="button"
            onClick={onNewSession}
            className="flex w-full items-center gap-2 rounded-xl border border-han-purple/30 bg-gradient-to-br from-han-purple/20 to-han-indigo/10 px-3.5 py-2.5 text-[13px] font-semibold text-violet-300 transition-all hover:border-han-purple/50 hover:from-han-purple/35 hover:to-han-indigo/20 hover:text-han-text"
          >
            <PlusIcon />
            Yeni Sohbet
          </button>

          <button
            type="button"
            onClick={() => onSelectSession('sifu-panda')}
            className="flex w-full items-center gap-2.5 rounded-xl border border-han-purple/[0.12] bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 px-3.5 py-2.5 text-[13px] font-semibold text-emerald-300 transition-all hover:border-emerald-500/30 hover:from-emerald-500/20 hover:to-emerald-600/10 hover:text-emerald-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
            Sifu Panda
            <span className="ml-auto rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400/80">Sesli</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSession('waffle')}
            className="flex w-full items-center gap-2.5 rounded-xl border border-han-purple/[0.12] bg-gradient-to-br from-amber-500/10 to-amber-600/5 px-3.5 py-2.5 text-[13px] font-semibold text-amber-300 transition-all hover:border-amber-500/30 hover:from-amber-500/20 hover:to-amber-600/10 hover:text-amber-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Waffle Studio
            <span className="ml-auto rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400/80">AI Görsel</span>
          </button>

        </div>

        {/* Tabs */}
        <div className="mb-1.5 flex border-b border-han-purple/[0.06]">
          <button
            type="button"
            onClick={() => {
              setSidebarTab("chats");
              if (activeSessionId) onSelectSession(activeSessionId);
            }}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              sidebarTab === "chats"
                ? "border-b-2 border-han-purple text-han-text"
                : "border-b-2 border-transparent text-han-muted"
            }`}
          >
            Sohbetler
          </button>
          <button
            type="button"
            onClick={() => {
              setSidebarTab("projects");
              onSelectSession("projects");
            }}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              sidebarTab === "projects"
                ? "border-b-2 border-han-blue text-han-text"
                : "border-b-2 border-transparent text-han-muted"
            }`}
          >
            Projelerim
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-2 py-1 [scrollbar-color:rgba(124,58,237,0.2)_transparent] [scrollbar-width:thin]">
          {sidebarTab === "chats" ? (
            Object.entries(groups).map(([label, items]) =>
              items.length === 0 ? null : (
                <div key={label} className="mb-1.5">
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                    {label}
                  </div>
                  {items.map((session) => {
                    const isActive = activeSessionId === session.id;
                    const isHovered = hoveredId === session.id;
                    return (
                      <div
                        key={session.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectSession(session.id)}
                        onKeyDown={(e) => e.key === "Enter" && onSelectSession(session.id)}
                        onMouseEnter={() => setHoveredId(session.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={`mb-0.5 flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all ${
                          isActive
                            ? "border border-han-purple/25 bg-gradient-to-br from-han-purple/18 to-han-indigo/10"
                            : isHovered
                              ? "border border-transparent bg-white/[0.03]"
                              : "border border-transparent"
                        }`}
                      >
                        <span className="shrink-0 text-[13px] opacity-60">
                          {session.messages.length === 0 ? "💬" : "🗨️"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`truncate text-xs font-semibold ${
                              isActive ? "text-han-text" : "text-white/60"
                            }`}
                          >
                            {session.title}
                          </div>
                          <div className="mt-0.5 text-[9.5px] text-white/30">
                            {session.messages.length} mesaj
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )
          ) : (
            <div className="px-2 py-4 text-center text-xs text-white/30">
              Projelerin burada listelenecek
            </div>
          )}
        </div>

        {/* Gamification */}
        <GamificationPanel
          user={user}
          onRanking={() => onSelectSession("leaderboard")}
          onOpenCrate={() => onSelectSession("lootbox")}
        />

        {/* User Profile */}
        <UserProfileCard user={user} />
      </aside>
    </>
  );
}
