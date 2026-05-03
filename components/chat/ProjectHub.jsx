"use client";
import React, { useState } from 'react';
import styles from './ProjectHub.module.css';

export default function ProjectHub({ user, onClose }) {
  const [view, setView] = useState('list'); // list, create, detail
  const [isMounted, setIsMounted] = useState(false);
  const [projects, setProjects] = useState([
    { id: '1', name: 'Software engine', description: 'bir yazılım projesi üzerinde bir işletim sistemi olacak', updatedAt: '8 saniye önce' }
  ]);
  const [activeProject, setActiveProject] = useState(null);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className={styles.overlay}>
       <div className={styles.modal} style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', textAlign: 'center' }}>
          <button className={styles.closeOverlay} onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px' }}>✕</button>
          
          <div style={{
              width: '80px', height: '80px', margin: '0 auto 24px', borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '40px', border: '1px solid rgba(139,92,246,0.3)',
              boxShadow: '0 0 60px rgba(139,92,246,0.2)'
          }}>
             🚀
          </div>
          
          <h1 style={{ fontSize: '32px', color: '#fff', marginBottom: '12px', background: 'linear-gradient(135deg, #818cf8, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
             Proje Merkezi Yakında!
          </h1>
          
          <p style={{ color: 'rgba(200,200,220,0.7)', fontSize: '16px', lineHeight: 1.6, marginBottom: '32px', maxWidth: '480px' }}>
             Tüm stratejik hedeflerini, dökümanlarını ve dosyalarını tek bir merkezden yapay zeka ile yönetebileceğin devrim niteliğinde bir çalışma alanı inşa ediyoruz. 
          </p>

          <div style={{
             background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(139,92,246,0.4)',
             borderRadius: '16px', padding: '24px', width: '100%'
          }}>
             <h3 style={{ color: '#a5b4fc', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Neler Gelecek?</h3>
             <ul style={{ color: '#fff', fontSize: '14px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', margin: 0, padding: '0 20px' }}>
                <li>📄 <b>Sınırsız Dosya Analizi:</b> PDF'ler, kod blokları ve dökümanlardan oluşan bilgi havuzları.</li>
                <li>🧠 <b>Bağlamsal Zeka:</b> Projelerine özel AI talimatları ve karakter yapılandırması.</li>
                <li>⚔️ <b>HAN Code Entegrasyonu:</b> Proje bazlı kod onarımı ve GitHub yönetimi.</li>
             </ul>
          </div>
          
          <button 
             onClick={onClose}
             style={{
                marginTop: '32px', padding: '16px 40px', borderRadius: '12px',
                background: '#fff', color: '#030308', fontWeight: 'bold', border: 'none',
                cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s',
                boxShadow: '0 0 20px rgba(255,255,255,0.2)'
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
