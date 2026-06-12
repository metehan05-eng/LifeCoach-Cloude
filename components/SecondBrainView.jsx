"use client";
import React, { useState, useEffect } from 'react';

const TYPE_ICONS = {
  idea: '💡', note: '📝', goal: '🎯', document: '📄',
  voice: '🎤', link: '🔗', bookmark: '🔖', journal: '📔',
};

const TYPE_LABELS = {
  idea: 'Fikir', note: 'Not', goal: 'Hedef', document: 'Belge',
  voice: 'Ses Kaydı', link: 'Link', bookmark: 'Yer İmi', journal: 'Günlük',
};

export default function SecondBrainView() {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ type: 'note', title: '', content: '', category: '', tags: '' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [entryRes, sumRes] = await Promise.all([
        fetch('/api/secondbrain/search?limit=50'),
        fetch('/api/secondbrain/summary'),
      ]);
      const entryData = await entryRes.json();
      const sumData = await sumRes.json();
      if (entryData.success) setEntries(entryData.entries);
      if (sumData.success) setSummary(sumData.summary);
    } catch (err) {
      console.error('SecondBrain load error:', err);
    }
    setLoading(false);
  }

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/secondbrain/search?q=${encodeURIComponent(searchQuery)}&limit=50`);
      const data = await res.json();
      if (data.success) setEntries(data.entries);
    } catch (err) {
      console.error('Search error:', err);
    }
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    try {
      const res = await fetch('/api/secondbrain/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEntry,
          tags: newEntry.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewEntry({ type: 'note', title: '', content: '', category: '', tags: '' });
        loadData();
      }
    } catch (err) {
      console.error('Add error:', err);
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">🧠 İkinci Beyin</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg"
        >
          + Yeni Ekle
        </button>
      </div>

      {summary && (
        <div className="flex gap-2 mb-3 text-xs text-gray-400">
          <span>📦 {summary.totalEntries} öğe</span>
          <span>⭐ {summary.favoriteCount} favori</span>
        </div>
      )}

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="İkinci beyninde ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 p-2 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500"
        />
        <button type="submit" className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">
          Ara
        </button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Yükleniyor...</div>
        ) : entries.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Henüz bir şey kaydedilmemiş. Fikirlerini, notlarını ve hedeflerinizi burada saklayabilirsin.
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="p-3 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-600 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span>{TYPE_ICONS[entry.type] || '📄'}</span>
                <span className="font-medium text-sm">{entry.title}</span>
                {entry.isFavorite && <span className="text-yellow-400">⭐</span>}
              </div>
              <p className="text-sm text-gray-400 line-clamp-2">{entry.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                  {TYPE_LABELS[entry.type] || entry.type}
                </span>
                {entry.category && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                    {entry.category}
                  </span>
                )}
                <span className="text-xs text-gray-600 ml-auto">
                  {new Date(entry.createdAt).toLocaleDateString('tr-TR')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <form onSubmit={handleAdd} className="bg-gray-800 p-6 rounded-xl w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Yeni Kayıt Ekle</h3>
            <div className="space-y-3">
              <select
                value={newEntry.type}
                onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              >
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{TYPE_ICONS[key]} {label}</option>
                ))}
              </select>
              <input
                type="text" placeholder="Başlık" required
                value={newEntry.title}
                onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              />
              <textarea
                placeholder="İçerik" required rows={4}
                value={newEntry.content}
                onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              />
              <input
                type="text" placeholder="Kategori (örn: proje, ders, kitap)"
                value={newEntry.category}
                onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              />
              <input
                type="text" placeholder="Etiketler (virgülle ayır)"
                value={newEntry.tags}
                onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">
                Kaydet
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">
                İptal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
