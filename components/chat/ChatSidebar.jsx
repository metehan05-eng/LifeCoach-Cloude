"use client";
import React, { useState } from 'react';
import { signOut } from 'next-auth/react';

const formatTime = (date) =>
  new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

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
  const groups = groupByDate(sessions);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={onToggle}
          style={{
            display: 'none',
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
          className="sidebar-overlay"
        />
      )}

      <aside style={{
        width: isOpen ? '280px' : '0',
        minWidth: isOpen ? '280px' : '0',
        overflow: 'hidden',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(12, 12, 24, 0.95)',
        backdropFilter: 'blur(40px)',
        borderRight: '1px solid rgba(99,102,241,0.12)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 50,
      }}>
        <div style={{
          padding: '20px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          borderBottom: '1px solid rgba(99,102,241,0.08)',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
            }}>⚡</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.3px' }}>LifeCoach AI</div>
              <div style={{ fontSize: '11px', color: 'rgba(99,102,241,0.8)', fontWeight: 500 }}>HAN 4.2 Ultra Core</div>
            </div>
          </div>

          {/* Waffle AI Button */}
          <button
            onClick={() => onSelectSession('waffle')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 14px', borderRadius: '12px',
              background: activeSessionId === 'waffle' 
                ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                : 'rgba(245, 158, 11, 0.08)',
              border: activeSessionId === 'waffle'
                ? '1px solid #fbbf24'
                : '1px solid rgba(245, 158, 11, 0.2)',
              color: activeSessionId === 'waffle' ? '#fff' : '#fbbf24', 
              fontWeight: 700, fontSize: '13.5px',
              cursor: 'pointer', width: '100%',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: activeSessionId === 'waffle' ? '0 4px 15px rgba(245, 158, 11, 0.4)' : 'none'
            }}
            onMouseEnter={e => {
              if (activeSessionId !== 'waffle') {
                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={e => {
              if (activeSessionId !== 'waffle') {
                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <span style={{ fontSize: '18px' }}>🧇</span>
            Waffle AI Studio
          </button>

          {/* New Chat Button */}
          <button
            onClick={onNewSession}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
              border: '1px solid rgba(99,102,241,0.25)',
              color: '#a5b4fc', fontWeight: 600, fontSize: '13.5px',
              cursor: 'pointer', width: '100%',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
              e.currentTarget.style.color = '#c4b5fd';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
              e.currentTarget.style.color = '#a5b4fc';
            }}
          >
            <span style={{ fontSize: '16px' }}>✦</span>
            Yeni Sohbet
            <span style={{ marginLeft: 'auto', fontSize: '11px', opacity: 0.6 }}>⌘N</span>
          </button>
        </div>

        {/* Sessions List */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '8px',
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.2) transparent',
        }}>
          {Object.entries(groups).map(([label, items]) =>
            items.length === 0 ? null : (
              <div key={label} style={{ marginBottom: '8px' }}>
                <div style={{
                  fontSize: '10.5px', fontWeight: 700, letterSpacing: '1px',
                  color: 'rgba(160,160,192,0.5)', textTransform: 'uppercase',
                  padding: '8px 8px 4px',
                }}>
                  {label}
                </div>
                {items.map(session => (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    onMouseEnter={() => setHoveredId(session.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 10px', borderRadius: '10px',
                      cursor: 'pointer', marginBottom: '2px',
                      background: activeSessionId === session.id
                        ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.12))'
                        : hoveredId === session.id
                          ? 'rgba(255,255,255,0.04)'
                          : 'transparent',
                      border: activeSessionId === session.id
                        ? '1px solid rgba(99,102,241,0.3)'
                        : '1px solid transparent',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <span style={{ fontSize: '14px', flexShrink: 0, opacity: 0.7 }}>
                      {session.messages.length === 0 ? '💬' : '🗨️'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px', fontWeight: 500,
                        color: activeSessionId === session.id ? '#e0e0ff' : '#a0a0c0',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {session.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(160,160,192,0.4)', marginTop: '1px' }}>
                        {session.messages.length} mesaj
                      </div>
                    </div>
                    {hoveredId === session.id && sessions.length > 1 && (
                      <button
                        onClick={e => { e.stopPropagation(); onDeleteSession(session.id); }}
                        style={{
                          padding: '3px 6px', borderRadius: '6px', border: 'none',
                          background: 'rgba(239,68,68,0.15)', color: '#f87171',
                          cursor: 'pointer', fontSize: '11px', flexShrink: 0,
                        }}
                      >✕</button>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Bottom */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(99,102,241,0.08)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          {user?.image ? (
            <img 
              src={user.image} 
              alt={user.name} 
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
            />
          ) : (
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', flexShrink: 0,
            }}>
              {user?.name?.[0] || '👤'}
            </div>
          )}
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: '13px', fontWeight: 600, 
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
            }}>
              {user?.name || 'Kullanıcı'}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(99,102,241,0.7)', fontWeight: 500 }}>
              {user?.email ? 'Premium Plan' : 'Ücretsiz Plan'}
            </div>
          </div>

          <button 
            onClick={() => signOut({ callbackUrl: '/' })}
            title="Çıkış Yap"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'rgba(239,68,68,0.6)', fontSize: '16px', padding: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(239,68,68,0.6)'}
          >
            ↪
          </button>
        </div>
      </aside>
    </>
  );
}
