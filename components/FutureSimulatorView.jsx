"use client";
import React, { useState, useEffect } from 'react';

const AREA_EMOJIS = {
  education: '📚', career: '💼', finance: '💰',
  health: '💪', social: '🤝',
};

const AREA_LABELS = {
  education: 'Eğitim', career: 'Kariyer', finance: 'Finans',
  health: 'Sağlık', social: 'Sosyal',
};

export default function FutureSimulatorView() {
  const [scenario, setScenario] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const res = await fetch('/api/future/history');
      const data = await res.json();
      if (data.success) setHistory(data.simulations);
    } catch (err) {
      console.error('History load error:', err);
    }
  }

  async function handleSimulate(e) {
    e.preventDefault();
    if (!scenario.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/future/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      const data = await res.json();
      if (data.success) setResult(data.simulation);
      loadHistory();
    } catch (err) {
      console.error('Simulate error:', err);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">🔮 Gelecek Simülatörü</h2>
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-gray-400 hover:text-white"
          >
            {showHistory ? 'Simülatör' : 'Geçmiş'} ({history.length})
          </button>
        )}
      </div>

      {!showHistory ? (
        <>
          <p className="text-sm text-gray-400 mb-4">
            Bir hedef söyle, AI mevcut durumuna göre gelecekte nerede olabileceğini tahmin etsin.
          </p>

          <form onSubmit={handleSimulate} className="mb-4">
            <textarea
              placeholder="Örn: '6 ay boyunca her gün 1 saat İngilizce çalışırsam ne olur?'"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              rows={3}
              className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500 mb-2"
            />
            <button
              type="submit"
              disabled={!scenario.trim() || loading}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium"
            >
              {loading ? 'Simüle Ediliyor...' : '🔮 Geleceği Göster'}
            </button>
          </form>

          {result && (
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900 to-indigo-900 border border-purple-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{AREA_EMOJIS[result.area] || '🔮'}</span>
                  <div>
                    <h3 className="font-bold">Tahmin Sonucu</h3>
                    <span className="text-xs text-gray-400">{AREA_LABELS[result.area] || result.area}</span>
                  </div>
                  <div className="ml-auto text-center">
                    <div className="text-lg font-bold text-purple-300">%{result.confidence}</div>
                    <div className="text-xs text-gray-400">Güven</div>
                  </div>
                </div>
                <p className="text-sm text-gray-200 mb-3">{result.prediction}</p>

                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                  <span>Mevcut skor: {result.currentState.score}</span>
                  <span>→</span>
                  <span className="text-green-400">Tahmin: {result.milestones[result.milestones.length - 1]?.expectedScore || '?'}</span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-400 mb-1">Aylık İlerleme</h4>
                  {result.milestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-16 text-xs text-gray-500">Ay {m.month}</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${(m.expectedScore / 100) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-xs text-right text-gray-400">{m.expectedScore}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Geçmiş Simülasyonlar</h3>
          {history.length === 0 ? (
            <p className="text-gray-500">Henüz simülasyon yapılmamış.</p>
          ) : (
            history.map(sim => (
              <div key={sim.id} className="p-3 rounded-lg bg-gray-800 border border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <span>{AREA_EMOJIS[sim.area] || '🔮'}</span>
                  <p className="text-sm font-medium flex-1">{sim.scenario}</p>
                  <span className="text-xs text-gray-400">
                    {new Date(sim.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{sim.prediction.slice(0, 150)}...</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
