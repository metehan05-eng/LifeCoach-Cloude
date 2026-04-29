"use client";
import React, { useEffect, useRef } from 'react';

const TypingIndicator = () => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '4px 0' }}>
    {/* Avatar */}
    <div style={{
      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '16px', boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
    }}>⚡</div>
    <div style={{
      background: 'rgba(22,22,42,0.8)',
      border: '1px solid rgba(99,102,241,0.15)',
      borderRadius: '4px 18px 18px 18px',
      padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: '5px',
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: '#6366f1',
          animation: `typing-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  </div>
);

const formatMarkdown = (text) => {
  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Code inline
  text = text.replace(/`([^`]+)`/g, '<code style="background:rgba(99,102,241,0.2);padding:2px 6px;border-radius:5px;font-size:12.5px;font-family:monospace">$1</code>');
  // Headings
  text = text.replace(/^### (.*$)/gm, '<h3 style="font-size:15px;font-weight:700;margin:10px 0 4px;color:#c4b5fd">$1</h3>');
  text = text.replace(/^## (.*$)/gm, '<h2 style="font-size:17px;font-weight:700;margin:12px 0 5px;color:#a5b4fc">$1</h2>');
  text = text.replace(/^# (.*$)/gm, '<h1 style="font-size:20px;font-weight:800;margin:14px 0 6px;color:#818cf8">$1</h1>');
  // Lists
  text = text.replace(/^[\*\-] (.*$)/gm, '<div style="display:flex;gap:8px;margin:2px 0"><span style="color:#6366f1;margin-top:2px">◆</span><span>$1</span></div>');
  // Numbered
  text = text.replace(/^\d+\. (.*$)/gm, '<div style="display:flex;gap:8px;margin:2px 0"><span style="color:#8b5cf6;font-weight:600;min-width:16px">•</span><span>$1</span></div>');
  // Line breaks
  text = text.replace(/\n\n/g, '<br/><br/>');
  text = text.replace(/\n/g, '<br/>');
  return text;
};

function MessageBubble({ message, isStream }) {
  const isUser = message.role === 'user';

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '4px 0',
      animation: 'slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      maxWidth: '100%',
    }}>
      {/* Avatar */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
        background: isUser
          ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
          : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '15px',
        boxShadow: isUser
          ? '0 4px 16px rgba(6,182,212,0.3)'
          : '0 4px 16px rgba(99,102,241,0.35)',
      }}>
        {isUser ? '👤' : '⚡'}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: 'min(72%, 700px)',
        background: isUser
          ? 'linear-gradient(135deg, rgba(6,182,212,0.18), rgba(59,130,246,0.12))'
          : 'rgba(22,22,42,0.75)',
        border: isUser
          ? '1px solid rgba(6,182,212,0.25)'
          : '1px solid rgba(99,102,241,0.14)',
        borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
        padding: '13px 18px',
        backdropFilter: 'blur(10px)',
        position: 'relative',
      }}>
        {/* Role label */}
        <div style={{
          fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: isUser ? 'rgba(6,182,212,0.7)' : 'rgba(99,102,241,0.7)',
          marginBottom: '6px',
        }}>
          {isUser ? 'Sen' : 'HAN AI'}
          {isStream && <span style={{ marginLeft: '6px', animation: 'pulse 1s infinite' }}>▊</span>}
        </div>

        {/* Content */}
        {isUser ? (
          <div style={{ fontSize: '14.5px', lineHeight: 1.65, color: '#e8e8ff' }}>
            {message.content}
          </div>
        ) : (
          <div
            style={{ fontSize: '14.5px', lineHeight: 1.7, color: '#d0d0f0' }}
            dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
          />
        )}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  { icon: '🎯', text: 'Hedef belirleme stratejisi', sub: 'Uzun vadeli plan' },
  { icon: '🧠', text: 'Üretkenlik sistemi kur', sub: 'Deep work yöntemleri' },
  { icon: '💡', text: 'Karar vermede yardım et', sub: 'Mantıksal analiz' },
  { icon: '🚀', text: 'Startup fikrim var', sub: 'Değerlendirme & yol haritası' },
];

export default function ChatMessages({ messages, isTyping, streamText, error }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, streamText]);

  const isEmpty = messages.length === 0 && !isTyping;

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(99,102,241,0.2) transparent',
    }}>
      {/* Empty State */}
      {isEmpty && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '28px',
          padding: '40px 20px',
          animation: 'fade-in 0.5s ease',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '24px', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '36px',
              boxShadow: '0 0 40px rgba(99,102,241,0.4), 0 0 80px rgba(139,92,246,0.2)',
              animation: 'pulse-glow 3s ease-in-out infinite',
            }}>⚡</div>
            <h2 style={{
              fontSize: '26px', fontWeight: 800,
              background: 'linear-gradient(135deg, #818cf8, #c4b5fd, #67e8f9)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: '8px',
            }}>
              Merhaba! Ben HAN AI
            </h2>
            <p style={{ color: 'rgba(160,160,192,0.7)', fontSize: '14.5px', maxWidth: '380px' }}>
              Hedeflerine ulaşmana yardım etmek için buradayım. Seninle birlikte büyüyorum.
            </p>
          </div>

          {/* Suggestions */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '10px', width: '100%', maxWidth: '520px',
          }}>
            {SUGGESTIONS.map((s, i) => (
              <div key={i} style={{
                padding: '14px 16px', borderRadius: '14px',
                background: 'rgba(22,22,42,0.7)',
                border: '1px solid rgba(99,102,241,0.15)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'flex-start', gap: '10px',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(99,102,241,0.12)';
                  e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(22,22,42,0.7)';
                  e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#d0d0f0', marginBottom: '2px' }}>{s.text}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(160,160,192,0.5)' }}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* Streaming message */}
      {isTyping && streamText && (
        <MessageBubble
          message={{ role: 'assistant', content: streamText, id: 'stream' }}
          isStream
        />
      )}

      {/* Typing indicator (before text appears) */}
      {isTyping && !streamText && <TypingIndicator />}

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: '12px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#f87171', fontSize: '13.5px', display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          <span>⚠️</span> {error}
        </div>
      )}

      <div ref={bottomRef} />

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 40px rgba(99,102,241,0.4), 0 0 80px rgba(139,92,246,0.2); }
          50% { box-shadow: 0 0 60px rgba(99,102,241,0.6), 0 0 120px rgba(139,92,246,0.35), 0 0 200px rgba(6,182,212,0.15); }
        }
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
