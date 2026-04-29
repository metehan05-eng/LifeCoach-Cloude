"use client";
import React from 'react';
import Link from 'next/link';
import DefneAI from '@/components/interactive/DefneAI';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-6 text-center relative z-10">
        <div className="mb-12 animate-float">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4">
            LifeCoach<span className="text-primary">AI</span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto font-medium">
            Seni anlayan, seninle birlikte gelişen yeni nesil yaşam koçunla tanış.
          </p>
        </div>

        <div className="grid gap-6 max-w-sm mx-auto">
          <Link href="/interactive">
            <button className="w-full py-6 bg-primary hover:bg-blue-600 text-white font-black text-2xl rounded-3xl shadow-[0_10px_40px_rgba(59,130,246,0.3)] btn-duo border-blue-700 transition-all hover:scale-[1.02]">
              DERSE BAŞLA
            </button>
          </Link>
          
          <button className="w-full py-5 bg-zinc-900/50 border-2 border-white/5 hover:border-white/10 text-white font-bold text-lg rounded-3xl backdrop-blur-xl transition-all">
            KİŞİSEL PLANIM
          </button>
        </div>

        <div className="mt-16 flex items-center justify-center gap-8 opacity-50">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold">🔥 5</span>
            <span className="text-xs uppercase tracking-widest font-bold">Seri</span>
          </div>
          <div className="w-[1px] h-8 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold">🎯 12</span>
            <span className="text-xs uppercase tracking-widest font-bold">Görev</span>
          </div>
          <div className="w-[1px] h-8 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-2xl font-bold">⭐ 850</span>
            <span className="text-xs uppercase tracking-widest font-bold">XP</span>
          </div>
        </div>
      </div>

      <DefneAI 
        message="Hoş geldin! Bugün değişim için harika bir gün. Hazırsan başlayalım mı?" 
      />
    </main>
  );
}
