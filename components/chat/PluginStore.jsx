"use client";

import React, { useState, useEffect } from 'react';
import { PLUGIN_CATEGORIES, getPluginsByCategory } from '@/lib/plugins/plugin-registry';
import styles from './PluginStore.module.css';

export default function PluginStore({ onClose, activePlugins = [], onTogglePlugin, onStartPluginChat }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPrompt, setExpandedPrompt] = useState(null);

  useEffect(() => {
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
    setPlugins(prev => prev.map(p => p.id === pluginId ? { ...p, enabled: nextStatus } : p));
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
          <div className="flex items-center gap-3 mb-1">
            <h2 className={styles.title}>🧩 HAN Plugin Store</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Qwen 2.5 AI Powered
            </span>
          </div>
          <p className={styles.subtitle}>
            Gelişmiş eklentileri etkinleştirin. Aktif eklentilerinizle **Qwen Yapay Zeka Modeli** üzerinden özel ve izole sohbet başlatabilirsiniz.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={styles.activeBadge}>
            ⚡ {activeCount} Eklenti Aktif
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-white transition-all"
            >
              ← Ana Sayfa
            </button>
          )}
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

              {plugin.systemPrompt && (
                <div className="mt-2 mb-2">
                  <button
                    onClick={() => setExpandedPrompt(expandedPrompt === plugin.id ? null : plugin.id)}
                    className="text-[10px] text-white/30 hover:text-white/60 transition flex items-center gap-1"
                  >
                    <span>{expandedPrompt === plugin.id ? '▾' : '▸'}</span>
                    System Prompt
                  </button>
                  {expandedPrompt === plugin.id && (
                    <pre className="mt-1.5 p-2.5 bg-black/40 rounded-lg text-[10px] text-white/60 leading-relaxed whitespace-pre-wrap font-sans border border-white/[0.06]">
                      {plugin.systemPrompt}
                    </pre>
                  )}
                </div>
              )}

              <div className={styles.cardFooter}>
                {plugin.enabled ? (
                  <button
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:brightness-110 transition-all flex items-center gap-1.5 shadow-lg shadow-violet-900/30"
                    onClick={() => onStartPluginChat?.(plugin)}
                  >
                    <span>💬</span> Qwen ile Konuş
                  </button>
                ) : (
                  plugin.apiRequired ? (
                    <span className={styles.apiTag} title={`Gerekli API: ${plugin.apiRequired}`}>
                      🔑 API Anahtarı
                    </span>
                  ) : (
                    <span className={styles.freeTag}>✨ Ücretsiz</span>
                  )
                )}

                <button
                  className={`${styles.toggleBtn} ${plugin.enabled ? styles.btnDisable : styles.btnEnable}`}
                  onClick={() => handleToggle(plugin.id, plugin.enabled)}
                >
                  {plugin.enabled ? 'Kaldır' : 'Aktif Et'}
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
