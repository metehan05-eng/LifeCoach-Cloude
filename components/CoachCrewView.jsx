"use client";
import React, { useState, useEffect, useRef } from 'react';

const COACH_COLORS = {
  entrepreneur: { bg: 'from-blue-600 to-purple-700', border: 'border-blue-500', accent: 'text-blue-400' },
  finance: { bg: 'from-yellow-600 to-green-700', border: 'border-yellow-500', accent: 'text-yellow-400' },
  career: { bg: 'from-indigo-600 to-blue-700', border: 'border-indigo-500', accent: 'text-indigo-400' },
  productivity: { bg: 'from-orange-600 to-red-700', border: 'border-orange-500', accent: 'text-orange-400' },
};

export default function CoachCrewView() {
  const [coaches, setCoaches] = useState([]);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetch('/api/coaches/list')
      .then(r => r.json())
      .then(d => { if (d.success) setCoaches(d.coaches); });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function selectCoach(coach) {
    setSelectedCoach(coach);
    setMessages([]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`/api/coaches/history?coachType=${coach.id}&limit=5`);
      const data = await res.json();
      if (data.success) setHistory(data.sessions);
    } catch (err) {
      console.error('History load error:', err);
    }
    setLoading(false);
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || !selectedCoach) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);

    try {
      const res = await fetch('/api/coaches/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachType: selectedCoach.id, message: userMsg }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'error', content: 'Bir hata oluştu.' }]);
    }
    setSending(false);
  }

  if (!selectedCoach) {
    return (
      <div className="flex flex-col h-full bg-gray-900 text-white p-4">
        <h2 className="text-xl font-bold mb-4">🤖 AI Koç Kadrosu</h2>
        <p className="text-sm text-gray-400 mb-4">İhtiyacına göre bir koç seç:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {coaches.map(coach => (
            <button
              key={coach.id}
              onClick={() => selectCoach(coach)}
              className={`p-4 rounded-xl bg-gradient-to-br ${COACH_COLORS[coach.id]?.bg || 'from-gray-700 to-gray-800'} border ${COACH_COLORS[coach.id]?.border || 'border-gray-600'} text-left hover:scale-[1.02] transition-transform`}
            >
              <div className="text-3xl mb-2">{coach.emoji}</div>
              <h3 className="font-bold text-lg">{coach.name}</h3>
              <p className="text-sm text-gray-300 mt-1">{coach.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {coach.specialties?.slice(0, 3).map((s, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-black bg-opacity-30">
                    {s}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="flex items-center gap-3 p-4 border-b border-gray-700">
        <button onClick={() => setSelectedCoach(null)} className="text-gray-400 hover:text-white">
          ←
        </button>
        <span className="text-2xl">{selectedCoach.emoji}</span>
        <div>
          <h3 className="font-bold">{selectedCoach.name}</h3>
          <p className="text-xs text-gray-400">{selectedCoach.title}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            {selectedCoach.name} ile sohbet başlat.
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${
              msg.role === 'user'
                ? 'bg-blue-600 rounded-br-none'
                : msg.role === 'error'
                  ? 'bg-red-900'
                  : 'bg-gray-800 rounded-bl-none'
            }`}>
              <p className="text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-gray-800 p-3 rounded-lg rounded-bl-none">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={`${selectedCoach.name}'a sor...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
          >
            Gönder
          </button>
        </div>
      </form>
    </div>
  );
}
