"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatSidebar from './chat/ChatSidebar';
import ChatMessages from './chat/ChatMessages';
import ChatInput from './chat/ChatInput';
import ChatHeader from './chat/ChatHeader';
import styles from './ChatbotInterface.module.css';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function ChatbotInterface() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [isMounted, setIsMounted] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  useEffect(() => {
    setIsMounted(true);
    const initialId = Date.now();
    setSessions([{ id: initialId, title: 'Yeni Sohbet', messages: [], createdAt: new Date() }]);
    setActiveSessionId(initialId);
  }, []);

  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamText, setStreamText] = useState('');

  // UI state adjustment after mount/isMobile change
  useEffect(() => {
    if (isMounted) {
      if (isMobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    }
  }, [isMounted, isMobile]);

  // Auth protection
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];
  const hasMessages = messages.length > 0 || isTyping;

  const createNewSession = useCallback(() => {
    const newId = Date.now();
    setSessions(prev => [{ id: newId, title: 'Yeni Sohbet', messages: [], createdAt: new Date() }, ...prev]);
    setActiveSessionId(newId);
    setError(null);
    if (isMobile) setSidebarOpen(false); // close sidebar after selecting on mobile
  }, [isMobile]);

  const deleteSession = useCallback((id) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (remaining.length === 0) {
        const fresh = { id: Date.now(), title: 'Yeni Sohbet', messages: [], createdAt: new Date() };
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === id) setActiveSessionId(remaining[0].id);
      return remaining;
    });
  }, [activeSessionId]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return;
    setError(null);

    const userMsg = { role: 'user', content: text, id: Date.now() };
    setSessions(prev => prev.map(s =>
      s.id === activeSessionId
        ? { ...s, title: s.messages.length === 0 ? text.slice(0, 42) : s.title, messages: [...s.messages, userMsg] }
        : s
    ));

    setIsLoading(true);
    setIsTyping(true);
    setStreamText('');

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text, 
          history, 
          sessionId: activeSessionId, 
          email: session?.user?.email 
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Sunucu hatası');
      }

      const data = await res.json();
      const aiText = data.response || '(Boş yanıt)';

      let displayed = '';
      const words = aiText.split(' ');
      for (let i = 0; i < words.length; i++) {
        displayed += (i === 0 ? '' : ' ') + words[i];
        setStreamText(displayed);
        await new Promise(r => setTimeout(r, 16));
      }

      setSessions(prev => prev.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, { role: 'assistant', content: aiText, id: Date.now() }] }
          : s
      ));
      setStreamText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }, [activeSessionId, messages, isLoading]);

  const toggleSidebar = () => setSidebarOpen(p => !p);

  if (!isMounted) return null;

  return (
    <div className={styles.root}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      {/* Mobile overlay: tap to close sidebar */}
      {isMobile && sidebarOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={styles.layout}>
        {/* Sidebar — on mobile it overlays via absolute positioning */}
        <div style={isMobile ? {
          position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
        } : {}}>
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={(id) => {
              setActiveSessionId(id);
              if (isMobile) setSidebarOpen(false);
            }}
            onNewSession={createNewSession}
            onDeleteSession={deleteSession}
            isOpen={isMobile ? true : sidebarOpen}
            user={session?.user}
            onToggle={toggleSidebar}
          />
        </div>

        {/* Main content — always full width on mobile */}
        <div className={styles.main}>
          <ChatHeader
            onToggleSidebar={toggleSidebar}
            sidebarOpen={sidebarOpen}
            sessionTitle={activeSession?.title}
            isMobile={isMobile}
          />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {hasMessages ? (
              <>
                <ChatMessages
                  messages={messages}
                  isTyping={isTyping}
                  streamText={streamText}
                  error={error}
                  isMobile={isMobile}
                />
                <ChatInput
                  value={inputValue}
                  onChange={setInputValue}
                  onSend={sendMessage}
                  isLoading={isLoading}
                  centered={false}
                  isMobile={isMobile}
                />
              </>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: isMobile ? '20px 16px 16px' : '40px 24px',
                gap: isMobile ? '20px' : '32px',
                overflowY: 'auto',
              }}>
                {/* Welcome */}
                <div style={{ textAlign: 'center', maxWidth: '560px' }}>
                  <div style={{
                    width: isMobile ? '60px' : '72px',
                    height: isMobile ? '60px' : '72px',
                    borderRadius: '20px', margin: '0 auto 16px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isMobile ? '26px' : '32px',
                    boxShadow: '0 0 48px rgba(99,102,241,0.45), 0 0 96px rgba(139,92,246,0.2)',
                    animation: 'ci-float 6s ease-in-out infinite',
                  }}>⚡</div>
                  <h2 style={{
                    fontSize: isMobile ? '20px' : 'clamp(22px,3vw,30px)',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #818cf8, #c4b5fd, #67e8f9)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text', marginBottom: '8px',
                  }}>
                    Merhaba! Ben HAN AI
                  </h2>
                  <p style={{ color: 'rgba(160,160,200,0.65)', fontSize: isMobile ? '13px' : '15px', lineHeight: 1.7 }}>
                    Hedeflerine ulaşmana, kararlar vermene ve büyümene yardım etmek için buradayım.
                  </p>
                </div>

                {/* Centered input */}
                <div style={{ width: '100%', maxWidth: '700px' }}>
                  <ChatInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={sendMessage}
                    isLoading={isLoading}
                    centered={true}
                    isMobile={isMobile}
                  />
                </div>

                {/* Suggestion chips */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px,1fr))',
                  gap: isMobile ? '8px' : '10px',
                  width: '100%', maxWidth: '700px',
                }}>
                  {[
                    { icon: '🎯', text: 'Hedef belirleme stratejisi', sub: 'Uzun vadeli plan yap' },
                    { icon: '🧠', text: 'Üretkenlik sistemi kur', sub: 'Deep work yöntemleri' },
                    { icon: '💡', text: 'Karar vermede yardım et', sub: 'Mantıksal analiz' },
                    { icon: '🚀', text: 'Startup fikrim var', sub: 'Değerlendirme & yol haritası' },
                  ].map((s, i) => (
                    <button key={i}
                      onClick={() => setInputValue(s.text)}
                      style={{
                        padding: isMobile ? '10px 12px' : '14px 16px',
                        borderRadius: '14px', textAlign: 'left',
                        background: 'rgba(18,18,32,0.7)', border: '1px solid rgba(99,102,241,0.12)',
                        cursor: 'pointer', transition: 'all 0.22s ease',
                        display: 'flex', gap: '8px', alignItems: 'flex-start',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)';
                        e.currentTarget.style.transform = 'translateY(-3px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(18,18,32,0.7)';
                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.12)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <span style={{ fontSize: isMobile ? '16px' : '20px', flexShrink: 0 }}>{s.icon}</span>
                      <div>
                        <div style={{ fontSize: isMobile ? '11px' : '13px', fontWeight: 600, color: '#d0d0f0', marginBottom: '2px' }}>{s.text}</div>
                        {!isMobile && <div style={{ fontSize: '11px', color: 'rgba(160,160,200,0.5)' }}>{s.sub}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ci-float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
