"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAppTheme } from '@/hooks/useAppTheme';
import styles from './SettingsModal.module.css';

export default function SettingsModal({ onClose, user, dna }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, setTheme, mounted } = useAppTheme();
  const [activeTab, setActiveTab] = useState('general');
  const [userBio, setUserBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const tabs = [
    { id: 'general', label: 'Genel', icon: '⚙️' },
    { id: 'aboutme', label: 'Beni Tanı', icon: '📝' },
    { id: 'account', label: 'Hesap', icon: '👤' },
    { id: 'dna', label: 'Life DNA', icon: '🧬' },
    { id: 'capabilities', label: 'Capabilities', icon: '⚡' },
    { id: 'connectors', label: 'Connectors', icon: '🔗' },
    { id: 'hancode', label: 'HAN Code', icon: '⚔️' },
    { id: 'notifications', label: 'Bildirimler', icon: '🔔' },
    { id: 'billing', label: 'Üyelik & Plan', icon: '💳' },
  ];

  useEffect(() => {
    if (loaded) return;
    fetch('/api/user/bio')
      .then(r => r.json())
      .then(d => { setUserBio(d.userBio || ''); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [loaded]);

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(d => { if (d?.name) setDisplayName(d.name); })
      .catch(() => {});
  }, []);

  const handleSaveName = async () => {
    if (!displayName.trim() || savingName) return;
    setSavingName(true);
    setNameSaved(false);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName.trim() }),
      });
      if (res.ok) {
        setNameSaved(true);
        setTimeout(() => setNameSaved(false), 2000);
      }
    } catch (e) { /* ignore */ }
    setSavingName(false);
  };

  const handleSaveBio = async () => {
    setSaving(true);
    try {
      await fetch('/api/user/bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userBio }),
      });
    } catch (e) { /* ignore */ }
    setSaving(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className={styles.section}>
            <h3>Profil Ayarları</h3>
            <div className={styles.field}>
              <label>Platform adı (AI sana nasıl hitap etsin?)</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={user?.name || 'Adın'}
              />
              <button
                className={styles.saveBtn}
                onClick={handleSaveName}
                disabled={savingName || !displayName.trim()}
                style={{ marginTop: '10px' }}
              >
                {savingName ? 'Kaydediliyor...' : nameSaved ? 'Kaydedildi ✓' : 'Kaydet'}
              </button>
            </div>
            <div className={styles.field}>
              <label>Görünüm</label>
              <div className={styles.toggleGroup}>
                <button
                  type="button"
                  className={mounted && theme === 'dark' ? styles.active : ''}
                  onClick={() => setTheme('dark')}
                >Koyu</button>
                <button
                  type="button"
                  className={mounted && theme === 'light' ? styles.active : ''}
                  onClick={() => setTheme('light')}
                >Açık</button>
                <button
                  type="button"
                  onClick={() => {
                    const sys = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
                    setTheme(sys);
                  }}
                >Sistem</button>
              </div>
            </div>
          </div>
        );

      case 'aboutme':
        return (
          <div className={styles.section}>
            <h3>Beni Tanı</h3>
            <div className={styles.bioHint}>
              <span>💡</span>
              <div>
                AI'ya kendini tanıt — hedeflerin, alışkanlıkların, zorlukların veya sana nasıl yaklaşmasını istediğin hakkında bir şeyler yaz. Bu bilgiler her sohbette sana özel daha doğru yanıtlar almanı sağlar.
              </div>
            </div>
            <div className={styles.field}>
              <label>AI'ya kendini tanıt</label>
              <textarea
                value={userBio}
                onChange={e => setUserBio(e.target.value)}
                placeholder={`Örnek:\n- 25 yaşında bir girişimciyim\n- Sabah 6'da kalkıp koşuyorum\n- En büyük zorluğum odaklanmak\n- Biraz sert ve direkt olmanı tercih ederim`}
              />
            </div>
            <button
              className={styles.saveBtn}
              onClick={handleSaveBio}
              disabled={saving}
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        );

      case 'dna':
        return (
          <div className={styles.section}>
            <h3>Gelişim DNA Analizi</h3>
            <p>AI'nın senin konuşmalarından çıkardığı karakter analizi.</p>
            <div className={styles.dnaGrid}>
              <div className={styles.dnaStat}>
                <span>Disiplin</span>
                <div className={styles.bar}><div style={{width: `${dna?.discipline || 65}%`}}></div></div>
              </div>
              <div className={styles.dnaStat}>
                <span>Odak</span>
                <div className={styles.bar}><div style={{width: `${dna?.focus || 80}%`}}></div></div>
              </div>
              <div className={styles.dnaStat}>
                <span>Dayanıklılık</span>
                <div className={styles.bar}><div style={{width: `${dna?.resilience || 45}%`}}></div></div>
              </div>
              <div className={styles.dnaStat}>
                <span>Vizyon</span>
                <div className={styles.bar}><div style={{width: `${dna?.vision || 90}%`}}></div></div>
              </div>
            </div>
          </div>
        );

      case 'capabilities':
        return (
          <div className={styles.section}>
            <h3>Gelişmiş Yetenekler</h3>
            <div className={styles.toggleRow}>
              <div>
                <strong>AI Hafızası (Memory)</strong>
                <span>Konuşmalardan bağlam devşirir.</span>
              </div>
              <input type="checkbox" defaultChecked />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <strong>Artifacts (Görselleştirme)</strong>
                <span>Kod ve tasarımları yan pencerede gösterir.</span>
              </div>
              <input type="checkbox" defaultChecked />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <strong>Kod Yürütme</strong>
                <span>Python ve JS kodlarını sunucuda çalıştırır.</span>
              </div>
              <input type="checkbox" defaultChecked />
            </div>
          </div>
        );

      case 'connectors':
        return (
          <div className={styles.section}>
            <h3>Bağlantılar (Connectors)</h3>
            <div className={styles.connectorList}>
              <div className={styles.connectorItem}>
                <div className={styles.connectorInfo}>
                  <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" width="24" />
                  <span>GitHub Integration</span>
                </div>
                <button className={styles.connBtn}>Bağla</button>
              </div>
              <div className={styles.connectorItem}>
                <div className={styles.connectorInfo}>
                   <div className={styles.gmailIcon}>M</div>
                  <span>Gmail & Google Workspace</span>
                </div>
                <button className={styles.connBtn}>Bağla</button>
              </div>
            </div>
          </div>
        );

      case 'hancode':
        return (
          <div className={styles.section}>
             <div className={styles.upgradeCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.badge}>Elite</span>
                  <h4>HAN Code ⚔️</h4>
                </div>
                <p>Elite AI Software Engineer. Mobil, web, desktop, backend - her şeyi yapabilir. Emergent Labs tarzında görsel IDE ile yazılım oluştur ve göster.</p>
                <button
                  className={styles.upgradeBtn}
                  onClick={() => {
                    onClose();
                    router.push('/hancode');
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  🚀 HAN Code IDE'ye Git
                </button>
             </div>
             <div className={styles.hancodeOptions}>
                <div className={styles.toggleRow}>
                  <span>✨ AI Powered Code Generation</span>
                  <input type="checkbox" defaultChecked disabled />
                </div>
                <div className={styles.toggleRow}>
                  <span>📱 Mobile Preview</span>
                  <input type="checkbox" defaultChecked disabled />
                </div>
                <div className={styles.toggleRow}>
                  <span>🌐 Web Preview</span>
                  <input type="checkbox" defaultChecked disabled />
                </div>
                <div className={styles.toggleRow}>
                  <span>🖥️ Desktop Support</span>
                  <input type="checkbox" defaultChecked disabled />
                </div>
                <div className={styles.toggleRow}>
                  <span>🎮 Game Development</span>
                  <input type="checkbox" defaultChecked disabled />
                </div>
                <div className={styles.toggleRow}>
                  <span>⚙️ Backend API</span>
                  <input type="checkbox" defaultChecked disabled />
                </div>
             </div>
          </div>
        );

      case 'account':
        return (
          <div className={styles.section}>
            <h3>Hesap Bilgileri</h3>
            <div className={styles.field}>
              <label>Email Adresi</label>
              <input type="text" disabled defaultValue={user?.email || 'Mevcut Değil'} />
            </div>

            <div style={{ marginTop: '32px' }} className={styles.upgradeCard}>
               <div className={styles.cardHeader}>
                 <span className={styles.badge} style={{ background: '#10b981', color: '#fff' }}>Viral Büyüme</span>
                 <h4>Arkadaşını Davet Et, 500 XP Kazan! 🚀</h4>
               </div>
               <p style={{ color: 'rgba(200,200,220,0.8)', fontSize: '14px', marginBottom: '16px' }}>
                 LifeCoach AI'nın sınırlarını arkadaşlarınla paylaş. Senin davet linkinle kayıt olan her kullanıcı için 500 XP kazanıp seviye atla!
               </p>
               <div style={{ display: 'flex', gap: '8px' }}>
                 <input
                    type="text"
                    readOnly
                    value={`https://han-ai.dev/invite/${user?.name?.toLowerCase() || 'link'}`}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                 />
                 <button
                    onClick={(e) => { navigator.clipboard.writeText(`https://han-ai.dev/invite/${user?.name?.toLowerCase() || 'link'}`); e.target.innerText = 'Kopyalandı!'; setTimeout(()=>e.target.innerText='Kopyala', 2000); }}
                    style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '0 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                 >
                    Kopyala
                 </button>
               </div>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className={styles.section}>
             <h3>Üyelik & Plan (Faturalandırma)</h3>
             <div className={styles.upgradeCard} style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.1))', borderColor: 'rgba(245,158,11,0.2)' }}>
                <div className={styles.cardHeader}>
                  <span className={styles.badge} style={{ background: '#f59e0b', color: '#fff' }}>Pro</span>
                  <h4 style={{ color: '#fff' }}>LifeCoach PRO'ya Geçiş Yap 👑</h4>
                </div>
                <ul style={{ color: 'rgba(200,200,220,0.8)', fontSize: '14px', lineHeight: 1.6, paddingLeft: '20px', marginBottom: '16px', marginTop: '12px' }}>
                   <li>Günlük kullanım limitini kaldır (Sınırsız)</li>
                   <li>Proje ve Otomasyon merkezine tam erişim</li>
                   <li>HAN 4.2 Ultra Core (Groq LPU) önceliği</li>
                </ul>
                <button
                  onClick={() => window.open('https://lemonsqueezy.com', '_blank')}
                  className={styles.upgradeBtn} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', width: '100%' }}>
                  Aboneliği Başlat ($9.90/ay)
                </button>
             </div>
          </div>
        );

      default:
        return <div className={styles.empty}>Bu özellik yakında aktif olacak.</div>;
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.topTabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.activeTab : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        <div className={styles.content}>
          {renderContent()}
          <button onClick={onClose} className={styles.closeBtn}>Kapat</button>
        </div>
      </div>
    </div>
  );
}
