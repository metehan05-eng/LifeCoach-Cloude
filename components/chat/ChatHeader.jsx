"use client";
import React from 'react';

export default function ChatHeader({ onToggleSidebar, sidebarOpen, sessionTitle }) {
  return (
    <header style={{
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: '14px',
      background: 'rgba(12, 12, 24, 0.80)',
      backdropFilter: 'blur(30px)',
      borderBottom: '1px solid rgba(99,102,241,0.10)',
      flexShrink: 0,
      position: 'relative',
      zIndex: 20,
    }}>
      {/* Toggle Sidebar */}
      <button
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'Sidebar gizle' : 'Sidebar göster'}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
          color: '#a5b4fc', cursor: 'pointer', flexShrink: 0,
          transition: 'all 0.2s ease',
          fontSize: '18px',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.22)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      {/* Title Area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14.5px', fontWeight: 600,
          color: '#e0e0ff',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {sessionTitle || 'Yeni Sohbet'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.7)',
            animation: 'pulse-dot 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '11.5px', color: 'rgba(160,160,192,0.6)', fontWeight: 500 }}>
            HAN 4.2 Ultra Core · Çevrimiçi
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Model Badge */}
        <div style={{
          padding: '5px 12px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
          border: '1px solid rgba(99,102,241,0.25)',
          color: '#a5b4fc',
          letterSpacing: '0.3px',
        }}>
          Gemini 2.0 Flash
        </div>

        {/* Settings */}
        <button
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#a0a0c0', cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '15px',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e0e0ff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#a0a0c0'; }}
          title="Ayarlar"
        >
          ⚙
        </button>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>
    </header>
  );
}
