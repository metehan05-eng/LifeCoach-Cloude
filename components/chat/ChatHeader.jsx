"use client";
import React from 'react';

export default function ChatHeader({ onToggleSidebar, sidebarOpen, sessionTitle, isMobile }) {
  return (
    <header style={{
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '12px',
      background: 'rgba(6,6,14,0.92)',
      backdropFilter: 'blur(32px)',
      WebkitBackdropFilter: 'blur(32px)',
      borderBottom: '1px solid rgba(99,102,241,0.09)',
      flexShrink: 0,
      position: 'relative',
      zIndex: 20,
    }}>
      {/* Hamburger / sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'Sidebar gizle' : 'Sidebar göster'}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.18)',
          color: '#a5b4fc', cursor: 'pointer', flexShrink: 0,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.22)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
      >
        {/* Hamburger icon lines */}
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          {sidebarOpen && !isMobile
            ? <><line x1="4" y1="4" x2="16" y2="16" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round"/><line x1="16" y1="4" x2="4" y2="16" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round"/></>
            : <><line x1="3" y1="5" x2="17" y2="5" stroke="#a5b4fc" strokeWidth="1.8" strokeLinecap="round"/><line x1="3" y1="10" x2="17" y2="10" stroke="#a5b4fc" strokeWidth="1.8" strokeLinecap="round"/><line x1="3" y1="15" x2="17" y2="15" stroke="#a5b4fc" strokeWidth="1.8" strokeLinecap="round"/></>
          }
        </svg>
      </button>

      {/* Session title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: isMobile ? '13px' : '14px',
          fontWeight: 600, color: '#e0e0ff',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {sessionTitle || 'Yeni Sohbet'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
          <div style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: '#10b981', boxShadow: '0 0 5px rgba(16,185,129,0.8)',
            animation: 'hdr-pulse 2.5s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '10.5px', color: 'rgba(160,160,192,0.55)', fontWeight: 500 }}>
            {isMobile ? 'Çevrimiçi' : 'HAN 4.2 Ultra Core · Çevrimiçi'}
          </span>
        </div>
      </div>

      {/* Model badge — hidden on mobile to save space */}
      {!isMobile && (
        <div style={{
          padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.12))',
          border: '1px solid rgba(99,102,241,0.22)',
          color: '#a5b4fc', whiteSpace: 'nowrap',
        }}>
          Gemini 2.0 Flash
        </div>
      )}

      {/* Settings */}
      <button
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '34px', height: '34px', borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
          color: '#808098', cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontSize: '15px', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e0e0ff'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#808098'; }}
        title="Ayarlar"
      >
        ⚙
      </button>

      <style>{`
        @keyframes hdr-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </header>
  );
}
