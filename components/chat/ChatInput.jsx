"use client";
import React, { useRef, useEffect, useState } from 'react';

const QUICK_PROMPTS = [
  '🎯 Hedef belirle',
  '📋 Plan yap',
  '💡 Fikir üret',
  '🧠 Analiz et',
  '🔥 Motive et',
];

export default function ChatInput({ value, onChange, onSend, isLoading }) {
  const textareaRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [rows, setRows] = useState(1);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const newRows = Math.min(6, Math.ceil(ta.scrollHeight / 24));
    setRows(newRows);
    ta.style.height = ta.scrollHeight + 'px';
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!value.trim() || isLoading) return;
    onSend(value.trim());
    onChange('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const charCount = value.length;
  const maxChars = 4000;

  return (
    <div style={{
      borderTop: '1px solid rgba(99,102,241,0.10)',
      background: 'rgba(12,12,24,0.90)',
      backdropFilter: 'blur(30px)',
      padding: '12px 16px 16px',
      flexShrink: 0,
    }}>
      {/* Quick Prompts */}
      <div style={{
        display: 'flex', gap: '7px', marginBottom: '10px',
        overflowX: 'auto', paddingBottom: '2px',
        scrollbarWidth: 'none',
      }}>
        {QUICK_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => { onChange(p.slice(2)); textareaRef.current?.focus(); }}
            style={{
              padding: '5px 12px', borderRadius: '20px', whiteSpace: 'nowrap',
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)',
              color: 'rgba(165,180,252,0.8)', fontSize: '12px', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s ease', flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
              e.currentTarget.style.color = '#a5b4fc';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
              e.currentTarget.style.color = 'rgba(165,180,252,0.8)';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.18)';
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '10px',
        background: focused
          ? 'rgba(26, 26, 46, 0.9)'
          : 'rgba(18, 18, 32, 0.8)',
        border: focused
          ? '1.5px solid rgba(99,102,241,0.45)'
          : '1.5px solid rgba(99,102,241,0.14)',
        borderRadius: '18px',
        padding: '10px 10px 10px 16px',
        transition: 'all 0.25s ease',
        boxShadow: focused
          ? '0 0 0 3px rgba(99,102,241,0.1), 0 4px 30px rgba(99,102,241,0.08)'
          : 'none',
      }}>
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="HAN AI'ya bir şey sor... (Enter = gönder, Shift+Enter = yeni satır)"
          disabled={isLoading}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#e8e8ff', fontSize: '14.5px', lineHeight: '24px',
            resize: 'none', fontFamily: 'Inter, sans-serif',
            minHeight: '24px', maxHeight: '144px',
            overflowY: rows >= 6 ? 'auto' : 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(99,102,241,0.2) transparent',
          }}
        />

        {/* Right Side Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Char counter */}
          {charCount > 100 && (
            <span style={{
              fontSize: '11px', color: charCount > maxChars * 0.9
                ? 'rgba(239,68,68,0.7)'
                : 'rgba(160,160,192,0.4)',
              transition: 'color 0.2s',
            }}>
              {charCount}/{maxChars}
            </span>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!value.trim() || isLoading}
            style={{
              width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
              background: value.trim() && !isLoading
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'rgba(99,102,241,0.12)',
              border: 'none', cursor: value.trim() && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '17px',
              boxShadow: value.trim() && !isLoading
                ? '0 4px 20px rgba(99,102,241,0.4)'
                : 'none',
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: value.trim() && !isLoading ? 'scale(1)' : 'scale(0.9)',
            }}
            onMouseEnter={e => {
              if (value.trim() && !isLoading) e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={e => {
              if (value.trim() && !isLoading) e.currentTarget.style.transform = 'scale(1)';
              else e.currentTarget.style.transform = 'scale(0.9)';
            }}
          >
            {isLoading ? (
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%',
                border: '2px solid rgba(165,180,252,0.3)',
                borderTop: '2px solid #a5b4fc',
                animation: 'spin 0.8s linear infinite',
              }} />
            ) : (
              <span style={{ color: value.trim() ? 'white' : '#4b4b7f' }}>↑</span>
            )}
          </button>
        </div>
      </div>

      {/* Footer hint */}
      <div style={{
        marginTop: '7px', textAlign: 'center',
        fontSize: '11px', color: 'rgba(160,160,192,0.35)',
      }}>
        LifeCoach AI · HAN 4.2 Ultra Core · Kişisel veri paylaşmaktan kaçının
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
}
