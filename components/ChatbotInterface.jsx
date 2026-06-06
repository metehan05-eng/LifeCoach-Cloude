"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatSidebar from './chat/ChatSidebar';
import ChatMessages from './chat/ChatMessages';
import ChatInput from './chat/ChatInput';
import ChatHeader from './chat/ChatHeader';
import WaffleStudio from './chat/WaffleStudio';
import Leaderboard from './chat/Leaderboard';
import AutomationWorkbench from './chat/AutomationWorkbench';
import SettingsModal from './chat/SettingsModal';
import ProjectHub from './chat/ProjectHub';
import PremiumHub from './chat/PremiumHub';
import HANVision from './chat/HANVision';
import LootBox from './chat/LootBox';
import LevelUpCelebration from './chat/LevelUpCelebration';
import styles from './ChatbotInterface.module.css';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isClient ? isMobile : false;
}

export default function ChatbotInterface() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [isMounted, setIsMounted] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);

  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamText, setStreamText] = useState('');
  const [deepSearch, setDeepSearch] = useState(false);
  const [goalPlanningMode, setGoalPlanningMode] = useState(false);
  const [userStats, setUserStats] = useState({ xp: 0, level: 1, currentStreak: 0 });
  const [gamification, setGamification] = useState({ xp: 0, level: 1, totalXp: 0, han_coins: 0, isPremium: false, inventory: [] });
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showVision, setShowVision] = useState(false);
  const [showLootBox, setShowLootBox] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isMounted) return;
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log("Service Worker Kayıtlı:", reg);
        Notification.requestPermission();
      });
    }
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted || !session?.user?.email) return;
    if (sessions.length > 0) return;
    const userEmail = session.user.email;
    const storageKey = `lifeCoachSessions_${userEmail}`;
    fetch(`/api/chat/history?email=${encodeURIComponent(userEmail)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map(c => ({
            id: c.id,
            title: c.title || 'Sohbet',
            messages: (c.messages || []).map(m => ({
              role: m.role, content: m.content, id: m.id, metadata: m.metadata
            })),
            createdAt: c.createdAt
          }));
          setSessions(mapped);
        } else {
          try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
              const parsed = JSON.parse(saved);
              const valid = parsed.filter(s => s.messages && s.messages.length > 0);
              if (valid.length > 0) setSessions(valid);
            }
          } catch (e) { console.error("LocalStorage yedek yükleme hatası:", e); }
        }
      })
      .catch(e => {
        console.error("Session yükleme hatası:", e);
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            const valid = parsed.filter(s => s.messages && s.messages.length > 0);
            if (valid.length > 0) setSessions(valid);
          }
        } catch (e2) { console.error("LocalStorage yedek yükleme hatası:", e2); }
      });
  }, [isMounted, session]);

  useEffect(() => {
    if (!isMounted || !session?.user?.email) return;
    fetch(`/api/chat?email=${session.user.email}&just_stats=true`)
      .then(res => res.json())
      .then(data => { if (data.stats) setUserStats(data.stats); })
      .catch(e => console.log("Stats fetch error"));
    fetch(`/api/gamification?email=${encodeURIComponent(session.user.email)}`)
      .then(res => res.json())
      .then(data => { if (data && typeof data.han_coins === 'number') setGamification(data); })
      .catch(e => console.log("Gamification fetch error"));
  }, [isMounted, session]);

  useEffect(() => {
    const currentUserEmail = session?.user?.email;
    if (isMounted && sessions.length > 0 && currentUserEmail) {
      const toSave = sessions.filter(s => s.messages && s.messages.length > 0);
      localStorage.setItem(`lifeCoachSessions_${currentUserEmail}`, JSON.stringify(toSave));
    }
  }, [sessions, isMounted, session]);

  useEffect(() => {
    if (isMounted) setSidebarOpen(!isMobile);
  }, [isMounted, isMobile]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];
  const hasMessages = isMounted && (messages.length > 0 || isTyping);

  const createNewSession = useCallback(() => {
    const timestamp = Date.now();
    const tempId = `temp-${timestamp}`;
    setActiveSessionId(tempId);
    setActiveChatId(null);
    setError(null);
    if (isMobile) setSidebarOpen(false);
    return { id: tempId, timestamp };
  }, [isMobile]);

  const deleteSession = useCallback((id) => {
    if (id && !id.toString().startsWith('temp-')) {
      fetch('/api/chat/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: id, email: session?.user?.email })
      }).catch(e => console.error("Chat silme hatasi:", e));
    }
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (remaining.length === 0) {
        const timestamp = Date.now();
        const fresh = { id: timestamp, title: 'Yeni Sohbet', messages: [], createdAt: timestamp };
        setActiveSessionId(fresh.id);
        setActiveChatId(null);
        return [fresh];
      }
      if (activeSessionId === id) setActiveSessionId(remaining[0].id);
      return remaining;
    });
  }, [activeSessionId, session]);

  const sendMessage = useCallback(async (text, attachments = []) => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;
    setError(null);
    const attachmentPreviews = attachments.map(a => ({
      id: a.id, name: a.name, extension: a.extension, type: a.type, preview: a.preview
    }));
    const userMsg = { role: 'user', content: text, id: Date.now(), attachments: attachmentPreviews };
    const currentSessionExists = sessions.some(s => s.id === activeSessionId);
    let targetSessionId = activeSessionId;
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    if (!currentSessionExists) {
      const realId = Date.now();
      targetSessionId = realId;
      const newSession = { id: realId, title: text ? text.slice(0, 42) : (attachments[0]?.name || 'Yeni Sohbet'), messages: [userMsg], createdAt: new Date() };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(realId);
    } else {
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg] } : s
      ));
    }

    setIsLoading(true);
    setIsTyping(true);
    setStreamText('');

    try {
      const preparedAttachments = await Promise.all(attachments.map(async (a) => {
        if (a.type.startsWith('image/')) {
          return { name: a.name, type: 'image', data: a.preview.split(',')[1] };
        } else {
          return new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve({ name: a.name, type: 'file', data: r.result.split(',')[1], ext: a.extension });
            r.readAsDataURL(a.file);
          });
        }
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text, history, attachments: preparedAttachments,
          chatId: activeChatId, sessionId: targetSessionId,
          email: session?.user?.email,
          deepSearch: deepSearch,
          goal_planning_mode: goalPlanningMode
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "LIMIT_REACHED") {
          setShowPremium(true);
          setStreamText('');
          setSessions(prev => prev.map(s => s.id === targetSessionId ? { ...s, messages: s.messages.filter(m => m.id !== Date.now()) } : s));
          throw new Error(data.message);
        }
        throw new Error(data.details || data.error || 'Sunucu hatası');
      }

      const aiText = data.reply || data.response;
      if (!aiText) throw new Error("Empty response");

      if (data.gamification) {
        setGamification(prev => ({
          ...prev,
          xp: data.gamification.totalXp,
          level: data.gamification.newLevel,
          totalXp: data.gamification.totalXp,
          han_coins: data.gamification.han_coins,
        }));
        if (data.gamification.leveledUp) {
          setLevelUpData({ oldLevel: data.gamification.oldLevel, newLevel: data.gamification.newLevel });
          setTimeout(() => setLevelUpData(null), 4000);
        }
      }

      const finalSessionId = data.chatId || targetSessionId;
      const aiSources = data.sources || [];
      const generatedFiles = data.generated_files || [];
      const youtubeSuggestions = data.youtube_suggestions || [];
      const youtubeSearchQuery = data.youtube_search_query || null;
      const videoNotes = data.video_notes || [];

      let displayed = '';
      const words = aiText.split(' ');
      for (let i = 0; i < words.length; i++) {
        displayed += (i === 0 ? '' : ' ') + words[i];
        setStreamText(displayed);
        await new Promise(r => setTimeout(r, 16));
      }

      setStreamText('');
      setIsTyping(false);
      setIsLoading(false);

      setSessions(prev => prev.map(s =>
        s.id === targetSessionId || s.id === finalSessionId
          ? { ...s, messages: [...s.messages, {
              role: 'assistant', content: aiText, id: Date.now(),
              sources: aiSources, files: generatedFiles,
              youtube_suggestions: youtubeSuggestions,
              youtube_search_query: youtubeSearchQuery,
              video_notes: videoNotes,
              tool_notes: data.tool_notes || [],
              calendar_events: data.calendar_events || [],
              gmail_result: data.gmail_result || null,
              maps_result: data.maps_result || null
            }] }
          : s
      ));

      if (data.chatId && data.chatId !== targetSessionId) {
        setSessions(prev => prev.map(s =>
          s.id === targetSessionId ? { ...s, id: data.chatId } : s
        ));
        setActiveChatId(data.chatId);
        setActiveSessionId(data.chatId);
      }

      if (deepSearch) setDeepSearch(false);
      if (goalPlanningMode) setGoalPlanningMode(false);
    } catch (err) {
      setError("Hata oldu daha sonra tekrar deneyin");
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      setStreamText('');
    }
  }, [activeSessionId, sessions, isMounted, userStats, session, isLoading, activeChatId]);

  const handleConvertToProject = useCallback(() => {
    if (!activeSession || activeSession.messages.length === 0) return;
    alert(`📁 "${activeSession.title}" projesi başarıyla oluşturuldu! \nArtık "Projelerim" sekmesinden takip edebilirsin.`);
  }, [activeSession]);

  const handleQuickAction = useCallback((text) => {
    if (isLoading) return;
    sendMessage(text);
  }, [sendMessage, isLoading]);

  const toggleSidebar = () => setSidebarOpen(p => !p);

  if (!isMounted) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        background: '#08081a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ color: 'rgba(124,58,237,0.5)', fontSize: '14px' }}>Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      {showLootBox && (
        <LootBox
          email={session?.user?.email}
          isPremium={gamification.isPremium}
          balance={gamification.han_coins}
          onClose={() => setShowLootBox(false)}
          onReward={(data) => {
            setGamification(prev => ({ ...prev, han_coins: data.balance }));
          }}
        />
      )}

      <LevelUpCelebration levelUpData={levelUpData} />

      {showLeaderboard && (
        <Leaderboard userEmail={session?.user?.email} isMobile={isMobile} onClose={() => setShowLeaderboard(false)} />
      )}
      {showAutomation && (
        <AutomationWorkbench userEmail={session?.user?.email} isMobile={isMobile} onClose={() => setShowAutomation(false)} />
      )}
      {showSettings && (
        <SettingsModal user={{...session?.user, ...userStats}} onClose={() => setShowSettings(false)} />
      )}
      {showPremium && (
        <PremiumHub onClose={() => setShowPremium(false)} />
      )}
      {showVision && (
        <HANVision
          onClose={() => setShowVision(false)}
          onSnapshot={(base64, pyData) => {
            let prompt = "[BİYOMETRİK VERİ: Yüz ifademi ve duygusal durumumu analiz et. ";
            if (pyData) {
              prompt += `\n\n[HAN VISION ANALİZİ]:
                - Kimlik/Tanıma: ${pyData.identity}
                - Yaş/Cinsiyet: ${pyData.age} yaş, ${pyData.gender}
                - Hakim Duygu: ${pyData.dominant_emotion}
                - Stres Seviyesi: %${pyData.stress_level_percentage}
                - Doğruluk/Yalan İhtimali: %${pyData.truth_probability}
                - Psikolojik İçgörü: ${pyData.psychological_insight}
                Lütfen bu verileri bir medyum gibi yorumla. Eğer beni tanıdıysan (identity "Unknown" değilse) buna göre hitap et. Doğruları yüzüme vur, gerekirse motive et ve bana sıkı bir Yaşam Koçluğu yap.]`;
            } else {
              prompt += " Bunu normal bir sohbet gibi düşün ve bana rehberlik et.]";
            }
            sendMessage(prompt, [{ type: 'image', data: base64, extension: 'jpg', name: 'vision_snapshot.jpg' }]);
          }}
        />
      )}

      <div className={styles.layout}>
        {/* Sidebar */}
        <div style={isMobile ? {
          position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.32s cubic-bezier(0.4,0,0.2,1)',
        } : {}}>
          <ChatSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={(id) => {
              if (id === 'leaderboard') setShowLeaderboard(true);
              else if (id === 'automation') setShowAutomation(true);
              else if (id === 'projects') setShowProjects(true);
              else if (id === 'lootbox') setShowLootBox(true);
              else { setActiveSessionId(id); setActiveChatId(id); setShowProjects(false); }
              if (isMobile) setSidebarOpen(false);
            }}
            onNewSession={createNewSession}
            onDeleteSession={deleteSession}
            isOpen={sidebarOpen}
            user={{...session?.user, ...userStats, han_coins: gamification.han_coins, isPremium: gamification.isPremium, totalXp: gamification.totalXp, level: gamification.level}}
            onToggle={toggleSidebar}
          />
        </div>

        {/* Main content */}
        <div className={styles.main}>
          <ChatHeader
            onToggleSidebar={toggleSidebar}
            sidebarOpen={sidebarOpen}
            sessionTitle={activeSessionId === 'waffle' ? '🧇 Waffle Studio' : activeSession?.title}
            isMobile={isMobile}
            onConvertToProject={handleConvertToProject}
            onOpenSettings={() => setShowSettings(true)}
          />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {showProjects ? (
              <ProjectHub user={session?.user} onClose={() => setShowProjects(false)} />
            ) : (
              <>
                {activeSessionId === 'waffle' ? (
                  <WaffleStudio isMobile={isMobile} />
                ) : hasMessages ? (
                  <>
                    <ChatMessages
                      messages={messages}
                      isTyping={isTyping}
                      streamText={streamText}
                      error={error}
                      isMobile={isMobile}
                      onQuickAction={handleQuickAction}
                    />
                    <ChatInput
                      value={inputValue}
                      onChange={setInputValue}
                      onSend={sendMessage}
                      isLoading={isLoading}
                      centered={false}
                      isMobile={isMobile}
                      onToggleVision={() => setShowVision(p => !p)}
                      deepSearch={deepSearch}
                      onToggleDeepSearch={() => setDeepSearch(p => !p)}
                      goalPlanningMode={goalPlanningMode}
                      onToggleGoalPlanning={() => setGoalPlanningMode(p => !p)}
                    />
                  </>
                ) : (
                  /* ── WELCOME SCREEN ── */
                  <div style={{
                    flex: 1,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: isMobile ? '20px 16px 16px' : '40px 24px',
                    gap: isMobile ? '24px' : '36px',
                    overflowY: 'auto',
                  }}>
                    {/* Logo + Title */}
                    <div style={{
                      textAlign: 'center',
                      animation: 'wn-fadeIn 0.8s ease-out',
                    }}>
                      <div style={{
                        width: isMobile ? '64px' : '80px',
                        height: isMobile ? '64px' : '80px',
                        borderRadius: '24px',
                        margin: '0 auto 20px',
                        background: 'linear-gradient(135deg, #7c3aed, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: isMobile ? '28px' : '36px',
                        boxShadow: '0 0 60px rgba(124,58,237,0.5), 0 0 120px rgba(99,102,241,0.2)',
                        animation: 'wn-float 6s ease-in-out infinite',
                      }}>
                        <svg width={isMobile ? '28' : '36'} height={isMobile ? '28' : '36'} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                      </div>
                      <h2 style={{
                        fontSize: isMobile ? '22px' : 'clamp(24px,3vw,32px)',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #a78bfa, #c4b5fd, #818cf8)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text', marginBottom: '10px',
                        letterSpacing: '-0.03em',
                      }}>
                        Merhaba! Ben HAN AI
                      </h2>
                      <p style={{
                        color: 'rgba(160,160,200,0.55)',
                        fontSize: isMobile ? '13px' : '15px',
                        lineHeight: 1.7,
                        maxWidth: '480px',
                      }}>
                        Hedeflerine ulaşmana, kararlar vermene ve potansiyelini keşfetmene yardım etmek için buradayım.
                      </p>
                    </div>

                    {/* 4 Quick Action Cards in 2x2 Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: isMobile ? '12px' : '14px',
                      width: '100%',
                      maxWidth: '580px',
                    }}>
                      {[
                        { icon: '🎯', label: 'Hedef Planla', desc: 'SMART hedef belirleme', color: '#7c3aed' },
                        { icon: '⚡', label: 'Üretkenlik Sistemi', desc: 'Deep work yöntemleri', color: '#f59e0b' },
                        { icon: '🚀', label: 'Startup Yol Haritası', desc: 'Fikirden MVP\'ye', color: '#06b6d4' },
                        { icon: '🧠', label: 'Karar Analizi', desc: 'Mantıklı seçimler', color: '#8b5cf6' },
                      ].map((card, i) => (
                        <button key={i}
                          onClick={() => handleQuickAction(card.label)}
                          style={{
                            padding: isMobile ? '18px 14px' : '22px 18px',
                            borderRadius: '18px',
                            background: 'rgba(12,12,40,0.6)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(124,58,237,0.12)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '10px',
                            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                            textAlign: 'left',
                            animation: `wn-slideUp 0.6s ease-out ${0.1 + i * 0.1}s both`,
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.background = 'rgba(20,20,50,0.8)';
                            e.currentTarget.style.borderColor = `rgba(124,58,237,0.3)`;
                            e.currentTarget.style.boxShadow = `0 8px 32px rgba(124,58,237,0.15)`;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.background = 'rgba(12,12,40,0.6)';
                            e.currentTarget.style.borderColor = 'rgba(124,58,237,0.12)';
                            e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.2)';
                          }}
                        >
                          <span style={{
                            width: '40px', height: '40px', borderRadius: '12px',
                            background: `linear-gradient(135deg, ${card.color}22, ${card.color}11)`,
                            border: `1px solid ${card.color}33`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '20px',
                          }}>{card.icon}</span>
                          <div>
                            <div style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: 700, color: '#e0e0ff', marginBottom: '2px' }}>
                              {card.label}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(160,160,200,0.45)' }}>
                              {card.desc}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Centered Input */}
                    <div style={{ width: '100%', maxWidth: '640px' }}>
                      <ChatInput
                        value={inputValue}
                        onChange={setInputValue}
                        onSend={sendMessage}
                        isLoading={isLoading}
                        centered={true}
                        isMobile={isMobile}
                        onToggleVision={() => setShowVision(p => !p)}
                        deepSearch={deepSearch}
                        onToggleDeepSearch={() => setDeepSearch(p => !p)}
                        goalPlanningMode={goalPlanningMode}
                        onToggleGoalPlanning={() => setGoalPlanningMode(p => !p)}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wn-float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes wn-fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes wn-slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
