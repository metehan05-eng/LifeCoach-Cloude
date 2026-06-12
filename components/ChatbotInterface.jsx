"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatSidebar from './chat/ChatSidebar';
import ChatMessages from './chat/ChatMessages';
import ChatInput from './chat/ChatInput';
import ChatHeader from './chat/ChatHeader';
import WelcomeScreen from './chat/ui/WelcomeScreen';
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
import { getQuickAction } from '@/lib/quick-actions';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { SifuPanda } from '@/components/mascot';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { detectEmotionFromText } from '@/lib/voice/sifu-emotion';
import LifeOSHub from '@/components/LifeOSHub';

// (WelcomeScreen handles Life OS module views internally)

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
  const [showSifuPanda, setShowSifuPanda] = useState(false);
  const [showLifeOS, setShowLifeOS] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  const [sifuEmotion, setSifuEmotion] = useState('idle');

  // Life OS View States
  const [activeView, setActiveView] = useState('chat');
  const [viewRecordId, setViewRecordId] = useState(null);

  const handleSelectView = useCallback((view, sessionId = null, recordId = null) => {
    setShowProjects(false);
    setShowSifuPanda(false);
    if (view === 'chat') {
      if (sessionId) {
        setActiveSessionId(sessionId);
        setActiveChatId(sessionId);
      }
      setActiveView('chat');
    } else {
      setActiveView(view);
      setActiveSessionId(view);
      if (recordId) {
        setViewRecordId(recordId);
      } else {
        setViewRecordId(null);
      }
    }
  }, []);

  const sendMessageRef = useRef(null);
  const speakResponseRef = useRef(() => {});

  const voice = useVoiceChat({
    onTranscript: (text) => sendMessageRef.current?.(text),
    onEmotionChange: setSifuEmotion,
    isMobile,
  });

  speakResponseRef.current = voice.speakResponse;

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (voice.isSpeaking || voice.isRecording) return;
    if (isLoading || isTyping) setSifuEmotion('thoughtful');
  }, [isLoading, isTyping, voice.isSpeaking, voice.isRecording]);

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
    setShowSifuPanda(false);
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

  const sendMessage = useCallback(async (text, attachments = [], options = {}) => {
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
      const newSession = {
        id: realId,
        title: options.sessionTitle || (text ? text.slice(0, 42) : (attachments[0]?.name || 'Yeni Sohbet')),
        messages: [userMsg],
        createdAt: new Date(),
      };
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
          goal_planning_mode: options.goal_planning_mode ?? goalPlanningMode,
          quick_action: options.quick_action || null,
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
          setSifuEmotion('happy');
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
              maps_result: data.maps_result || null,
              pexelsImages: data.pexelsImages || [],
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

      const emotion = detectEmotionFromText(aiText);
      if (!data.gamification?.leveledUp) setSifuEmotion(emotion);
      speakResponseRef.current?.(aiText);
      if (emotion === 'happy' && !data.gamification?.leveledUp) {
        setTimeout(() => setSifuEmotion((prev) => (prev === 'happy' ? 'idle' : prev)), 3000);
      }
    } catch (err) {
      setError("Hata oldu daha sonra tekrar deneyin");
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      setStreamText('');
    }
  }, [activeSessionId, sessions, isMounted, userStats, session, isLoading, activeChatId, deepSearch, goalPlanningMode, messages]);

  sendMessageRef.current = sendMessage;

  const voiceInputProps = {
    onVoiceStart: voice.startRecording,
    onVoiceStop: voice.stopRecording,
    isRecording: voice.isRecording,
    voiceEnabled: voice.voiceEnabled,
  };

  const showAppLoading = !isMounted || status === 'loading';

  const handleConvertToProject = useCallback(() => {
    if (!activeSession || activeSession.messages.length === 0) return;
    alert(`📁 "${activeSession.title}" projesi başarıyla oluşturuldu! \nArtık "Projelerim" sekmesinden takip edebilirsin.`);
  }, [activeSession]);

  const handleQuickAction = useCallback((actionId) => {
    if (isLoading) return;
    const action = getQuickAction(actionId);
    if (!action) return;

    if (isMobile) setSidebarOpen(false);
    setInputValue(action.prompt);
    if (action.modes?.goal_planning_mode) setGoalPlanningMode(true);

    sendMessage(action.prompt, [], { ...action.modes, sessionTitle: action.label });
  }, [sendMessage, isLoading, isMobile]);

  const toggleSidebar = () => setSidebarOpen(p => !p);

  return (
    <div className={styles.root}>
      <LoadingScreen isLoading={showAppLoading} />
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
              else if (id === 'sifu-panda') { setShowSifuPanda(true); setActiveSessionId(null); setActiveView('chat'); }
              else if (id === 'waffle') { setShowSifuPanda(false); setActiveSessionId('waffle'); setActiveView('chat'); }
              else if (id === 'lifeos') { setShowLifeOS(true); setActiveSessionId(null); setActiveView('chat'); }
              else {
                setActiveSessionId(id);
                setActiveChatId(id);
                setShowProjects(false);
                setShowSifuPanda(false);
                setActiveView('chat');
              }
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
            sessionTitle={activeSessionId === 'waffle' ? '🧇 Waffle Studio' : showSifuPanda ? '🎙️ Sifu Panda' : activeSession?.title}
            isMobile={isMobile}
            onConvertToProject={handleConvertToProject}
            onOpenSettings={() => setShowSettings(true)}
          />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

            {showProjects ? (
              <ProjectHub user={session?.user} onClose={() => setShowProjects(false)} />
            ) : showSifuPanda ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
                <div className="h-40 w-40 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-600/10 p-4 shadow-[0_0_64px_rgba(16,185,129,0.2)]">
                  <SifuPanda emotion={sifuEmotion} size={128} />
                </div>
                <h2 className="text-2xl font-bold text-white">Sifu Panda</h2>
                <p className="mt-1 text-sm text-white/40">Basılı tut ve konuş — DeepSeek zekasıyla yanıtlasın</p>

                {voice.interimText && (
                  <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-center text-sm italic text-white/60 backdrop-blur-xl">
                    &ldquo;{voice.interimText}&rdquo;
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onMouseDown={voice.startRecording}
                    onMouseUp={voice.stopRecording}
                    onTouchStart={(e) => { e.preventDefault(); voice.startRecording(); }}
                    onTouchEnd={(e) => { e.preventDefault(); voice.stopRecording(); }}
                    className={`flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all ${
                      voice.isRecording
                        ? 'scale-110 border-red-400/50 bg-red-500/20 shadow-[0_0_48px_rgba(239,68,68,0.3)]'
                        : 'border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_32px_rgba(16,185,129,0.15)] hover:border-emerald-500/60 hover:bg-emerald-500/15'
                    }`}
                    aria-label="Mikrofon"
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={voice.isRecording ? 'text-red-300' : 'text-emerald-300'}
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  </button>
                </div>

                {voice.isSpeaking && (
                  <div className="text-sm text-emerald-400/60 animate-pulse">Sifu Panda konuşuyor...</div>
                )}

                <button
                  type="button"
                  onClick={() => setShowSifuPanda(false)}
                  className="mt-4 rounded-xl border border-white/10 px-5 py-2 text-xs font-semibold text-white/40 transition-all hover:border-white/20 hover:text-white/60"
                >
                  Sohbete Dön
                </button>
              </div>
            ) : showLifeOS ? (
              <LifeOSHub />
            ) : activeSessionId === 'waffle' ? (
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
                onInputChange={setInputValue}
                  onSend={sendMessage}
                  isLoading={isLoading}
                  centered={false}
                  isMobile={isMobile}
                  {...voiceInputProps}
                />
              </>
            ) : (
              <WelcomeScreen
                isMobile={isMobile}
                inputValue={inputValue}
                onInputChange={setInputValue}
                onSend={sendMessage}
                isLoading={isLoading}
                onSelectView={handleSelectView}
                userEmail={session?.user?.email}
                {...voiceInputProps}
              />
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
