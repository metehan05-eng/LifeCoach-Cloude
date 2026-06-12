"use client";
import React, { useState } from 'react';
import LifeMemoryView from './LifeMemoryView';
import LifeScoreView from './LifeScoreView';
import SecondBrainView from './SecondBrainView';
import CoachCrewView from './CoachCrewView';
import TaskChainView from './TaskChainView';
import FutureSimulatorView from './FutureSimulatorView';
import CheckInBanner from './CheckInBanner';

const FEATURES = [
  { id: 'checkin', label: 'Günlük Check-in', emoji: '🌅', color: 'from-cyan-500 to-blue-600', component: null },
  { id: 'memory', label: 'Yaşam Hafızası', emoji: '🧠', color: 'from-green-500 to-emerald-600', component: LifeMemoryView },
  { id: 'lifescore', label: 'Hayat Puanı', emoji: '📊', color: 'from-pink-500 to-rose-600', component: LifeScoreView },
  { id: 'secondbrain', label: 'İkinci Beyin', emoji: '🧠', color: 'from-purple-500 to-violet-600', component: SecondBrainView },
  { id: 'coachcrew', label: 'Koç Kadrosu', emoji: '🤖', color: 'from-orange-500 to-red-600', component: CoachCrewView },
  { id: 'taskchain', label: 'Görev Zinciri', emoji: '📋', color: 'from-blue-500 to-indigo-600', component: TaskChainView },
  { id: 'future', label: 'Gelecek Simülatörü', emoji: '🔮', color: 'from-purple-500 to-indigo-600', component: FutureSimulatorView },
];

export default function LifeOSHub() {
  const [activeFeature, setActiveFeature] = useState(null);

  if (activeFeature) {
    const feature = FEATURES.find(f => f.id === activeFeature);
    if (feature?.component) {
      const Component = feature.component;
      return (
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-2 p-3 bg-gray-800 border-b border-gray-700">
            <button
              onClick={() => setActiveFeature(null)}
              className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
            >
              ← Geri
            </button>
            <span className="text-lg">{feature.emoji}</span>
            <span className="font-medium">{feature.label}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <Component />
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <CheckInBanner />
      <div className="h-full bg-gray-900 text-white p-4 overflow-y-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            LifeOS Hub
          </h1>
          <p className="text-sm text-gray-400 mt-1">AI Destekli Yaşam Yönetim Sistemi</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature) => (
            <button
              key={feature.id}
              onClick={() => setActiveFeature(feature.id)}
              className={`p-5 rounded-xl bg-gradient-to-br ${feature.color} bg-opacity-90 text-left hover:scale-[1.02] transition-all duration-200 shadow-lg`}
            >
              <div className="text-3xl mb-2">{feature.emoji}</div>
              <h3 className="font-bold text-lg text-white">{feature.label}</h3>
              <p className="text-sm text-white text-opacity-80 mt-1">
                {feature.id === 'checkin' && 'Günlük AI check-in ile hedeflerini takip et'}
                {feature.id === 'memory' && 'AI seninle ilgili her şeyi hatırlasın'}
                {feature.id === 'lifescore' && '5 alanda yaşam puanını gör ve takip et'}
                {feature.id === 'secondbrain' && 'Fikirlerini, notlarını, hedeflerini depola'}
                {feature.id === 'coachcrew' && '4 farklı uzman AI koç arasından seç'}
                {feature.id === 'taskchain' && 'Hedeflerin için otomatik görev zinciri'}
                {feature.id === 'future' && 'Geleceğini simüle et, olası sonuçları gör'}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-gray-800 border border-gray-700">
          <h3 className="font-bold text-sm mb-2">💡 İpucu</h3>
          <p className="text-sm text-gray-400">
            AI ile sohbet ederken seninle ilgili önemli bilgileri otomatik olarak hatırlar.
            "Ben yazılım öğreniyorum", "15 kilo vermek istiyorum" gibi şeyler söyle,
            AI bunları hafızasına kaydetsin. Bir ay sonra sana hatırlatabilir!
          </p>
        </div>
      </div>
    </>
  );
}
