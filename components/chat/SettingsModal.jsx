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
  const [integrations, setIntegrations] = useState([]);
  const [connecting, setConnecting] = useState(null);

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

  useEffect(() => {
    fetch('/api/integrations')
      .then(r => r.json())
      .then(d => { if (d.integrations) setIntegrations(d.integrations); })
      .catch(() => {});
  }, []);

  const handleToggleIntegration = async (type, action) => {
    setConnecting(type);
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, action }),
      });
      const data = await res.json();
      if (data.integrations) setIntegrations(data.integrations);
    } catch (e) { /* ignore */ }
    setConnecting(null);
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
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Platform adı (AI sana nasıl hitap etsin?)</label>
              <input
                type="text"
                className={styles.fieldInput}
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
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Görünüm</label>
              <div className={styles.toggleGroup}>
                <button
                  type="button"
                  className={`${styles.toggleGroupBtn} ${mounted && theme === 'dark' ? styles.toggleGroupBtnActive : ''}`}
                  onClick={() => setTheme('dark')}
                >Koyu</button>
                <button
                  type="button"
                  className={`${styles.toggleGroupBtn} ${mounted && theme === 'light' ? styles.toggleGroupBtnActive : ''}`}
                  onClick={() => setTheme('light')}
                >Açık</button>
                <button
                  type="button"
                  className={styles.toggleGroupBtn}
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
            <div className={styles.bioHint}>
              <span>💡</span>
              <div>
                AI'ya kendini tanıt — hedeflerin, alışkanlıkların, zorlukların veya sana nasıl yaklaşmasını istediğin hakkında bir şeyler yaz. Bu bilgiler her sohbette sana özel daha doğru yanıtlar almanı sağlar.
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>AI'ya kendini tanıt</label>
              <textarea
                className={styles.fieldTextarea}
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
            <p className={styles.sectionDesc}>AI'nın senin konuşmalarından çıkardığı karakter analizi.</p>
            <div className={styles.dnaGrid}>
              <div className={styles.dnaStat}>
                <div className={styles.dnaStatLabel}>
                  <span>Disiplin</span>
                  <span className={styles.dnaStatVal}>{dna?.discipline || 65}%</span>
                </div>
                <div className={styles.dnaBar}><div className={styles.dnaBarFill} style={{width: `${dna?.discipline || 65}%`}}></div></div>
              </div>
              <div className={styles.dnaStat}>
                <div className={styles.dnaStatLabel}>
                  <span>Odak</span>
                  <span className={styles.dnaStatVal}>{dna?.focus || 80}%</span>
                </div>
                <div className={styles.dnaBar}><div className={styles.dnaBarFill} style={{width: `${dna?.focus || 80}%`}}></div></div>
              </div>
              <div className={styles.dnaStat}>
                <div className={styles.dnaStatLabel}>
                  <span>Dayanıklılık</span>
                  <span className={styles.dnaStatVal}>{dna?.resilience || 45}%</span>
                </div>
                <div className={styles.dnaBar}><div className={styles.dnaBarFill} style={{width: `${dna?.resilience || 45}%`}}></div></div>
              </div>
              <div className={styles.dnaStat}>
                <div className={styles.dnaStatLabel}>
                  <span>Vizyon</span>
                  <span className={styles.dnaStatVal}>{dna?.vision || 90}%</span>
                </div>
                <div className={styles.dnaBar}><div className={styles.dnaBarFill} style={{width: `${dna?.vision || 90}%`}}></div></div>
              </div>
            </div>
          </div>
        );

      case 'capabilities':
        return (
          <div className={styles.section}>
            <p className={styles.sectionDesc}>Uygulama yeteneklerini buradan yönetebilirsiniz.</p>
            <div className={styles.toggleRow}>
              <div className={styles.toggleRowLeft}>
                <strong>AI Hafızası (Memory)</strong>
                <span>Konuşmalardan bağlam devşirir.</span>
              </div>
              <input type="checkbox" defaultChecked />
            </div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleRowLeft}>
                <strong>Artifacts (Görselleştirme)</strong>
                <span>Kod ve tasarımları yan pencerede gösterir.</span>
              </div>
              <input type="checkbox" defaultChecked />
            </div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleRowLeft}>
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
            <p className={styles.sectionDesc}>Harici servis entegrasyonlarını buradan bağlayabilirsiniz.</p>
            <div className={styles.connectorList}>
              {integrations.length === 0 && (
                <div className={styles.empty}>Entegrasyon yükleniyor...</div>
              )}
              {integrations.map((intg) => (
                <div key={intg.type} className={styles.connectorItem}>
                  <div className={styles.connectorInfo}>
                    <div className={styles.gmailIcon}>M</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{intg.label}</span>
                        {intg.connected && (
                          <span className={styles.connectedBadge}>Bağlı</span>
                        )}
                        {!intg.available && (
                          <span className={styles.unavailableBadge}>Yapılandırılmamış</span>
                        )}
                      </div>
                      {intg.description && (
                        <div className={styles.connectorDesc}>{intg.description}</div>
                      )}
                    </div>
                  </div>
                  <button
                    className={intg.connected ? styles.connBtnDisconnect : styles.connBtn}
                    onClick={() => handleToggleIntegration(intg.type, intg.connected ? 'disconnect' : 'connect')}
                    disabled={connecting === intg.type || !intg.available}
                  >
                    {connecting === intg.type
                      ? 'İşleniyor...'
                      : intg.connected
                        ? 'Bağlantıyı Kes'
                        : 'Bağla'}
                  </button>
                </div>
              ))}
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
                >
                  🚀 HAN Code IDE'ye Git
                </button>
             </div>
             <div className={styles.hancodeOptions}>
                <div className={styles.toggleRow}>
                  <div className={styles.toggleRowLeft}>
                    <span>✨ AI Powered Code Generation</span>
                  </div>
                  <input type="checkbox" defaultChecked disabled />
                </div>
                <div className={styles.toggleRow}>
                  <div className={styles.toggleRowLeft}>
                    <span>📱 Mobile Preview</span>
                  </div>
                  <input type="checkbox" defaultChecked disabled />
                </div>
                <div className={styles.toggleRow}>
                  <div className={styles.toggleRowLeft}>
                    <span>🌐 Web Preview</span>
                  </div>
                  <input type="checkbox" defaultChecked disabled />
                </div>
                <div className={styles.toggleRow}>
                  <div className={styles.toggleRowLeft}>
                    <span>🖥️ Desktop Support</span>
                  </div>
                  <input type="checkbox" defaultChecked disabled />
                </div>
                <div className={styles.toggleRow}>
                  <div className={styles.toggleRowLeft}>
                    <span>🎮 Game Development</span>
                  </div>
                  <input type="checkbox" defaultChecked disabled />
                </div>
                <div className={styles.toggleRow}>
                  <div className={styles.toggleRowLeft}>
                    <span>⚙️ Backend API</span>
                  </div>
                  <input type="checkbox" defaultChecked disabled />
                </div>
             </div>
          </div>
        );

      case 'account':
        return (
          <div className={styles.section}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Email Adresi</label>
              <input type="text" className={styles.fieldInput} disabled defaultValue={user?.email || 'Mevcut Değil'} />
            </div>

            <div style={{ marginTop: '24px' }} className={styles.upgradeCard}>
               <div className={styles.cardHeader}>
                 <span className={styles.badge} style={{ background: '#10b981', color: '#fff' }}>Viral Büyüme</span>
                 <h4>Arkadaşını Davet Et, 500 XP Kazan! 🚀</h4>
               </div>
               <p style={{ color: 'rgba(200,200,220,0.8)', fontSize: '13px', marginBottom: '14px' }}>
                 LifeCoach AI'nın sınırlarını arkadaşlarınla paylaş. Senin davet linkinle kayıt olan her kullanıcı için 500 XP kazanıp seviye atla!
               </p>
               <div className={styles.inviteRow}>
                 <input
                    type="text"
                    readOnly
                    className={styles.inviteInput}
                    value={`https://han-ai.dev/invite/${user?.name?.toLowerCase() || 'link'}`}
                 />
                 <button
                    className={styles.copyBtn}
                    onClick={(e) => { navigator.clipboard.writeText(`https://han-ai.dev/invite/${user?.name?.toLowerCase() || 'link'}`); e.target.innerText = 'Kopyalandı!'; setTimeout(()=>e.target.innerText='Kopyala', 2000); }}
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
             <div className={styles.upgradeCard} style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.06))', borderColor: 'rgba(245,158,11,0.2)' }}>
                <div className={styles.cardHeader}>
                  <span className={styles.badge} style={{ background: '#f59e0b', color: '#fff' }}>Pro</span>
                  <h4 style={{ color: '#fff' }}>LifeCoach PRO'ya Geçiş Yap 👑</h4>
                </div>
                <ul style={{ color: 'rgba(200,200,220,0.8)', fontSize: '13px', lineHeight: 1.6, paddingLeft: '20px', marginBottom: '14px', marginTop: '12px' }}>
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
        {/* Sol Panel: Sekmeler */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>Ayarlar</div>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.activeTab : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sağ Panel: İçerik */}
        <div className={styles.content}>
          <div className={styles.contentHeader}>
            <h2 className={styles.contentTitle}>
              {tabs.find(t => t.id === activeTab)?.label || 'Ayarlar'}
            </h2>
            <button onClick={onClose} className={styles.closeBtn} title="Kapat">✕</button>
          </div>
          <div className={styles.contentBody}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
