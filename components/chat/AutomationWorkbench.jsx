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
       <div className={styles.container} style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', textAlign: 'center', height: 'auto', minHeight: '500px' }}>
          <button className={styles.closeBtn} onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px' }}>✕</button>
          
          <div style={{
              width: '80px', height: '80px', margin: '0 auto 24px', borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.1))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '40px', border: '1px solid rgba(245,158,11,0.3)',
              boxShadow: '0 0 60px rgba(245,158,11,0.2)'
          }}>
             ⚙️
          </div>
          
          <h1 style={{ fontSize: '32px', color: '#fff', marginBottom: '12px', background: 'linear-gradient(135deg, #fcd34d, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
             Life Automation Yakında!
          </h1>
          
          <p style={{ color: 'rgba(200,200,220,0.7)', fontSize: '16px', lineHeight: 1.6, marginBottom: '32px', maxWidth: '480px' }}>
             Otonom rutinler ve <b>n8n</b> entegrasyonumuz ile sen uyurken bile senin için çalışacak yapay zeka ajanları yolda. WhatsApp, Takvim, ve Mail otomasyonları tek tık uzağında olacak.
          </p>

          <button 
             onClick={onClose}
             style={{
                marginTop: '16px', padding: '16px 40px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontWeight: 'bold', border: 'none',
                cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s',
                boxShadow: '0 0 20px rgba(245,158,11,0.4)'
             }}
             onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
             onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
             Sohbete Geri Dön
          </button>
       </div>
    </div>
  );
}
