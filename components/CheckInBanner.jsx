"use client";
import React, { useState, useEffect } from 'react';

export default function CheckInBanner({ onClose }) {
  const [checkIn, setCheckIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const lastCheckIn = localStorage.getItem('lastCheckInDate');
    const today = new Date().toISOString().split('T')[0];
    if (lastCheckIn !== today) {
      loadCheckIn();
    } else {
      setLoading(false);
    }
  }, []);

  async function loadCheckIn() {
    setLoading(true);
    try {
      const res = await fetch('/api/checkin/generate');
      const data = await res.json();
      if (data.success) {
        setCheckIn(data.checkIn);
        setShow(true);
        localStorage.setItem('lastCheckInDate', new Date().toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error('CheckIn error:', err);
    }
    setLoading(false);
  }

  if (!show || !checkIn) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md mx-4 animate-slideDown">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-white">
              {checkIn.greeting} Metehan 👋
            </h3>
            {checkIn.memoryReminder && (
              <p className="text-xs text-gray-400 mt-1">{checkIn.memoryReminder}</p>
            )}
          </div>
          <button onClick={() => setShow(false)} className="text-gray-500 hover:text-white text-lg ml-2">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-750 bg-opacity-50">
            <span className="text-sm text-gray-300">Dünkü tamamlanma</span>
            <span className={`text-sm font-bold ${checkIn.yesterdayCompletion.rate >= 70 ? 'text-green-400' : checkIn.yesterdayCompletion.rate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              %{checkIn.yesterdayCompletion.rate}
            </span>
          </div>

          {checkIn.lifeScore && (
            <div className="flex gap-1">
              {['health', 'career', 'finance', 'education', 'social'].map(area => {
                const score = checkIn.lifeScore[area];
                const color = score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';
                return (
                  <div key={area} className="flex-1 text-center">
                    <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {area === 'health' ? '💪' : area === 'career' ? '💼' : area === 'finance' ? '💰' : area === 'education' ? '📚' : '🤝'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {checkIn.droppedAreasMessage && (
            <div className="p-2 rounded-lg bg-red-900 bg-opacity-30 border border-red-800">
              <p className="text-xs text-red-300">{checkIn.droppedAreasMessage}</p>
            </div>
          )}

          {checkIn.priorityTask && (
            <div className="p-2 rounded-lg bg-blue-900 bg-opacity-30 border border-blue-800">
              <p className="text-xs text-blue-300">
                🎯 Bugün öncelikli görev: {checkIn.priorityTask.taskTitle}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
