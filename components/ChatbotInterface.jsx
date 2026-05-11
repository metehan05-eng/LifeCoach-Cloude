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
  
  // SSR sırasında her zaman false döndür (hydration uyuşmazlığını önle)
  return isClient ? isMobile : false;
}

export default function ChatbotInterface() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [isMounted, setIsMounted] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // SSR için varsayılan
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamText, setStreamText] = useState('');
  const [deepSearch, setDeepSearch] = useState(false);
  const [userStats, setUserStats] = useState({ xp: 0, level: 1, currentStreak: 0 });
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showVision, setShowVision] = useState(false);

  // 1. Mount Kontrolü
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 2. Service Worker Kaydı (sadece client)
  useEffect(() => {
    if (!isMounted) return;
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log("Service Worker Kayıtlı:", reg);
        Notification.requestPermission();
      });
    }
  }, [isMounted]);

  // 3. Sessions Yükle (Kullanıcıya özel key) - sadece client'te
  // NOT: createNewSession'ı burada çağırmıyoruz, mount sonrası UI içinde kontrol edilecek
  useEffect(() => {
    if (!isMounted || !session?.user?.email) return;
    
    const userEmail = session.user.email;
    const storageKey = `lifeCoachSessions_${userEmail}`;
    
    // Zaten yüklendiyse tekrar yükleme
    if (sessions.length > 0) return;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const validSessions = parsed.filter(s => s.messages && s.messages.length > 0);
        setSessions(validSessions);
        // NOT: Otomatik ilk session'ı seçmiyoruz - kullanıcı "Yeni Sohbet" ile başlamalı
        // veya sidebar'dan eski bir konuşma seçmeli
      }
    } catch (e) {
      console.error("Session yükleme hatası:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, session]);

  // 4. Stats Çek
  useEffect(() => {
    if (!isMounted || !session?.user?.email) return;
    
    fetch(`/api/chat?email=${session.user.email}&just_stats=true`)
      .then(res => res.json())
      .then(data => {
         if (data.stats) setUserStats(data.stats);
      }).catch(e => console.log("Stats fetch error"));
  }, [isMounted, session]);

  // Sohbetleri her değişimde kaydet (Sadece mesajı olanları)
  useEffect(() => {
    const currentUserEmail = session?.user?.email;
    if (isMounted && sessions.length > 0 && currentUserEmail) {
      const toSave = sessions.filter(s => s.messages && s.messages.length > 0);
      const storageKey = `lifeCoachSessions_${currentUserEmail}`;
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    }
  }, [sessions, isMounted, session]);

  // UI state adjustment - only after client mount
  useEffect(() => {
    if (isMounted) {
      // Sadece client tarafında sidebar durumunu güncelle
      setSidebarOpen(!isMobile);
    }
  }, [isMounted, isMobile]);

  // Auth protection
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
    setError(null);
    if (isMobile) setSidebarOpen(false);
    return { id: tempId, timestamp };
  }, [isMobile]);

  const deleteSession = useCallback((id) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (remaining.length === 0) {
        const timestamp = Date.now();
        const fresh = { id: timestamp, title: 'Yeni Sohbet', messages: [], createdAt: timestamp };
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === id) setActiveSessionId(remaining[0].id);
      return remaining;
    });
  }, [activeSessionId]);

  const sendMessage = useCallback(async (text, attachments = []) => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;
    setError(null);

    // Hazır ekleri içeren bir kullanıcı mesajı oluştur
    const attachmentPreviews = attachments.map(a => ({
      id: a.id,
      name: a.name,
      extension: a.extension,
      type: a.type,
      preview: a.preview // Görüntüler için base64, diğerleri için null
    }));

    const userMsg = { 
      role: 'user', 
      content: text, 
      id: Date.now(),
      attachments: attachmentPreviews
    };

    // Eğer aktif session bir "geçici/boş" session ise (listede yoksa), yeni session olarak ekle
    const currentSessionExists = sessions.some(s => s.id === activeSessionId);
    let targetSessionId = activeSessionId;
    
    if (!currentSessionExists) {
      const realId = Date.now();
      targetSessionId = realId;
      const newSession = { 
        id: realId, 
        title: text ? text.slice(0, 42) : (attachments[0]?.name || 'Yeni Sohbet'), 
        messages: [userMsg], 
        createdAt: new Date() 
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(realId);
    } else {
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, userMsg] }
          : s
      ));
    }

    setIsLoading(true);
    setIsTyping(true);
    setStreamText('');

    const history = messages.map(m => ({ role: m.role, content: m.content }));

    try {
      // Dosya içeriklerini hazırla
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
          message: text, 
          history, 
          attachments: preparedAttachments,
          sessionId: targetSessionId, 
          email: session?.user?.email,
          deepSearch: deepSearch  // 🔍 Kullanıcının seçtiği arama modu
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "LIMIT_REACHED") {
            setShowPremium(true);
            setStreamText('');
            // Pre-mature exit, remove the message from local state
            setSessions(prev => prev.map(s => s.id === targetSessionId ? { ...s, messages: s.messages.filter(m => m.id !== Date.now()) } : s));
            throw new Error(data.message);
        }
        throw new Error(data.details || data.error || 'Sunucu hatası');
      }

      const aiText = data.reply || data.response;
      if (!aiText) throw new Error("Empty response");
      const aiSources = data.sources || [];  // Tavily'den gelen kaynaklar

      let displayed = '';
      const words = aiText.split(' ');
      for (let i = 0; i < words.length; i++) {
        displayed += (i === 0 ? '' : ' ') + words[i];
        setStreamText(displayed);
        await new Promise(r => setTimeout(r, 16));
      }

      setSessions(prev => prev.map(s =>
        s.id === targetSessionId
          ? { ...s, messages: [...s.messages, { 
              role: 'assistant', 
              content: aiText, 
              id: Date.now(),
              sources: aiSources  // 🔗 Tıklanabilir kaynaklar
            }] }
          : s
      ));
      setStreamText('');
      // Deep search'i otomatik sıfırla (tek seferlik arama)
      if (deepSearch) setDeepSearch(false);
    } catch (err) {
      setError("Hata oldu daha sonra tekrar deneyin");
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  }, [activeSessionId, sessions, isMounted, userStats, session, isLoading]);
  
  const handleConvertToProject = useCallback(() => {
    if (!activeSession || activeSession.messages.length === 0) return;
    alert(`📁 "${activeSession.title}" projesi başarıyla oluşturuldu! \nArtık "Projelerim" sekmesinden takip edebilirsin.`);
  }, [activeSession]);

  const handleQuickAction = useCallback((text) => {
    if (isLoading) return;
    sendMessage(text);
  }, [sendMessage, isLoading]);

  const toggleSidebar = () => setSidebarOpen(p => !p);

  // SSR/Client hydration uyuşmazlığını önlemek için mount öncesi boş placeholder göster
  if (!isMounted) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        background: '#0c0c18',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: 'rgba(99,102,241,0.5)', fontSize: '14px' }}>Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* ... orbs ... */}
      
      {showLeaderboard && (
        <Leaderboard 
          userEmail={session?.user?.email} 
          isMobile={isMobile} 
          onClose={() => setShowLeaderboard(false)} 
        />
      )}

      {showAutomation && (
        <AutomationWorkbench 
          userEmail={session?.user?.email} 
          isMobile={isMobile} 
          onClose={() => setShowAutomation(false)} 
        />
      )}

      {showSettings && (
        <SettingsModal 
          user={{...session?.user, ...userStats}} 
          onClose={() => setShowSettings(false)} 
        />
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
              if (id === 'leaderboard') {
                 setShowLeaderboard(true);
              } else if (id === 'automation') {
                 setShowAutomation(true);
              } else if (id === 'projects') {
                 setShowProjects(true);
              } else {
                 setActiveSessionId(id);
                 setShowProjects(false);
              }
              if (isMobile) setSidebarOpen(false);
            }}
            onNewSession={createNewSession}
            onDeleteSession={deleteSession}
            isOpen={isMobile ? true : sidebarOpen}
            user={{...session?.user, ...userStats}}
            onToggle={toggleSidebar}
          />
        </div>

        {/* Main content */}
        <div className={styles.main}>
          <ChatHeader
            onToggleSidebar={toggleSidebar}
            sidebarOpen={sidebarOpen}
            sessionTitle={activeSessionId === 'waffle' ? 'Waffle AI Studio' : activeSession?.title}
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
                    onToggleVision={() => setShowVision(p => !p)}
                    deepSearch={deepSearch}
                    onToggleDeepSearch={() => setDeepSearch(p => !p)}
                  />
                </div>

                {/* Quick Action Buttons Container */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row', 
                  gap: '16px', 
                  width: '100%', 
                  justifyContent: 'center',
                  alignItems: 'stretch',
                  maxWidth: '700px',
                  marginBottom: '16px'
                }}>
                  {/* Goal Button */}
                  <button
                    onClick={() => handleQuickAction("Yeni bir hedef belirlemek istiyorum. Bana SMART (Belirli, Ölçülebilir, Ulaşılabilir, İlgili, Zamana Bağlı) kriterlerine uygun bir yol haritası çıkarmamda rehberlik eder misin?")}
                    style={{
                      flex: isMobile ? 'none' : '1',
                      padding: isMobile ? '14px 24px' : '16px 32px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                      border: '1px solid rgba(139,92,246,0.3)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: isMobile ? '14px' : '15px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 20px rgba(139,92,246,0.15)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(139,92,246,0.3)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(139,92,246,0.15)';
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>🎯</span>
                    <span>Şimdi Hedefini Belirle</span>
                  </button>

                  {/* Automation Button */}
                  <button
                    onClick={() => setShowAutomation(true)}
                    style={{
                      flex: isMobile ? 'none' : '1',
                      padding: isMobile ? '14px 24px' : '16px 32px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 179, 8, 0.1))',
                      border: '1px solid rgba(234, 179, 8, 0.25)',
                      color: '#fbbf24',
                      fontWeight: 800,
                      fontSize: isMobile ? '14px' : '15px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 20px rgba(234, 179, 8, 0.1)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(234, 179, 8, 0.25)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(234, 179, 8, 0.1)';
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>⚡</span>
                    <span>Life Automation Kur</span>
                  </button>
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
          </>
        )}
      </div>
    </div>
  </div>

      <style>{`
        @keyframes ci-float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes ci-pulse {
          0% { transform: translate(-30%, -30%) scale(0.8); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: translate(30%, 30%) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
