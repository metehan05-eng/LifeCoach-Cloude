"use client";
import React from 'react';

export const ProgressBar = ({ current, total }) => {
  const progress = (current / total) * 100;
  return (
    <div className="w-full h-4 bg-zinc-800 rounded-full overflow-hidden border-2 border-zinc-700 shadow-inner">
      <div 
        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500 ease-out relative"
        style={{ width: `${progress}%` }}
      >
        <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[pulse_2s_linear_infinite]" />
      </div>
    </div>
  );
};

export const LessonCard = ({ step, onAnswer, selectedAnswer, isCorrect }) => {
  if (!step) return null;

  return (
    <div className="w-full max-w-2xl animate-message-pop">
      {step.type === 'explanation' ? (
        <div className="glass-panel p-8 rounded-3xl shadow-2xl border-2 border-white/5">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-white leading-tight">
            {step.title || 'Günün Bilgisi'}
          </h2>
          <p className="text-lg text-zinc-300 leading-relaxed mb-8">
            {step.content}
          </p>
          <button 
            onClick={() => onAnswer(true)}
            className="w-full py-4 bg-primary hover:bg-blue-600 text-white font-bold rounded-2xl shadow-lg btn-duo border-blue-700"
          >
            Anladım, devam et!
          </button>
        </div>
      ) : (
        <div className="glass-panel p-8 rounded-3xl shadow-2xl border-2 border-white/5">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-white leading-tight">
            {step.question}
          </h2>
          <div className="grid gap-4">
            {step.options.map((option) => (
              <button
                key={option.id}
                onClick={() => onAnswer(option)}
                disabled={selectedAnswer !== null}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 group flex items-center justify-between ${
                  selectedAnswer === option.id 
                    ? (isCorrect ? 'bg-green-500/20 border-green-500 text-green-100' : 'bg-red-500/20 border-red-500 text-red-100')
                    : 'bg-zinc-800/50 border-white/5 hover:border-primary/50 text-zinc-300'
                }`}
              >
                <span className="text-lg font-medium">{option.text}</span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedAnswer === option.id ? (isCorrect ? 'border-green-500' : 'border-red-500') : 'border-zinc-600'
                }`}>
                  {selectedAnswer === option.id && (
                    <div className={`w-3 h-3 rounded-full ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`} />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const StreakDisplay = ({ count }) => {
  return (
    <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2 rounded-2xl border-2 border-orange-500/30 group">
      <div className="relative">
        <span className="text-2xl group-hover:scale-110 transition-transform inline-block">🔥</span>
        <div className="absolute inset-0 bg-orange-500 blur-md opacity-30 animate-pulse" />
      </div>
      <div>
        <p className="text-xs font-bold text-orange-500 uppercase tracking-wider">Seri</p>
        <p className="text-xl font-black text-white">{count} GÜN</p>
      </div>
    </div>
  );
};
