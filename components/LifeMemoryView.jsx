"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const CATEGORY_LABELS = {
  goal: { label: 'Hedefler', emoji: '🎯', color: 'bg-green-500' },
  health: { label: 'Sağlık', emoji: '💪', color: 'bg-red-500' },
  career: { label: 'Kariyer', emoji: '💼', color: 'bg-blue-500' },
  finance: { label: 'Finans', emoji: '💰', color: 'bg-yellow-500' },
  education: { label: 'Eğitim', emoji: '📚', color: 'bg-purple-500' },
  social: { label: 'Sosyal', emoji: '🤝', color: 'bg-pink-500' },
  idea: { label: 'Fikirler', emoji: '💡', color: 'bg-indigo-500' },
  habit: { label: 'Alışkanlıklar', emoji: '🔄', color: 'bg-teal-500' },
  preference: { label: 'Tercihler', emoji: '⭐', color: 'bg-orange-500' },
  general: { label: 'Genel', emoji: '📝', color: 'bg-gray-500' },
};

export default function LifeMemoryView() {
  const { data: session } = useSession();
  const [memories, setMemories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMemories();
  }, []);

  async function loadMemories() {
    setLoading(true);
    try {
      const [memRes, sumRes] = await Promise.all([
        fetch('/api/memory/list'),
        fetch('/api/memory/summary'),
      ]);
      const memData = await memRes.json();
      const sumData = await sumRes.json();
      if (memData.success) setMemories(memData.memories);
      if (sumData.success) setSummary(sumData.summary);
    } catch (err) {
      console.error('Memory load error:', err);
    }
    setLoading(false);
  }

  const filteredMemories = memories.filter(m => {
    if (selectedCategory && m.category !== selectedCategory) return false;
    if (searchQuery && !m.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">🧠 Yaşam Hafızası</h2>
        <span className="text-sm text-gray-400">{memories.length} kayıt</span>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
          {Object.entries(CATEGORY_LABELS).map(([cat, info]) => {
            const catData = summary.categories?.[cat];
            if (!catData) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`p-2 rounded-lg text-center transition-all ${selectedCategory === cat ? 'ring-2 ring-white' : ''} ${info.color} bg-opacity-20 hover:bg-opacity-30`}
              >
                <div className="text-lg">{info.emoji}</div>
                <div className="text-xs font-medium">{info.label}</div>
                <div className="text-xs text-gray-400">{catData.count}</div>
              </button>
            );
          })}
        </div>
      )}

      <input
        type="text"
        placeholder="Hafızada ara..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full p-2 mb-4 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500"
      />

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Yükleniyor...</div>
        ) : filteredMemories.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Henüz hafıza kaydı yok. AI ile sohbet etmeye başlayınca otomatik kaydedilecek.
          </div>
        ) : (
          filteredMemories.map((mem) => {
            const catInfo = CATEGORY_LABELS[mem.category] || CATEGORY_LABELS.general;
            return (
              <div key={mem.id} className="p-3 rounded-lg bg-gray-800 border border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{catInfo.emoji}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                    {catInfo.label}
                  </span>
                  {mem.importance >= 8 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-600 text-yellow-200">Önemli</span>
                  )}
                </div>
                <p className="text-sm text-gray-200">{mem.content}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">{new Date(mem.createdAt).toLocaleDateString('tr-TR')}</span>
                  {mem.source !== 'chat' && (
                    <span className="text-xs text-gray-500">{mem.source}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
