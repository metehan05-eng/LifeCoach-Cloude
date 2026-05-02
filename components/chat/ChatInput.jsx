"use client";
import React, { useRef, useEffect, useState } from 'react';

const QUICK_PROMPTS = [
  { emoji: '🎯', label: 'Hedef belirle' },
  { emoji: '📋', label: 'Plan yap' },
  { emoji: '💡', label: 'Fikir üret' },
  { emoji: '🧠', label: 'Analiz et' },
  { emoji: '🔥', label: 'Motive et' },
];

export default function ChatInput({ value, onChange, onSend, isLoading, centered = false, isMobile = false }) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [value]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const type = file.type;
        const name = file.name;
        const extension = name.split('.').pop().toUpperCase();
        
        setAttachments(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          file,
          name,
          extension,
          preview: type.startsWith('image/') ? event.target.result : null,
          type
        }]);
      };
      
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsArrayBuffer(file);
        // Biz sadece UI'da ekli gösteriyoruz, gönderme anında metin ayıklaması yapacağız.
        setAttachments(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          file,
          name,
          extension: file.name.split('.').pop().toUpperCase(),
          preview: null,
          type: file.type
        }]);
      }
    }
    e.target.value = ''; // Reset input
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!value.trim() && attachments.length === 0) || isLoading) return;
    onSend(value.trim(), attachments);
    onChange('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const isReady = (value.trim() || attachments.length > 0) && !isLoading;

  const getFileIcon = (ext) => {
    switch(ext) {
      case 'PPTX': case 'PPT': return { bg: '#c0392b', icon: '📊' };
      case 'DOCX': case 'DOC': return { bg: '#2980b9', icon: '📝' };
      case 'XLSX': case 'XLS': return { bg: '#27ae60', icon: '📈' };
      case 'PDF': return { bg: '#e67e22', icon: '📕' };
      default: return { bg: '#7f8c8d', icon: '📁' };
    }
  };

  const wrapperPadding = isMobile ? '8px 12px 10px' : '12px 20px 14px';

  const wrapperStyle = centered
    ? { width: '100%' }
    : {
        borderTop: '1px solid rgba(99,102,241,0.08)',
        background: 'rgba(3,3,8,0.97)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        padding: wrapperPadding,
        flexShrink: 0,
      };

  return (
    <div style={wrapperStyle}>
      {/* Quick prompts — only in conversation mode on desktop */}
      {!centered && !isMobile && (
        <div style={{
          display: 'flex', gap: '6px', marginBottom: '8px',
          overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none',
        }}>
          {QUICK_PROMPTS.map((p, i) => (
            <button key={i}
              onClick={() => { onChange(p.label); textareaRef.current?.focus(); }}
              style={{
                padding: '5px 13px', borderRadius: '100px', whiteSpace: 'nowrap', flexShrink: 0,
                background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)',
                color: 'rgba(165,180,252,0.75)', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.18)';
                e.currentTarget.style.color = '#a5b4fc';
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.07)';
                e.currentTarget.style.color = 'rgba(165,180,252,0.75)';
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)';
              }}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Attachment Preview Area */}
      {attachments.length > 0 && (
        <div style={{
          display: 'flex', gap: '10px', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)',
          overflowX: 'auto', marginBottom: '8px'
        }}>
          {attachments.map((at) => (
            <div key={at.id} style={{
              position: 'relative', minWidth: '120px', maxWidth: '120px', height: '80px',
              borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              animation: 'ci-pop 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) both'
            }}>
              <button 
                onClick={() => removeAttachment(at.id)}
                style={{
                  position: 'absolute', top: '5px', right: '5px', width: '20px', height: '20px',
                  borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none',
                  fontSize: '12px', cursor: 'pointer', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >×</button>
              
              {at.preview ? (
                <img src={at.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '8px', 
                    background: getFileIcon(at.extension).bg, display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', fontSize: '16px'
                  }}>
                    {getFileIcon(at.extension).icon}
                  </div>
                  <div style={{ 
                    color: 'white', fontSize: '10px', marginTop: '6px', 
                    width: '90%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' 
                  }}>
                    {at.name}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input box */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: '8px',
        background: focused ? 'rgba(22,22,40,0.98)' : 'rgba(12,12,26,0.9)',
        border: focused
          ? '1.5px solid rgba(99,102,241,0.55)'
          : '1.5px solid rgba(99,102,241,0.14)',
        borderRadius: isMobile ? '14px' : '16px',
        padding: isMobile ? '5px' : '8px',
        transition: 'all 0.25s ease',
        boxShadow: focused
          ? '0 0 0 3px rgba(99,102,241,0.1), 0 8px 32px rgba(99,102,241,0.12)'
          : '0 2px 16px rgba(0,0,0,0.3)',
      }}>
        {/* Attachment Toggle Button */}
        <button
          onClick={() => fileInputRef.current.click()}
          style={{
            width: isMobile ? '36px' : '40px',
            height: isMobile ? '36px' : '40px',
            borderRadius: '12px', flexShrink: 0,
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          multiple 
          onChange={handleFileChange}
          accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt"
        />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={centered ? "HAN AI'ya bir şey sor veya dosya at..." : "Bir şey sor..."}
          disabled={isLoading}
          rows={1}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#e8e8ff', fontSize: isMobile ? '14px' : '15px', lineHeight: '22px',
            resize: 'none', fontFamily: 'Inter, sans-serif',
            minHeight: '22px', padding: '10px 4px',
            maxHeight: '160px',
            overflowY: 'auto',
            scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.2) transparent',
            caretColor: '#6366f1',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!isReady}
            style={{
              width: isMobile ? '36px' : '38px',
              height: isMobile ? '36px' : '38px',
              borderRadius: '11px', flexShrink: 0,
              background: isReady
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'rgba(99,102,241,0.1)',
              border: 'none',
              cursor: isReady ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isReady ? '0 4px 16px rgba(99,102,241,0.45)' : 'none',
              transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
              transform: isReady ? 'scale(1)' : 'scale(0.88)',
            }}
            onMouseEnter={e => { if (isReady) e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = isReady ? 'scale(1)' : 'scale(0.88)'; }}
          >
            {isLoading ? (
              <div style={{
                width: '15px', height: '15px', borderRadius: '50%',
                border: '2px solid rgba(165,180,252,0.25)',
                borderTop: '2px solid #a5b4fc',
                animation: 'ci-spin 0.8s linear infinite',
              }} />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke={isReady ? 'white' : '#4b4b7f'}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Footer hint */}
      {!isMobile && (
        <div style={{
          marginTop: '7px', textAlign: 'center',
          fontSize: '10.5px', color: 'rgba(160,160,192,0.25)',
        }}>
          LifeCoach AI · HAN 4.2 Ultra Core · Kişisel veri paylaşmaktan kaçının
        </div>
      )}

      <style>{`
        @keyframes ci-pop {
          from { opacity: 0; transform: scale(0.85) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes ci-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        textarea::placeholder { color: rgba(160,160,200,0.35); }
      `}</style>
    </div>
  );
}
