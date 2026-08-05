"use client";

import React from 'react';

export default function PluginStore({ onClose }) {
  return (
    <div className="min-h-full flex flex-col px-4 py-8">
      <div className="w-full max-w-3xl mx-auto flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-white">🧩 HAN Plugin Store</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Çok Yakında
            </span>
          </div>
          <p className="text-sm text-white/50">Eklenti mağazası yenileniyor…</p>
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

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-2xl w-full">
          <div className="relative inline-flex items-center justify-center mb-8">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-600/40 to-fuchsia-500/40 blur-3xl animate-pulse" />
            <div className="relative h-28 w-28 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center text-6xl shadow-2xl shadow-violet-900/50 border border-white/10">
              🧩
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent mb-4">
            Çok Yakında
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-3">
            İşlerin kolaylaşacak ✨
          </p>
          <p className="max-w-xl mx-auto text-sm text-white/45 leading-relaxed mb-10">
            HAN eklenti mağazası baştan aşağı yenileniyor. Daha akıllı, daha hızlı ve işlerini
            kolaylaştıran yeni araçlarla geri döneceğiz.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {['⚡ Daha Hızlı', '🤖 Daha Akıllı', '🔒 Daha Güvenli', '🚀 Hepsi Bir Arada'].map(f => (
              <span
                key={f}
                className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/60"
              >
                {f}
              </span>
            ))}
          </div>

          <div className="mx-auto max-w-xs mb-10">
            <div className="flex items-center justify-between text-xs text-white/40 mb-2">
              <span>Yenileniyor…</span>
              <span className="font-mono text-violet-300">%85</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-[85%] rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-pulse" />
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:brightness-110 transition-all shadow-lg shadow-violet-900/30"
            >
              ← Sohbete Dön
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
