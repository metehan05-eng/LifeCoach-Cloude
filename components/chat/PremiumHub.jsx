import React from 'react';
import styles from './ProjectHub.module.css';

export default function PremiumHub({ onClose }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal} style={{ maxWidth: '600px', padding: '40px' }}>
        <button className={styles.closeOverlay} onClick={onClose}>✕</button>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
           <div style={{
              width: '64px', height: '64px', margin: '0 auto 16px', borderRadius: '20px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', boxShadow: '0 0 40px rgba(245,158,11,0.3)'
           }}>👑</div>
           <h1 style={{ fontSize: '28px', color: '#fff', marginBottom: '8px' }}>HAN AI Özel Erişim</h1>
           <p style={{ color: 'rgba(200,200,220,0.7)' }}>Günlük mesaj limitine ulaştın. Limitsiz sohbet, gelişmiş LPU motorları ve Proje Merkezi için Premium'a geç.</p>
        </div>

        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr' }}>
           <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px'
           }}>
              <h3 style={{ color: '#fff', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <span style={{ color: '#f59e0b' }}>⚡</span> Sınırsız Hız & Güç
              </h3>
              <ul style={{ color: 'rgba(200,200,220,0.8)', fontSize: '14px', lineHeight: 1.6, paddingLeft: '20px' }}>
                 <li>Sınırsız günlük mesaj gönderimi</li>
                 <li>Büyük bağlam pencereli (Context Window) dosya analizi</li>
                 <li>HAN OS & Cyber Security özel modülleri</li>
                 <li>Erken erişim (Gemini 2.0 / Llama 4 Scout)</li>
              </ul>
              
              <button 
                 onClick={() => window.open('https://lemonsqueezy.com', '_blank')}
                 style={{
                    marginTop: '8px', width: '100%', padding: '16px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                    fontSize: '16px', boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
                    transition: 'all 0.2s'
                 }}
              >
                 Kredi Kartı ile Geçiş Yap (LemonSqueezy)
              </button>

              <button 
                 onClick={() => alert("Kripto Cüzdan Adresi: 0xHAN... (Özellik yakında aktif edilecek)")}
                 style={{
                    width: '100%', padding: '16px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer', fontSize: '16px', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                 }}
              >
                 <span style={{ color: '#f59e0b' }}>₿</span> Kripto ile Öde (USDT/BTC)
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
