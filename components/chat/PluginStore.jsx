"use client";

import React, { useState, useEffect } from 'react';
import { PLUGIN_CATEGORIES, getPluginsByCategory } from '@/lib/plugins/plugin-registry';
import styles from './PluginStore.module.css';

export default function PluginStore({ onClose, activePlugins = [], onTogglePlugin }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);

  const groupedPlugins = getPluginsByCategory();

  useEffect(() => {
    // API'den veya registry'den plugin durumlarını çek
    fetch('/api/plugins')
      .then(res => res.json())
      .then(data => {
        if (data.plugins) {
          setPlugins(data.plugins);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleToggle = async (pluginId, currentStatus) => {
    const nextStatus = !currentStatus;
    // Yerel state güncelle
    setPlugins(prev => prev.map(p => p.id === pluginId ? { ...p, enabled: nextStatus } : p));
    
    // Üst bileşene bildir
    if (onTogglePlugin) {
      onTogglePlugin(pluginId, nextStatus);
    }

    try {
      await fetch('/api/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginId, enabled: nextStatus }),
      });
    } catch (e) {
      console.error('Plugin durumu kaydedilemedi:', e);
    }
  };

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          plugin.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const activeCount = plugins.filter(p => p.enabled).length;

  return (
    <div className={styles.container}>
      {/* Üst Bar & Başlık */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>🧩 HAN Plugin Store</h2>
          <p className={styles.subtitle}>Yapay zekanızı Yahoo Finance, Google Suite, GitHub, Supabase ve 20+ gelişmiş eklentiyle güçlendirin.</p>
        </div>
        <div className={styles.activeBadge}>
          ⚡ {activeCount} Eklenti Aktif
        </div>
      </div>

      {/* Arama ve Filtreleme */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Eklenti ara (ör. Yahoo Finance, Google Sheets, GitHub...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className={styles.clearBtn} onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        <div className={styles.categories}>
          <button
            className={`${styles.catBtn} ${selectedCategory === 'all' ? styles.catBtnActive : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            Tümü
          </button>
          {Object.entries(PLUGIN_CATEGORIES).map(([catKey, cat]) => (
            <button
              key={catKey}
              className={`${styles.catBtn} ${selectedCategory === catKey ? styles.catBtnActive : ''}`}
              onClick={() => setSelectedCategory(catKey)}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plugin Grid */}
      <div className={styles.grid}>
        {filteredPlugins.map(plugin => {
          const categoryInfo = PLUGIN_CATEGORIES[plugin.category] || {};
          return (
            <div key={plugin.id} className={`${styles.card} ${plugin.enabled ? styles.cardActive : ''}`}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIconBox} style={{ borderColor: `${categoryInfo.color}33` }}>
                  <span className={styles.cardIcon}>{plugin.icon}</span>
                </div>
                <div className={styles.cardTitleGroup}>
                  <div className={styles.cardNameRow}>
                    <h3 className={styles.cardName}>{plugin.name}</h3>
                    {plugin.enabled && <span className={styles.installedBadge}>Yüklü</span>}
                  </div>
                  <span className={styles.cardCategory} style={{ color: categoryInfo.color }}>
                    {categoryInfo.icon} {categoryInfo.label}
                  </span>
                </div>
              </div>

              <p className={styles.cardDescription}>{plugin.description}</p>

              <div className={styles.cardFooter}>
                {plugin.apiRequired ? (
                  <span className={styles.apiTag} title={`Gerekli API: ${plugin.apiRequired}`}>
                    🔑 API Anahtarı
                  </span>
                ) : (
                  <span className={styles.freeTag}>✨ Hazır / Ücretsiz</span>
                )}

                <button
                  className={`${styles.toggleBtn} ${plugin.enabled ? styles.btnDisable : styles.btnEnable}`}
                  onClick={() => handleToggle(plugin.id, plugin.enabled)}
                >
                  {plugin.enabled ? 'Kaldır' : 'Ekle'}
                </button>
              </div>
            </div>
          );
        })}

        {filteredPlugins.length === 0 && (
          <div className={styles.emptyState}>
            <span>🔎</span>
            <p>Aradığınız kriterlere uygun bir eklenti bulunamadı.</p>
          </div>
        )}
      </div>
    </div>
  );
}
