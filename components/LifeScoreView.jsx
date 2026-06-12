"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const AREAS = [
  { key: 'health', label: 'Sağlık', emoji: '💪', color: '#ef4444' },
  { key: 'career', label: 'Kariyer', emoji: '💼', color: '#3b82f6' },
  { key: 'finance', label: 'Finans', emoji: '💰', color: '#eab308' },
  { key: 'education', label: 'Eğitim', emoji: '📚', color: '#a855f7' },
  { key: 'social', label: 'Sosyal Hayat', emoji: '🤝', color: '#ec4899' },
];

export default function LifeScoreView() {
  const { data: session } = useSession();
  const [score, setScore] = useState(null);
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [scoreRes, trendRes] = await Promise.all([
        fetch('/api/lifescore/latest'),
        fetch('/api/lifescore/trend'),
      ]);
      const scoreData = await scoreRes.json();
      const trendData = await trendRes.json();
      if (scoreData.success) setScore(scoreData.score);
      if (trendData.success) setTrend(trendData.trend);
    } catch (err) {
      console.error('LifeScore load error:', err);
    }
    setLoading(false);
  }

  async function calculate() {
    setCalculating(true);
    try {
      const res = await fetch('/api/lifescore/calculate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setScore(data.score);
        await loadData();
      }
    } catch (err) {
      console.error('LifeScore calculate error:', err);
    }
    setCalculating(false);
  }

  function getScoreColor(val) {
    if (val >= 80) return 'text-green-400';
    if (val >= 60) return 'text-yellow-400';
    if (val >= 40) return 'text-orange-400';
    return 'text-red-400';
  }

  function getScoreBg(val) {
    if (val >= 80) return 'bg-green-500';
    if (val >= 60) return 'bg-yellow-500';
    if (val >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">📊 AI Hayat Puanı</h2>
        <button
          onClick={calculate}
          disabled={calculating}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
        >
          {calculating ? 'Hesaplanıyor...' : 'Puanları Güncelle'}
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">Yükleniyor...</div>
      ) : score ? (
        <>
          <div className="text-center mb-6">
            <div className="text-5xl font-bold mb-1">{score.overall}</div>
            <div className="text-sm text-gray-400">Genel Yaşam Puanı</div>
          </div>

          <div className="space-y-4">
            {AREAS.map(({ key, label, emoji, color }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span>{emoji}</span>
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${getScoreColor(score[key])}`}>
                      {score[key]}
                    </span>
                    {trend?.trends?.[key] && (
                      <span className={`text-xs ${trend.trends[key].direction === 'up' ? 'text-green-400' : trend.trends[key].direction === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                        {trend.trends[key].direction === 'up' ? '↑' : trend.trends[key].direction === 'down' ? '↓' : '→'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${getScoreBg(score[key])}`}
                    style={{ width: `${score[key]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {trend?.droppingAreas?.length > 0 && (
            <div className="mt-6 p-3 rounded-lg bg-red-900 bg-opacity-30 border border-red-700">
              <h3 className="text-sm font-semibold text-red-400 mb-2">⚠️ Düşüşteki Alanlar</h3>
              {trend.droppingAreas.map((area, i) => (
                <p key={i} className="text-sm text-red-300">
                  {area.name}: son 30 günde düşüşte
                </p>
              ))}
            </div>
          )}

          {trend && (
            <div className="mt-4 p-3 rounded-lg bg-gray-800 text-sm">
              <h3 className="font-medium mb-1">📈 Özet</h3>
              <p className="text-gray-400">
                En yüksek: {trend.highestArea.name} ({trend.highestArea.score}) |
                En düşük: {trend.lowestArea.name} ({trend.lowestArea.score})
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-gray-500 py-8">
          Henüz puan hesaplanmamış. "Puanları Güncelle" butonuna tıkla.
        </div>
      )}
    </div>
  );
}
