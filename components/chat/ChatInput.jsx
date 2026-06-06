"use client";
import React, { useRef, useEffect, useState } from 'react';

export default function ChatInput({ value, onChange, onSend, isLoading, centered = false, isMobile = false, onToggleVision, deepSearch = false, onToggleDeepSearch, goalPlanningMode = false, onToggleGoalPlanning }) {
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
    const newAttachments = await Promise.all(files.map(file => {
      return new Promise((resolve) => {
        const type = file.type;
        const name = file.name;
        const extension = name.split('.').pop().toUpperCase();
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({
            id: Math.random().toString(36).substr(2, 9),
            file, name, extension,
            preview: type.startsWith('image/') ? event.target.result : null,
            type
          });
        };
        if (type.startsWith('image/')) {
          reader.readAsDataURL(file);
        } else {
          resolve({ id: Math.random().toString(36).substr(2, 9), file, name, extension, preview: null, type });
        }
      });
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
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
      case 'MP4': case 'WEBM': case 'MOV': case 'AVI': return { bg: '#6b21a8', icon: '🎬' };
      default: return { bg: '#7f8c8d', icon: '📁' };
    }
  };

  const wrapperPadding = isMobile ? '8px 12px 10px' : centered ? '0' : '16px 20px 20px';

  const wrapperStyle = centered
    ? { width: '100%' }
    : { borderTop: 'none', background: 'transparent', padding: wrapperPadding, flexShrink: 0 };

  return (
    <div style={wrapperStyle}>
      {/* Attachment Preview */}
      {attachments.length > 0 && (
        <div style={{
          display: 'flex', gap: '8px', padding: '8px 0',
          overflowX: 'auto', marginBottom: '6px', flexWrap: 'nowrap',
        }}>
          {attachments.map((at) => (
            <div key={at.id} style={{
              position: 'relative', minWidth: '90px', maxWidth: '90px', height: '64px',
              borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <button
                onClick={() => removeAttachment(at.id)}
                style={{
                  position: 'absolute', top: '3px', right: '3px', width: '18px', height: '18px',
                  borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none',
                  fontSize: '10px', cursor: 'pointer', zIndex: 5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >×</button>
              {at.preview ? (
                <img src={at.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '6px',
                    background: getFileIcon(at.extension).bg, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                  }}>{getFileIcon(at.extension).icon}</div>
                  <div style={{
                    color: 'rgba(255,255,255,0.7)', fontSize: '9px', marginTop: '3px',
                    width: '85%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{at.name}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input box */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: '8px',
        background: focused
          ? 'rgba(18,18,45,0.9)'
          : 'rgba(10,10,30,0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: focused
          ? '1.5px solid rgba(124,58,237,0.4)'
          : '1.5px solid rgba(124,58,237,0.08)',
        borderRadius: isMobile ? '14px' : '16px',
        padding: isMobile ? '4px' : '6px',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: focused
          ? '0 0 0 2px rgba(124,58,237,0.08), 0 0 32px rgba(124,58,237,0.12)'
          : '0 2px 16px rgba(0,0,0,0.25)',
      }}>
        {/* Attachment Button */}
        <button
          onClick={() => fileInputRef.current.click()}
          style={{
            width: isMobile ? '34px' : '38px',
            height: isMobile ? '34px' : '38px',
            borderRadius: '10px', flexShrink: 0,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.05)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease',
            color: 'rgba(255,255,255,0.4)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.12)'; e.currentTarget.style.color = '#a78bfa'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
          title="Dosya Ekle"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,video/mp4,video/webm,video/quicktime,video/x-msvideo"
        />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={centered ? "HAN AI'ya bir şey sor..." : "Bir şey sor..."}
          disabled={isLoading}
          rows={1}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#e0e0ff', fontSize: isMobile ? '14px' : '15px', lineHeight: '22px',
            resize: 'none', fontFamily: 'Geist, Inter, sans-serif',
            fontWeight: '500', letterSpacing: '-0.02em',
            minHeight: '22px', padding: '8px 4px',
            maxHeight: '160px',
            overflowY: 'auto',
            scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.2) transparent',
            caretColor: '#a78bfa',
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!isReady}
          style={{
            width: isMobile ? '34px' : '38px',
            height: isMobile ? '34px' : '38px',
            borderRadius: '10px', flexShrink: 0,
            background: isReady
              ? 'linear-gradient(135deg, #7c3aed, #6366f1)'
              : 'rgba(124,58,237,0.06)',
            border: 'none',
            cursor: isReady ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isReady ? '0 0 16px rgba(124,58,237,0.4)' : 'none',
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            transform: isReady ? 'scale(1)' : 'scale(0.85)',
          }}
          onMouseEnter={e => {
            if (isReady) {
              e.currentTarget.style.transform = 'scale(1.06)';
              e.currentTarget.style.boxShadow = '0 0 24px rgba(124,58,237,0.5)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = isReady ? 'scale(1)' : 'scale(0.85)';
            e.currentTarget.style.boxShadow = isReady ? '0 0 16px rgba(124,58,237,0.4)' : 'none';
          }}
        >
          {isLoading ? (
            <div style={{
              width: '14px', height: '14px', borderRadius: '50%',
              border: '2px solid rgba(167,139,250,0.25)',
              borderTop: '2px solid #a78bfa',
              animation: 'ci-spin 0.8s linear infinite',
            }} />
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke={isReady ? 'white' : 'rgba(124,58,237,0.3)'}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          )}
        </button>
      </div>

      {/* Footer hint */}
      {!isMobile && !centered && (
        <div style={{ marginTop: '6px', textAlign: 'center', fontSize: '10px', color: 'rgba(160,160,200,0.2)' }}>
          LifeCoach AI · HAN 4.2 Ultra Core
        </div>
      )}

      <style>{`
        @keyframes ci-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        textarea::placeholder { color: rgba(160,160,200,0.25); }
      `}</style>
    </div>
  );
}
