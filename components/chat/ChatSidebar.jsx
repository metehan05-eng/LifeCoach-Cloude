"use client";
import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';

const groupByDate = (sessions) => {
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const week = new Date(today); week.setDate(week.getDate() - 7);
  const groups = { Bugün: [], Dün: [], 'Bu Hafta': [], 'Daha Eski': [] };
  sessions.forEach(s => {
    const d = new Date(s.createdAt);
    if (d.toDateString() === today.toDateString()) groups['Bugün'].push(s);
    else if (d.toDateString() === yesterday.toDateString()) groups['Dün'].push(s);
    else if (d >= week) groups['Bu Hafta'].push(s);
    else groups['Daha Eski'].push(s);
  });
  return groups;
};

export default function ChatSidebar({
  sessions, activeSessionId, onSelectSession,
  onNewSession, onDeleteSession, isOpen, onToggle, user
}) {
  const [hoveredId, setHoveredId] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('chats');
  const [mounted, setMounted] = useState(false);
  const [groups, setGroups] = useState(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
  }, []);
  useEffect(() => {
    if (mounted) setGroups(groupByDate(sessions));
  }, [mounted, sessions]);

  if (!mounted || !groups) {
    return (
      <aside style={{
        width: isOpen ? '280px' : '0',
        minWidth: isOpen ? '280px' : '0',
        overflow: 'hidden', height: '100vh',
        background: '#08081a',
        transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
      }}>
        {isOpen && <div style={{ padding: '20px', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>Yükleniyor...</div>}
      </aside>
    );
  }

  const xpPercent = user?.totalXp ? user.totalXp % 100 : 0;

  return (
    <>
      {isOpen && (
        <div onClick={onToggle} style={{
          display: 'none', position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        }} className="sidebar-overlay" />
      )}

      <aside style={{
        width: isOpen ? '280px' : '0',
        minWidth: isOpen ? '280px' : '0',
        overflow: 'hidden',
        transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, rgba(8,8,26,0.98) 0%, rgba(12,12,36,0.96) 100%)',
        backdropFilter: 'blur(40px)',
        borderRight: '1px solid rgba(99,102,241,0.1)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 50,
      }}>
        {/* Logo + New Chat */}
        <div style={{
          padding: '20px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          borderBottom: '1px solid rgba(99,102,241,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '17px',
              boxShadow: '0 0 20px rgba(124,58,237,0.5), 0 0 40px rgba(99,102,241,0.15)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.3px', color: '#e0e0ff' }}>LifeCoach AI</div>
              <div style={{ fontSize: '10px', color: 'rgba(124,58,237,0.7)', fontWeight: 600, letterSpacing: '0.3px' }}>HAN 4.2 ULTRA CORE</div>
            </div>
          </div>

          <button
            onClick={onNewSession}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.12))',
              border: '1px solid rgba(124,58,237,0.3)',
              color: '#c4b5fd', fontWeight: 600, fontSize: '13px',
              cursor: 'pointer', width: '100%',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(99,102,241,0.2))';
              e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)';
              e.currentTarget.style.color = '#e0e0ff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.12))';
              e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)';
              e.currentTarget.style.color = '#c4b5fd';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Yeni Sohbet
          </button>
        </div>

        {/* Tabs - Sohbetler / Waffle */}
        <div style={{
          display: 'flex', borderBottom: '1px solid rgba(99,102,241,0.06)', marginBottom: '6px',
        }}>
          <button
            onClick={() => { setSidebarTab('chats'); if (activeSessionId) onSelectSession(activeSessionId); }}
            style={{
              flex: 1, padding: '10px', fontSize: '12px', fontWeight: 600,
              color: sidebarTab === 'chats' ? '#e0e0ff' : 'rgba(160,160,200,0.4)',
              borderBottom: sidebarTab === 'chats' ? '2px solid #7c3aed' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >Sohbetler</button>
          <button
            onClick={() => { setSidebarTab('waffle'); onSelectSession('waffle'); }}
            style={{
              flex: 1, padding: '10px', fontSize: '12px', fontWeight: 600,
              color: sidebarTab === 'waffle' ? '#fbbf24' : 'rgba(160,160,200,0.4)',
              borderBottom: sidebarTab === 'waffle' ? '2px solid #fbbf24' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >🧇 Waffle</button>
        </div>

        {/* Chat History */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '4px 8px',
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.2) transparent',
        }}>
          {sidebarTab === 'chats' ? (
            Object.entries(groups).map(([label, items]) =>
              items.length === 0 ? null : (
                <div key={label} style={{ marginBottom: '6px' }}>
                  <div style={{
                    fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px',
                    color: 'rgba(160,160,200,0.35)', textTransform: 'uppercase',
                    padding: '6px 8px 4px',
                  }}>{label}</div>
                  {items.map(session => (
                    <div
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      onMouseEnter={() => setHoveredId(session.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 10px', borderRadius: '10px',
                        cursor: 'pointer', marginBottom: '1px',
                        background: activeSessionId === session.id
                          ? 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(99,102,241,0.1))'
                          : hoveredId === session.id ? 'rgba(255,255,255,0.03)' : 'transparent',
                        border: activeSessionId === session.id
                          ? '1px solid rgba(124,58,237,0.25)'
                          : '1px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '13px', flexShrink: 0, opacity: 0.6 }}>
                        {session.messages.length === 0 ? '💬' : '🗨️'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '12.5px', fontWeight: 600,
                          color: activeSessionId === session.id ? '#e0e0ff' : 'rgba(180,180,220,0.7)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{session.title}</div>
                        <div style={{ fontSize: '9.5px', color: 'rgba(160,160,200,0.35)', marginTop: '1px' }}>
                          {session.messages.length} mesaj
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )
          ) : (
            <div style={{ padding: '16px 8px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontSize: '12px' }}>
              🧇 Waffle Studio ile<br />görsel içerik oluştur
            </div>
          )}
        </div>

        {/* Gamification Panel */}
        <div style={{
          margin: '0 12px 10px',
          padding: '14px',
          borderRadius: '16px',
          background: 'rgba(124,58,237,0.06)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(124,58,237,0.12)',
          boxShadow: '0 4px 24px rgba(124,58,237,0.06)',
        }}>
          {/* Level & XP */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '11px', fontWeight: 800,
              color: '#a78bfa',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
              </svg>
              SEVİYE {user?.level || 1}
            </div>
            <span style={{ fontSize: '9.5px', color: 'rgba(167,139,250,0.5)', fontWeight: 600 }}>
              {xpPercent}/100 XP
            </span>
          </div>
          <div style={{
            width: '100%', height: '4px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '10px', overflow: 'hidden',
            marginBottom: '12px',
          }}>
            <div style={{
              width: `${xpPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #6366f1)',
              borderRadius: '10px',
              transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: '0 0 8px rgba(124,58,237,0.4)',
            }} />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => onSelectSession('leaderboard')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '8px', borderRadius: '10px', width: '100%',
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.15)',
                color: '#a5b4fc', fontSize: '11px', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.color = '#c4b5fd'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = '#a5b4fc'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="3" /><path d="M12 2v6" /><path d="M18 18l-2-4" /><path d="M6 18l2-4" />
              </svg>
              Sıralama
            </button>
            <button
              onClick={() => onSelectSession('lootbox')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '8px', borderRadius: '10px', width: '100%',
                background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.06))',
                border: '1px solid rgba(251,191,36,0.2)',
                color: '#fbbf24', fontSize: '11px', fontWeight: 800,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.12))'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.06))'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.2)'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" /><path d="M3 10v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M12 3v7" /><path d="M9 17l3-3 3 3" />
              </svg>
              Kasa Aç ({user?.han_coins || 0})
            </button>
          </div>
        </div>

        {/* User Profile */}
        <div style={{
          padding: '10px 14px',
          borderTop: '1px solid rgba(99,102,241,0.06)',
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(124,58,237,0.04)',
        }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', flexShrink: 0,
            boxShadow: '0 0 12px rgba(124,58,237,0.3)',
          }}>
            {user?.name?.[0] || '👤'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '12.5px', fontWeight: 700,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              color: '#e0e0ff',
            }}>
              {user?.name || 'Kullanıcı'}
            </div>
            <div style={{
              fontSize: '9px', fontWeight: 700, marginTop: '2px',
              color: user?.isPremium ? '#fbbf24' : 'rgba(160,160,200,0.5)',
            }}>
              {user?.isPremium ? '👑 Premium' : '✦ Free'}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              background: 'rgba(239,68,68,0.08)', border: 'none',
              borderRadius: '8px', width: '30px', height: '30px',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'rgba(239,68,68,0.5)',
              fontSize: '14px', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = 'rgba(239,68,68,0.5)'; }}
          >↪</button>
        </div>
      </aside>
    </>
  );
}
