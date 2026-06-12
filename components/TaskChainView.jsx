"use client";
import React, { useState, useEffect } from 'react';

const GOAL_TYPE_LABELS = {
  startup: { label: 'Girişim/Şirket', emoji: '🚀', color: 'text-blue-400' },
  education: { label: 'Eğitim', emoji: '📚', color: 'text-purple-400' },
  career: { label: 'Kariyer', emoji: '💼', color: 'text-indigo-400' },
  finance: { label: 'Finans', emoji: '💰', color: 'text-yellow-400' },
  health: { label: 'Sağlık', emoji: '💪', color: 'text-green-400' },
  custom: { label: 'Özel Hedef', emoji: '🎯', color: 'text-gray-400' },
};

export default function TaskChainView() {
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [detectedType, setDetectedType] = useState(null);

  useEffect(() => {
    loadChains();
  }, []);

  async function loadChains() {
    setLoading(true);
    try {
      const res = await fetch('/api/taskchain/list?status=active');
      const data = await res.json();
      if (data.success) setChains(data.chains);
    } catch (err) {
      console.error('TaskChain load error:', err);
    }
    setLoading(false);
  }

  async function detectGoal(text) {
    try {
      const res = await fetch(`/api/taskchain/detect-type?text=${encodeURIComponent(text)}`);
      const data = await res.json();
      if (data.success) setDetectedType(data);
    } catch (err) {
      console.error('Detect error:', err);
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!goalInput.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/taskchain/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: goalInput }),
      });
      const data = await res.json();
      if (data.success) {
        setShowGenerator(false);
        setGoalInput('');
        setDetectedType(null);
        loadChains();
      }
    } catch (err) {
      console.error('Generate error:', err);
    }
    setGenerating(false);
  }

  async function updateTask(chainId, taskId, status) {
    try {
      const res = await fetch('/api/taskchain/update-task', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainId, taskId, status }),
      });
      const data = await res.json();
      if (data.success) loadChains();
    } catch (err) {
      console.error('Update error:', err);
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">📋 Görev Zinciri</h2>
        <button
          onClick={() => setShowGenerator(true)}
          className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 rounded-lg"
        >
          + Yeni Hedef
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">Yükleniyor...</div>
      ) : chains.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          Henüz görev zinciri yok. Bir hedef belirlemek için "Yeni Hedef"e tıkla.
          <div className="mt-2 text-xs text-gray-600">
            Örn: "Şirket kurmak istiyorum", "İngilizce öğrenmek istiyorum"
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {chains.map(chain => {
            const typeInfo = GOAL_TYPE_LABELS[chain.goalType] || GOAL_TYPE_LABELS.custom;
            return (
              <div key={chain.id} className="p-4 rounded-xl bg-gray-800 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xl ${typeInfo.color}`}>{typeInfo.emoji}</span>
                    <h3 className="font-semibold">{chain.goalTitle}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.color} bg-opacity-20`}>
                      {typeInfo.label}
                    </span>
                    <span className="text-sm text-gray-400">{chain.progress}%</span>
                  </div>
                </div>

                <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                  <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${chain.progress}%` }} />
                </div>

                <div className="space-y-1">
                  {chain.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                        task.status === 'completed'
                          ? 'bg-green-900 bg-opacity-30 text-gray-400 line-through'
                          : task.status === 'active'
                            ? 'bg-blue-900 bg-opacity-30 border border-blue-700'
                            : 'bg-gray-750 text-gray-500'
                      }`}
                    >
                      <button
                        onClick={() => updateTask(chain.id, task.id, task.status === 'completed' ? 'pending' : 'completed')}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          task.status === 'completed'
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-500 hover:border-green-500'
                        }`}
                      >
                        {task.status === 'completed' && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-gray-500">{task.description}</div>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">{task.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <form onSubmit={handleGenerate} className="bg-gray-800 p-6 rounded-xl w-full max-w-lg mx-4">
            <h3 className="text-lg font-bold mb-2">Yeni Hedef - Görev Zinciri Oluştur</h3>
            <p className="text-sm text-gray-400 mb-4">
              Bir hedef söyle, AI otomatik olarak adım adım görev zinciri çıkarsın.
            </p>
            <div className="space-y-3">
              <textarea
                placeholder="Ne yapmak istiyorsun? Örn: 'Şirket kurmak istiyorum' veya 'İngilizce öğrenmek istiyorum'"
                value={goalInput}
                onChange={(e) => {
                  setGoalInput(e.target.value);
                  if (e.target.value.length > 5) detectGoal(e.target.value);
                }}
                rows={3}
                className="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white placeholder-gray-500"
              />
              {detectedType && (
                <div className="flex items-center gap-2 p-2 rounded bg-gray-700 text-sm">
                  <span className={GOAL_TYPE_LABELS[detectedType.goalType]?.color}>
                    {GOAL_TYPE_LABELS[detectedType.goalType]?.emoji}
                  </span>
                  <span>Tespit edilen: {detectedType.label}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={!goalInput.trim() || generating}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg"
              >
                {generating ? 'Oluşturuluyor...' : 'Görev Zinciri Oluştur'}
              </button>
              <button
                type="button"
                onClick={() => { setShowGenerator(false); setDetectedType(null); }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
