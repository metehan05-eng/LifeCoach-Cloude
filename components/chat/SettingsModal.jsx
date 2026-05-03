"use client";
import React, { useState } from 'react';
import styles from './SettingsModal.module.css';

export default function SettingsModal({ onClose, user, dna }) {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'Genel', icon: '⚙️' },
    { id: 'account', label: 'Hesap', icon: '👤' },
    { id: 'dna', label: 'Life DNA', icon: '🧬' },
    { id: 'capabilities', label: 'Capabilities', icon: '⚡' },
    { id: 'connectors', label: 'Connectors', icon: '🔗' },
    { id: 'hancode', label: 'HAN Code', icon: '⚔️' },
    { id: 'notifications', label: 'Bildirimler', icon: '🔔' },
    { id: 'billing', label: 'Üyelik & Plan', icon: '💳' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className={styles.section}>
            <h3>Profil Ayarları</h3>
            <div className={styles.field}>
              <label>Paltform adı (AI sana nasıl hitap etsin?)</label>
              <input type="text" defaultValue={user?.name || 'Metehan'} />
            </div>
            <div className={styles.field}>
              <label>Görünüm</label>
              <div className={styles.toggleGroup}>
                <button className={styles.active}>Sistem</button>
                <button>Koyu</button>
                <button>Açık</button>
              </div>
            </div>
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
                  <span className={styles.badge}>Preview</span>
                  <h4>HAN Code ⚔️</h4>
                </div>
                <p>HAN AI codebase'ini anlar, bug'ları çözer ve pull request'leri otomatik yönetir.</p>
                <button className={styles.upgradeBtn}>Yükselt: Max veya Pro</button>
             </div>
             <div className={styles.hancodeOptions}>
                <div className={styles.toggleRow}>
                  <span>Pull request'leri otomatik oluştur</span>
                  <input type="checkbox" />
                </div>
                <div className={styles.toggleRow}>
                  <span>Hataları otomatik onar (Autofix)</span>
                  <input type="checkbox" />
                </div>
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
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>Ayarlar</div>
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
          <div className={styles.sidebarFooter}>
            <button onClick={onClose} className={styles.closeBtn}>Kapat</button>
          </div>
        </div>
        <div className={styles.content}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
