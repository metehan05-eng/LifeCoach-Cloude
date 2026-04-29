"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatSidebar from './chat/ChatSidebar';
import ChatMessages from './chat/ChatMessages';
import ChatInput from './chat/ChatInput';
import ChatHeader from './chat/ChatHeader';
import ParticleBackground from './chat/ParticleBackground';
import styles from './ChatbotInterface.module.css';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ChatbotInterface() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sessions, setSessions] = useState([
    { id: 1, title: 'Yeni Sohbet', messages: [], createdAt: new Date() }
  ]);
  const [activeSessionId, setActiveSessionId] = useState(1);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamText, setStreamText] = useState('');
  const abortRef = useRef(null);

  // Auth protection
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  const createNewSession = useCallback(() => {
    const newId = Date.now();
    const newSession = {
      id: newId,
      title: 'Yeni Sohbet',
      messages: [],
      createdAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setError(null);
  }, []);

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
        ? {
            ...s,
            title: s.messages.length === 0 ? text.slice(0, 40) : s.title,
            messages: [...s.messages, userMsg]
          }
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
          fingerprintID: 'web-client',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Sunucu hatası');
      }

      const data = await res.json();
      const aiText = data.response || '(Boş yanıt)';

      // Simulate streaming for UX
      let displayed = '';
      const words = aiText.split(' ');
      for (let i = 0; i < words.length; i++) {
        displayed += (i === 0 ? '' : ' ') + words[i];
        setStreamText(displayed);
        await new Promise(r => setTimeout(r, 18));
      }

      const aiMsg = { role: 'assistant', content: aiText, id: Date.now() };
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, aiMsg] }
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

  return (
    <div className={styles.root}>
      <ParticleBackground />

      {/* Ambient orbs */}
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />

      <div className={styles.layout}>
        {/* Sidebar */}
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewSession={createNewSession}
          onDeleteSession={deleteSession}
          isOpen={sidebarOpen}
          user={session?.user}
          onToggle={() => setSidebarOpen(p => !p)}
        />

        {/* Main */}
        <div className={styles.main}>
          <ChatHeader
            onToggleSidebar={() => setSidebarOpen(p => !p)}
            sidebarOpen={sidebarOpen}
            sessionTitle={activeSession?.title}
          />

          <ChatMessages
            messages={messages}
            isTyping={isTyping}
            streamText={streamText}
            error={error}
          />

          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={sendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
