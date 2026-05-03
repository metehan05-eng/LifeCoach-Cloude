"use client";
import React, { useState } from 'react';
import styles from './SettingsModal.module.css';

export default function SettingsModal({ onClose, user, dna }) {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'Genel', icon: '⚙️' },
    { id: 'account', label: 'Hesap', icon: '👤' },
    { id: 'dna', label: 'Life DNA', icon: '🧬' },
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
