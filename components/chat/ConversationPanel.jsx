"use client";

import React, { useState } from 'react';

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const MoreIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const formatRelativeTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today - day) / 86400000);
  if (diffDays === 0) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `Bugün ${hh}:${mm}`;
  }
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return d.toLocaleDateString('tr-TR', { weekday: 'long' });
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
};

const sessionTime = (s) => {
  const lastMsg = s.messages && s.messages.length ? s.messages[s.messages.length - 1] : null;
  return s.updatedAt || lastMsg?.createdAt || s.createdAt || null;
};

export default function ConversationPanel({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onRenameSession,
  onDeleteSession,
  isOpen,
  isMobile = false,
  onClose,
}) {
  const [menuId, setMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const toggleMenu = (id) => {
    setMenuId(prev => (prev === id ? null : id));
    setConfirmDeleteId(null);
  };

  const startRename = (s) => {
    setEditingId(s.id);
    setEditValue(s.title || '');
    setMenuId(null);
    setConfirmDeleteId(null);
  };

  const saveRename = () => {
    if (editingId && editValue.trim()) onRenameSession(editingId, editValue.trim());
    setEditingId(null);
  };

  const handleDelete = (id) => {
    setMenuId(null);
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (confirmDeleteId) onDeleteSession(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  const handleSelect = (id) => {
    setMenuId(null);
    setConfirmDeleteId(null);
    onSelectSession(id);
  };

  return (
    <>
      {isMobile && isOpen && (
        <div
          onClick={() => onClose?.()}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`h-app safe-pt relative z-50 flex shrink-0 flex-col overflow-hidden border-l transition-all duration-300 ${
          !isMobile
            ? isOpen
              ? 'w-[300px] min-w-[300px] max-w-none'
              : 'w-0 min-w-0'
            : 'w-[85vw] min-w-[260px] max-w-[320px]'
        }`}
        style={{
          background: 'var(--chat-sidebar-bg)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3.5" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Konuşmalar
            </div>
            <div className="mt-0.5 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {sessions.length} kayıtlı konuşma
            </div>
          </div>
          <button
            type="button"
            onClick={onNewSession}
            title="Yeni konuşma"
            className="flex items-center gap-1.5 rounded-lg border border-han-purple/25 bg-han-purple/10 px-2.5 py-1.5 text-[11px] font-semibold text-violet-300 transition-colors hover:border-han-purple/50 hover:bg-han-purple/20"
          >
            <PlusIcon /> Yeni
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto [scrollbar-color:rgba(124,58,237,0.2)_transparent] [scrollbar-width:thin]">
          {sessions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="mb-2 text-2xl opacity-40">💬</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Henüz konuşma yok. Yeni bir sohbet başlat.
              </div>
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = activeSessionId === s.id;
              const isHovered = hoveredId === s.id;
              const isEditing = editingId === s.id;
              const isConfirmingDelete = confirmDeleteId === s.id;
              return (
                <div key={s.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => isConfirmingDelete ? null : handleSelect(s.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !isConfirmingDelete) handleSelect(s.id); }}
                    onMouseEnter={() => setHoveredId(s.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="relative flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5 transition-colors"
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(139,92,246,0.16), rgba(99,102,241,0.07))'
                        : isHovered
                          ? 'rgba(255,255,255,0.03)'
                          : 'transparent',
                    }}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full"
                        style={{ background: 'linear-gradient(180deg, #a78bfa, #6366f1)' }} />
                    )}

                    <span className="shrink-0 text-[13px]" style={{ opacity: isActive ? 0.9 : 0.5 }}>
                      {s.messages && s.messages.length ? '🗨️' : '💬'}
                    </span>

                    {isEditing ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename();
                          if (e.key === 'Escape') setEditingId(null);
                          e.stopPropagation();
                        }}
                        onBlur={saveRename}
                        onClick={(e) => e.stopPropagation()}
                        className="min-w-0 flex-1 rounded-md border border-han-purple/40 bg-black/30 px-2 py-1 text-xs font-semibold outline-none"
                        style={{ color: 'var(--text-primary)' }}
                      />
                    ) : (
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate text-xs font-semibold"
                          style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                        >
                          {s.title || 'Sohbet'}
                        </div>
                        <div className="mt-0.5 text-[9.5px]" style={{ color: 'var(--text-muted)' }}>
                          {formatRelativeTime(sessionTime(s))}
                        </div>
                      </div>
                    )}

                    {/* Three-dot menu */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleMenu(s.id); }}
                        className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-white/10"
                        style={{ color: menuId === s.id || isHovered ? 'var(--text-secondary)' : 'transparent' }}
                        title="Seçenekler"
                      >
                        <MoreIcon />
                      </button>
                      {menuId === s.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuId(null); }} />
                          <div
                            className="absolute right-0 top-7 z-20 w-40 overflow-hidden rounded-xl border shadow-xl shadow-black/40"
                            style={{
                              background: 'var(--bg-elevated)',
                              borderColor: 'var(--border-subtle)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => startRename(s)}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium transition-colors hover:bg-white/5"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              <EditIcon /> Yeniden Adlandır
                            </button>
                            <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }} />
                            <button
                              type="button"
                              onClick={() => handleDelete(s.id)}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                            >
                              <TrashIcon /> Sil
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Inline delete confirm */}
                    {isConfirmingDelete && (
                      <div
                        className="absolute inset-0 z-30 flex items-center gap-2 px-3"
                        style={{ background: 'var(--bg-elevated)' }}
                      >
                        <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                          Bu konuşma silinsin mi?
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); confirmDelete(); }}
                          className="ml-auto rounded-md bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/25"
                        >
                          Sil
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                          className="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-white/10"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Vazgeç
                        </button>
                      </div>
                    )}
                  </div>
                  {/* İnce ayırıcı çizgi */}
                  <div className="mx-3.5 border-b" style={{ borderColor: 'var(--border-subtle)' }} />
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
