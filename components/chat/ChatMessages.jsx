"use client";
import React, { useEffect, useRef } from 'react';

/* ── Markdown formatter ── */
const formatMarkdown = (text) => {
  // Code blocks (multi-line) first
  text = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre style="background:rgba(0,0,0,0.4);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:14px 16px;overflow-x:auto;margin:10px 0;font-family:'JetBrains Mono','Fira Code',monospace;font-size:12.5px;line-height:1.6;color:#c4b5fd"><code>${code.trim()}</code></pre>`
  );
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code style="background:rgba(99,102,241,0.18);padding:2px 7px;border-radius:5px;font-size:12.5px;font-family:monospace;color:#a5b4fc">$1</code>');
  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:700;color:#e8e8ff">$1</strong>');
  // Italic
  text = text.replace(/\*(.*?)\*/g, '<em style="font-style:italic;color:#c4b5fd">$1</em>');
  // H3
  text = text.replace(/^### (.*$)/gm, '<h3 style="font-size:14px;font-weight:700;margin:14px 0 6px;color:#c4b5fd;letter-spacing:-0.3px">$1</h3>');
  // H2
  text = text.replace(/^## (.*$)/gm, '<h2 style="font-size:16px;font-weight:700;margin:16px 0 8px;color:#a5b4fc;letter-spacing:-0.4px">$1</h2>');
  // H1
  text = text.replace(/^# (.*$)/gm, '<h1 style="font-size:18px;font-weight:800;margin:18px 0 10px;color:#818cf8;letter-spacing:-0.5px">$1</h1>');
  // Unordered list
  text = text.replace(/^[\*\-] (.*$)/gm,
    '<div style="display:flex;gap:10px;margin:4px 0;align-items:flex-start"><span style="color:#6366f1;font-size:10px;margin-top:5px;flex-shrink:0">●</span><span>$1</span></div>'
  );
  // Numbered list
  text = text.replace(/^\d+\. (.*$)/gm,
    '<div style="display:flex;gap:10px;margin:4px 0;align-items:flex-start"><span style="color:#8b5cf6;font-weight:700;flex-shrink:0;font-size:11px;margin-top:3px">▸</span><span>$1</span></div>'
  );
  // Line breaks
  text = text.replace(/\n\n/g, '<div style="height:10px"></div>');
  text = text.replace(/\n/g, '<br/>');
  return text;
};

/* ── Goal Card Component ── */
const GoalCard = ({ data, onQuickAction }) => {
  if (!data || data.type !== 'goal') return null;
  return (
    <div style={{
      marginTop: '12px',
      background: 'rgba(20, 20, 35, 0.6)',
      border: '1px solid rgba(139, 92, 246, 0.4)',
      borderRadius: '20px',
      padding: '24px',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
      animation: 'ci-pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ 
              fontSize: '10px', 
              textTransform: 'uppercase', 
              letterSpacing: '1px', 
              color: '#a5b4fc',
              fontWeight: 800,
              background: 'rgba(99, 102, 241, 0.2)',
              padding: '4px 10px',
              borderRadius: '8px'
            }}>{data.day ? `${data.day}. GÜN` : 'HEDEF'}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>•</span>
            <span style={{ color: '#f472b6', fontSize: '10px', fontWeight: 600 }}>{data.priority || 'Normal'} ÖNCELİK</span>
          </div>
          <h4 style={{ color: '#fff', fontSize: '20px', fontWeight: 800, lineHeight: 1.3 }}>{data.title}</h4>
        </div>
        <div style={{ 
          width: '50px', height: '50px', borderRadius: '14px', 
          background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', border: '1px solid rgba(139,92,246,0.2)'
        }}>🎯</div>
      </div>

      {/* YouTube Player */}
      {data.youtube_id && (
        <div style={{ 
          marginTop: '16px', 
          borderRadius: '12px', 
          overflow: 'hidden', 
          aspectRatio: '16/9',
          background: '#000',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
        }}>
          <iframe 
            width="100%" 
            height="100%" 
            src={`https://www.youtube.com/embed/${data.youtube_id}`}
            title="Video Player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}

      {/* Progress Section */}
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(200,200,255,0.6)', marginBottom: '8px' }}>
          <span>Tamamlanma Oranı</span>
          <span style={{ color: '#a5b4fc', fontWeight: 700 }}>%{data.progress || 0}</span>
        </div>
        <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', padding: '1px' }}>
          <div style={{ 
            width: `${data.progress || 0}%`, 
            height: '100%', 
            background: 'linear-gradient(90deg, #6366f1, #c084fc, #818cf8)',
            borderRadius: '4px',
            transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 15px rgba(139, 92, 246, 0.6)'
          }} />
        </div>
      </div>

      {/* Action Button */}
      <button 
        onClick={() => onQuickAction(`${data.day || 1}. günü tamamladım. Lütfen ${parseInt(data.day || 1) + 1}. güne geçelim ve yeni hedef planımı paylaş.`)}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff',
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.5)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.3)';
        }}
      >
        ✨ {parseInt(data.day || 1) + 1}. Güne Başla
      </button>
    </div>
  );
};

/* ── Typing dots indicator ── */
const TypingIndicator = () => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '4px 0', maxWidth: '760px', margin: '0 auto', width: '100%' }}>
    <div style={{
      width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '15px', boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
    }}>⚡</div>
    <div style={{
      padding: '12px 16px', borderRadius: '4px 18px 18px 18px',
      background: 'transparent',
      display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px',
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: 'rgba(99,102,241,0.7)',
          animation: `ci-typing 1.3s ease-in-out ${i * 0.22}s infinite`,
        }} />
      ))}
    </div>
  </div>
);

/* ── Single message bubble ── */
function MessageBubble({ message, isStream, onQuickAction }) {
  const isUser = message.role === 'user';
 
  if (isUser) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '2px 0',
        animation: 'ci-slide-up 0.3s ease both',
        maxWidth: '760px', margin: '0 auto', width: '100%',
      }}>
        <div style={{
          maxWidth: 'min(70%, 520px)',
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.22)',
          borderRadius: '18px 4px 18px 18px',
          padding: '11px 16px',
          fontSize: '15px', lineHeight: 1.65, color: '#e8e8ff',
          backdropFilter: 'blur(10px)',
        }}>
          {message.content}
        </div>
      </div>
    );
  }
 
  /* AI message — full width, no bubble background, like Claude */
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
      padding: '2px 0',
      animation: 'ci-slide-up 0.3s ease both',
      maxWidth: '760px', margin: '0 auto', width: '100%',
    }}>
      <div style={{
        width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '15px', boxShadow: '0 2px 12px rgba(99,102,241,0.3)',
        marginTop: '2px',
      }}>⚡</div>
 
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name row */}
        <div style={{
          fontSize: '12px', fontWeight: 700, color: 'rgba(99,102,241,0.7)',
          marginBottom: '6px', letterSpacing: '0.3px',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          HAN AI
          {isStream && <span style={{ animation: 'ci-blink 0.7s ease-in-out infinite', color: '#6366f1', fontSize: '14px' }}>▊</span>}
        </div>
        {/* Content — no bubble, just text */}
        <div
          style={{ fontSize: '15px', lineHeight: 1.75, color: '#d8d8f0' }}
          dangerouslySetInnerHTML={{ 
            __html: formatMarkdown(message.content.replace(/```json-action[\s\S]*?```/g, "").replace(/```json-memory[\s\S]*?```/g, "")) 
          }}
        />
 
        {/* Action Renderer */}
        {(() => {
          const actionMatch = message.content.match(/```json-action\n([\s\S]*?)\n```/);
          if (actionMatch) {
            try {
              const data = JSON.parse(actionMatch[1]);
              return <GoalCard data={data} onQuickAction={onQuickAction} />;
            } catch (e) { return null; }
          }
          return null;
        })()}
 
        {/* Memory Indicator */}
        {message.content.includes("json-memory") && (
          <div style={{ 
            marginTop: '12px', 
            fontSize: '11px', 
            color: 'rgba(34, 197, 94, 0.8)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            background: 'rgba(34, 197, 94, 0.05)',
            padding: '6px 12px',
            borderRadius: '8px',
            width: 'fit-content'
          }}>
            <span style={{ fontSize: '14px' }}>🧠</span> Hafızaya Kaydedildi
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main export ── */
export default function ChatMessages({ messages, isTyping, streamText, error, isMobile = false, onQuickAction }) {
  const bottomRef = useRef(null);
 
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, streamText]);
 
  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      padding: isMobile ? '16px 14px 12px' : '28px 24px 16px',
      display: 'flex', flexDirection: 'column', gap: isMobile ? '14px' : '20px',
      scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.15) transparent',
    }}>
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} onQuickAction={onQuickAction} />
      ))}
 
      {isTyping && streamText && (
        <MessageBubble message={{ role: 'assistant', content: streamText, id: 'stream' }} isStream onQuickAction={onQuickAction} />
      )}

      {isTyping && !streamText && <TypingIndicator />}

      {error && (
        <div style={{
          maxWidth: '760px', margin: '0 auto', width: '100%',
          padding: '12px 16px', borderRadius: '12px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#f87171', fontSize: '13.5px', display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          <span>⚠️</span> {error}
        </div>
      )}

      <div ref={bottomRef} />

      <style>{`
        @keyframes ci-slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ci-typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes ci-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes ci-pop-in {
          0% { opacity: 0; transform: scale(0.95) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
