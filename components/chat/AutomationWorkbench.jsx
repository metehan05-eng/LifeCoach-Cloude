"use client";
import React, { useState, useEffect } from 'react';
import styles from './AutomationWorkbench.module.css';

export default function AutomationWorkbench({ userEmail, isMobile, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Merhaba! Ben Yaşam Otomasyonu Mimarı. Bugün hangi rutini otomatiğe bağlayalım? (Örn: Her sabah 8:00\'de spor yapmak istiyorum)' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [detectedTask, setDetectedTask] = useState(null); // { title, time, repeat, duration }

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const userMsg = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          email: userEmail,
          automation_mode: true // AI can recognize it's for automation
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      
      // Parse structured data from AI (if any)
      if (data.automation_data) {
        setDetectedTask(data.automation_data);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const saveAutomation = async () => {
    if (!detectedTask) return;
    setLoading(true);
    try {
      // 1. Subscribe to Push Notification First
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // Note: In real production, you need a VAPID public key from env
          applicationServerKey: 'BEOE_G22pB70w-B_kZf-wB_kZf-wB_kZf-wB_kZf-wB_kZf-wB_kZf-wB_kZf-wB_kZf-w' 
        });
        
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            subscription: sub.toJSON()
          })
        });
      }

      // 2. Save Task
      await fetch('/api/gamify/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, ...detectedTask })
      });
      setMessages(prev => [...prev, { role: 'assistant', content: '✅ Harika! Otomasyonun başarıyla kuruldu. Zamanı geldiğinde seni uyaracağım.' }]);
      setDetectedTask(null);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
             <h3>⚡ Life Automation Workbench</h3>
             <span>n8n Powered Routine Engine</span>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        <div className={styles.content}>
          {/* Left: Chat Area */}
          <div className={styles.chatArea}>
            <div className={styles.messages}>
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'assistant' ? styles.aiMsg : styles.userMsg}>
                  {m.content}
                </div>
              ))}
              {loading && <div className={styles.aiMsg}>...</div>}
            </div>
            <div className={styles.inputArea}>
              <input 
                value={inputValue} 
                onChange={e => setInputValue(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSend()}
                placeholder="Otomasyon isteğini yaz..."
              />
              <button onClick={handleSend}>Gönder</button>
            </div>
          </div>

          {/* Right: Visualization (n8n style) */}
          <div className={styles.vizArea}>
             <div className={styles.vizTitle}>AKIM ŞEMASI</div>
             {detectedTask ? (
               <div className={styles.nodesContainer}>
                  <div className={styles.node}>
                    <div className={styles.nodeIcon}>⏰</div>
                    <div className={styles.nodeName}>Tetikleyici</div>
                    <div className={styles.nodeVal}>{detectedTask.time} ({detectedTask.repeat})</div>
                  </div>
                  <div className={styles.connector}></div>
                  <div className={styles.node}>
                    <div className={styles.nodeIcon}>🎯</div>
                    <div className={styles.nodeName}>Eylem</div>
                    <div className={styles.nodeVal}>{detectedTask.title}</div>
                  </div>
                  <button className={styles.confirmBtn} onClick={saveAutomation}>
                    Otomasyonu Başlat
                  </button>
               </div>
             ) : (
               <div className={styles.emptyViz}>
                 Henüz bir otomasyon algılanmadı. AI'ya ne yapmak istediğini anlat.
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
