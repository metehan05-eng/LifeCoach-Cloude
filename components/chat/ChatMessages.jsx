"use client";
import React, { useEffect, useRef } from 'react';

/* ── Markdown formatter ── */
function extractYouTubeVideoId(input) {
  if (!input || typeof input !== 'string') return null;
  const idOnly = /^([a-zA-Z0-9_-]{11})$/;
  if (idOnly.test(input.trim())) return input.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}

/* ── Video Preview Card (YouTube embed) ── */
const VideoPreview = ({ videoId, title, onRemove }) => (
  <div style={{
    marginTop: '8px', borderRadius: '14px', overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.25)',
    animation: 'ci-pop 0.3s ease-out both',
  }}>
    <div style={{
      position: 'relative', width: '100%', paddingTop: '56.25%',
      background: '#000',
    }}>
      <iframe
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        src={`https://www.youtube.com/embed/${videoId}`}
        title="Video"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
    {title && (
      <div style={{ padding: '8px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
        🎬 {title}
      </div>
    )}
  </div>
);

/* ── MP4 / Video File Preview Card ── */
const VideoFilePreview = ({ name, hasTranscript }) => (
  <div style={{
    marginTop: '8px', borderRadius: '14px',
    border: '1px solid rgba(168,85,247,0.25)',
    background: 'rgba(139,92,246,0.07)',
    padding: '10px 14px',
    display: 'flex', alignItems: 'center', gap: '10px',
    animation: 'ci-pop 0.3s ease-out both',
  }}>
    <div style={{
      width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
      background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '18px',
    }}>🎬</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#e9d5ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(168,85,247,0.7)', marginTop: '2px' }}>
        {hasTranscript ? '✅ Transkript çıkarıldı — AI analiz ediyor' : '⏳ İşleniyor...'}
      </div>
    </div>
    {hasTranscript && (
      <span style={{ color: '#a78bfa', background: 'rgba(139,92,246,0.15)', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
        Analiz edildi
      </span>
    )}
  </div>
);

/* ── Markdown formatter ── */
const formatMarkdown = (text) => {
  // Code blocks (multi-line) with terminal look
  text = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) => {
    const filename = (lang && lang.includes(':')) ? lang.split(':')[1] : (lang || 'terminal');
    const displayLang = lang ? lang.split(':')[0] : '';
    
    return `
      <div style="background:rgba(13,13,20,0.9); border:1px solid rgba(99,102,241,0.25); border-radius:14px; margin:14px 0; overflow:hidden; box-shadow: 0 4px 24px rgba(99,102,241,0.08); backdrop-filter:blur(8px)">
        <div style="background:linear-gradient(90deg,rgba(99,102,241,0.08),rgba(139,92,246,0.05)); padding:10px 16px; border-bottom:1px solid rgba(99,102,241,0.15); display:flex; justify-content:space-between; align-items:center">
          <div style="display:flex; gap:6px">
            <span style="width:10px; height:10px; border-radius:50%; background:#ff5f56"></span>
            <span style="width:10px; height:10px; border-radius:50%; background:#ffbd2e"></span>
            <span style="width:10px; height:10px; border-radius:50%; background:#27c93f"></span>
          </div>
          <div style="font-family:'JetBrains Mono','Fira Code',monospace; font-size:10px; color:rgba(160,160,200,0.7); font-weight:700; letter-spacing:0.05em; text-transform:uppercase">
            ${filename} ${displayLang ? `(${displayLang})` : ''}
          </div>
        </div>
        <pre style="padding:16px; overflow-x:auto; margin:0; font-family:'JetBrains Mono','Fira Code',monospace; font-size:12.5px; line-height:1.7; color:#d8d8f0; scrollbar-width:thin; scrollbar-color:rgba(99,102,241,0.3) rgba(0,0,0,0.1)"><code>${code.trim()}</code></pre>
      </div>
    `;
  });

  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code style="background:rgba(99,102,241,0.15);padding:3px 8px;border-radius:6px;font-size:12px;font-family:\'JetBrains Mono\',monospace;color:#a5b4fc;font-weight:500">$1</code>');
  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:700;color:#e8e8ff;letter-spacing:-0.01em">$1</strong>');
  // Italic
  text = text.replace(/\*(.*?)\*/g, '<em style="font-style:italic;color:#c4b5fd">$1</em>');
  // H3
  text = text.replace(/^### (.*$)/gm, '<h3 style="font-size:14px;font-weight:800;margin:14px 0 6px;color:#c4b5fd;letter-spacing:-0.02em">$1</h3>');
  // H2
  text = text.replace(/^## (.*$)/gm, '<h2 style="font-size:15px;font-weight:800;margin:16px 0 8px;color:#a5b4fc;letter-spacing:-0.02em">$1</h2>');
  // H1
  text = text.replace(/^# (.*$)/gm, '<h1 style="font-size:17px;font-weight:900;margin:18px 0 10px;color:#818cf8;letter-spacing:-0.03em">$1</h1>');
  // Unordered list
  text = text.replace(/^[\*\-] (.*$)/gm,
    '<div style="display:flex;gap:10px;margin:4px 0;align-items:flex-start"><span style="color:#6366f1;font-size:10px;margin-top:5px;flex-shrink:0">●</span><span>$1</span></div>'
  );
  // Numbered list
  text = text.replace(/^\d+\. (.*$)/gm,
    '<div style="display:flex;gap:10px;margin:4px 0;align-items:flex-start"><span style="color:#8b5cf6;font-weight:700;flex-shrink:0;font-size:11px;margin-top:3px">▸</span><span>$1</span></div>'
  );
  
  // Custom Advice Block detection — will wrap in a nice UI later but handle basic formatting here
  text = text.replace(/💡 HAN Tavsiyesi:(.*$)/gm, '<div style="background:rgba(139,92,246,0.08); border-left:3px solid #8b5cf6; padding:12px 16px; border-radius:0 12px 12px 0; margin-top:16px; color:#c4b5fd"><span style="font-weight:800; color:#fff; display:block; margin-bottom:4px">💡 HAN Tavsiyesi</span>$1</div>');

  // Line breaks
  text = text.replace(/\n\n/g, '<div style="height:10px"></div>');
  text = text.replace(/\n/g, '<br/>');
  return text;
};

/* ── File Tree Component ── */
const FileTree = ({ items }) => {
  if (!items || !Array.isArray(items)) return null;
  return (
    <div style={{
      marginTop: '16px',
      background: 'rgba(15, 15, 25, 0.7)',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      borderRadius: '12px',
      padding: '16px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '13px',
      color: '#c4b5fd'
    }}>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🗂️</span> PROJE YAPISI (EXPLORER)
      </div>
      {items.map((item, idx) => (
        <div key={idx} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '4px 0',
          paddingLeft: `${(item.level || 0) * 16}px`,
          opacity: 0,
          animation: `ci-fade-in 0.3s ease forwards ${idx * 0.05}s`
        }}>
          <span>{item.type === 'dir' ? '📁' : '📄'}</span>
          <span style={{ color: item.type === 'dir' ? '#818cf8' : '#e8e8ff' }}>{item.name}</span>
        </div>
      ))}
    </div>
  );
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

/* ── Source Cards Component (Tavily Web Arama Kaynakları) ── */
const SourceCards = ({ sources }) => {
  if (!sources || sources.length === 0) return null;
  return (
    <div style={{ marginTop: '14px' }}>
      <div style={{
        fontSize: '11px', fontWeight: 700, color: 'rgba(6,182,212,0.7)',
        letterSpacing: '0.8px', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px'
      }}>
        <span style={{ fontSize: '13px' }}>🌐</span> Web Kaynakları
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {sources.map((src, i) => (
          <a
            key={i}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textDecoration: 'none',
              background: 'rgba(6,182,212,0.05)',
              border: '1px solid rgba(6,182,212,0.2)',
              borderRadius: '10px',
              padding: '9px 13px',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(6,182,212,0.12)';
              e.currentTarget.style.borderColor = 'rgba(6,182,212,0.45)';
              e.currentTarget.style.transform = 'translateX(3px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(6,182,212,0.05)';
              e.currentTarget.style.borderColor = 'rgba(6,182,212,0.2)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>
                {['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'][i] || '🔗'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '12px', fontWeight: 600, color: '#67e8f9',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: '2px'
                }}>
                  {src.title}
                </div>
                {src.snippet && (
                  <div style={{
                    fontSize: '11px', color: 'rgba(160,160,200,0.55)', lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {src.snippet}
                  </div>
                )}
                <div style={{ fontSize: '10px', color: 'rgba(6,182,212,0.45)', marginTop: '3px' }}>
                  {src.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                </div>
              </div>
              <span style={{ fontSize: '10px', color: 'rgba(6,182,212,0.5)', flexShrink: 0 }}>↗</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

/* ── Google Maps Result Card ── */
const MapsResultCard = ({ mapsResult }) => {
  if (!mapsResult || !mapsResult.places || mapsResult.places.length === 0) return null;
  
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{
        fontSize: '11px', fontWeight: 700, color: 'rgba(234, 88, 12, 0.8)',
        letterSpacing: '0.8px', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px'
      }}>
        <span style={{ fontSize: '13px' }}>🗺️</span> Google Maps Sonuçları
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
          {mapsResult.searchLocation}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {mapsResult.places.slice(0, 3).map((place, i) => (
          <a
            key={i}
            href={place.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              background: 'rgba(234, 88, 12, 0.06)',
              border: '1px solid rgba(234, 88, 12, 0.2)',
              borderRadius: '12px',
              textDecoration: 'none',
              color: '#e5e7eb',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(234, 88, 12, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(234, 88, 12, 0.4)';
              e.currentTarget.style.transform = 'translateX(3px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(234, 88, 12, 0.06)';
              e.currentTarget.style.borderColor = 'rgba(234, 88, 12, 0.2)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.2), rgba(217, 119, 6, 0.15))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', flexShrink: 0
            }}>
              📍
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>
                {place.name}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(226,232,240,0.7)', marginBottom: '4px' }}>
                {place.address}
              </div>
              {place.rating && (
                <div style={{ fontSize: '11px', color: 'rgba(234, 88, 12, 0.8)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⭐</span>
                  <span>{place.rating}</span>
                  {place.user_ratings_total && (
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                      ({place.user_ratings_total} değerlendirme)
                    </span>
                  )}
                </div>
              )}
            </div>
            <span style={{ color: '#ea580c', fontSize: '18px', flexShrink: 0 }}>↗</span>
          </a>
        ))}
      </div>
    </div>
  );
};

/* ── Calendar Events Card ── */
const CalendarEventsCard = ({ calendarEvents }) => {
  if (!calendarEvents || calendarEvents.length === 0) return null;
  
  const isGoalPlan = calendarEvents.type === 'goal_plan';
  
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{
        fontSize: '11px', fontWeight: 700, color: 'rgba(34, 197, 94, 0.8)',
        letterSpacing: '0.8px', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px'
      }}>
        <span style={{ fontSize: '13px' }}>📅</span> 
        {isGoalPlan ? 'Google Takvim - Hedef Planı' : 'Google Takvim Etkinlikleri'}
      </div>
      <div style={{ 
        padding: '14px', 
        borderRadius: '12px', 
        background: 'rgba(34, 197, 94, 0.06)', 
        border: '1px solid rgba(34, 197, 94, 0.2)' 
      }}>
        {isGoalPlan ? (
          <div style={{ marginBottom: '12px', fontSize: '13px', color: '#86efac' }}>
            ✨ 7 günlük hedef planı Google Takvim'e oluşturuldu!
          </div>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {calendarEvents.slice(0, 3).map((event, i) => (
            <div key={i} style={{
              padding: '10px 12px',
              background: 'rgba(34, 197, 94, 0.08)',
              borderRadius: '8px',
              border: '1px solid rgba(34, 197, 94, 0.15)'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#86efac', marginBottom: '4px' }}>
                {event.summary}
              </div>
              {event.htmlLink && (
                <a
                  href={event.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '11px', color: 'rgba(134, 239, 172, 0.8)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#86efac'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(134, 239, 172, 0.8)'; }}
                >
                  Takvim'de gör ↗
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Single message bubble ── */
function MessageBubble({ message, isStream, onQuickAction }) {
  const isUser = message.role === 'user';
 
  if (isUser) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '2px 0',
        animation: 'fadeInUp 0.3s ease-out both',
        maxWidth: '760px', margin: '0 auto', width: '100%',
      }}>
        <div style={{
          maxWidth: 'min(70%, 520px)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.12))',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '18px 4px 18px 18px',
          padding: '11px 16px',
          fontSize: '14px', 
          lineHeight: 1.65, 
          color: '#e0e0ff',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 12px rgba(99,102,241,0.1)',
          fontWeight: 500,
          letterSpacing: '-0.01em',
        }}>
           {/* User Attachments in Bubble */}
           {message.attachments && message.attachments.length > 0 && (
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
               {message.attachments.map((at, idx) => {
                 // Video file type icon
                 const isVideo = ['MP4', 'WEBM', 'MOV', 'AVI'].includes(at.extension);
                 return (
                 <div key={idx} style={{ 
                   borderRadius: '10px', overflow: 'hidden', 
                   border: '1px solid rgba(255,255,255,0.1)',
                   background: 'rgba(0,0,0,0.2)',
                   minWidth: at.preview ? 'auto' : (isVideo ? '200px' : '140px')
                 }}>
                   {at.preview ? (
                      <img src={at.preview} style={{ maxWidth: '200px', maxHeight: '150px', display: 'block' }} />
                   ) : (
                     <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>
                          {at.extension === 'PPTX' ? '📊' : 
                           at.extension === 'XLSX' ? '📈' : 
                           at.extension === 'DOCX' ? '📝' :
                           isVideo ? '🎬' : '📁'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#a5b4fc', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {at.name}
                        </span>
                     </div>
                   )}
                 </div>
               )})}
             </div>
           )}
          
           {/* YouTube video preview from message content */}
           {(() => {
             if (message.content) {
               const ytId = extractYouTubeVideoId(message.content);
               if (ytId) return <VideoPreview videoId={ytId} />;
             }
             return null;
           })()}

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
      animation: 'fadeInUp 0.4s ease-out both',
      maxWidth: '760px', margin: '0 auto', width: '100%',
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '16px', 
        boxShadow: '0 4px 16px rgba(99,102,241,0.25)',
        marginTop: '2px',
      }}>⚡</div>
 
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name row */}
        <div style={{
          fontSize: '11px', 
          fontWeight: '800',
          color: 'rgba(139,102,241,0.8)',
          marginBottom: '6px', 
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
        }}>
          HAN AI
          {isStream && <span style={{ animation: 'blink 0.7s ease-in-out infinite', color: '#6366f1', fontSize: '13px' }}>▊</span>}
        </div>
        {/* Content — no bubble, just text */}
        <div
          style={{ 
            fontSize: '14px', 
            lineHeight: 1.75, 
            color: '#d8d8f0',
            letterSpacing: '-0.01em',
            fontWeight: 500,
          }}
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
              if (data.type === 'goal') return <GoalCard data={data} onQuickAction={onQuickAction} />;
              if (data.type === 'project_structure') return <FileTree items={data.items} />;
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
        {/* Generated File Cards */}
        {message.files && message.files.length > 0 && (
          <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
            {message.files.map((file, idx) => {
              const href = file.url || `data:${file.mime};base64,${file.content_base64}`;
              return (
                <a
                  key={idx}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  download={file.filename}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 14px',
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.18)',
                    borderRadius: '14px',
                    color: '#e5e7eb',
                    textDecoration: 'none',
                    fontSize: '13px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{file.filename}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(226,232,240,0.85)' }}>
                      {file.mime}{file.url ? ' • Açmak için tıkla' : ' • İndirilebilir dosya'}
                    </div>
                  </div>
                  <span style={{ color: '#a5b4fc', fontSize: '18px' }}>{file.url ? '↗' : '⬇'}</span>
                </a>
              );
            })}
          </div>
        )}

        {/* YouTube Suggestions */}
        {message.youtube_suggestions && message.youtube_suggestions.length > 0 && (
          <div style={{ marginTop: '16px', padding: '14px', borderRadius: '16px', background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ marginBottom: '10px', fontSize: '13px', color: '#9ca3af', fontWeight: 700 }}>YouTube Videoları</div>
            {message.youtube_suggestions.slice(0, 1).map((video, idx) => (
              <a key={idx} href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: '12px', alignItems: 'center', textDecoration: 'none', color: '#e5e7eb' }}>
                {video.thumbnail ? <img src={video.thumbnail} alt={video.title} style={{ width: '110px', height: '62px', objectFit: 'cover', borderRadius: '10px' }} /> : null}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{video.title}</div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>{video.channel}</div>
                </div>
                <span style={{ color: '#3b82f6', fontWeight: 700 }}>▶</span>
              </a>
            ))}
          </div>
        )}

        {/* Tool Notes */}
        {message.tool_notes && message.tool_notes.length > 0 && (
          <div style={{ marginTop: '16px', padding: '14px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(148,163,184,0.2)' }}>
            <div style={{ marginBottom: '10px', fontSize: '13px', color: '#93c5fd', fontWeight: 700 }}>Sistem İşlemleri</div>
            <ul style={{ margin: 0, paddingLeft: '18px', color: '#e5e7eb', fontSize: '13px', lineHeight: 1.7 }}>
              {message.tool_notes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Video Notes Card — shows processed video uploads */}
        {message.video_notes && message.video_notes.length > 0 && (
          <div style={{ marginTop: '16px', padding: '14px', borderRadius: '16px', background: 'rgba(91,33,182,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <div style={{ marginBottom: '10px', fontSize: '13px', color: '#c084fc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎬</span> Video Analizi
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {message.video_notes.map((vn, i) => (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <span style={{ fontSize: '20px' }}>🎬</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#e9d5ff' }}>{vn.name}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(168,85,247,0.7)', marginTop: '2px' }}>
                      {vn.hasTranscript ? '✅ Transkript alındı — detaylı analiz yapıldı' : '⏳ İşleniyor'}
                    </div>
                  </div>
                  {vn.hasTranscript && (
                    <span style={{ color: '#a78bfa', background: 'rgba(139,92,246,0.12)', padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                      ANALİZ EDİLDİ
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source Cards */}
        {message.sources && message.sources.length > 0 && (
          <SourceCards sources={message.sources} />
        )}

        {/* Maps Result Card */}
        {message.maps_result && (
          <MapsResultCard mapsResult={message.maps_result} />
        )}

        {/* Calendar Events Card */}
        {message.calendar_events && message.calendar_events.length > 0 && (
          <CalendarEventsCard calendarEvents={message.calendar_events} />
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
        @keyframes ci-fade-in {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
