"use client";
import React, { useState } from 'react';
import DefneAI from '@/components/interactive/DefneAI';
import { ProgressBar, LessonCard, StreakDisplay } from '@/components/interactive/LessonComponents';
import Link from 'next/link';

const sampleLesson = [
  {
    id: 1,
    type: "explanation",
    title: "Güne Harika Başla 🌅",
    content: "Merhaba! Ben Yapay Zeka Koçun Defne. Bugün seninle sabah rutinleri hakkında konuşacağız. Küçük adımlar büyük değişimler yaratır. Hazır mısın?",
    characterLine: "Hazırsan hemen başlayalım!",
  },
  {
    id: 2,
    type: "question",
    question: "Sabah uyandığında beynini taze tutmak için ilk hangisini yapmalısın?",
    options: [
      { id: "a", text: "Hemen sosyal medyaya bakmak", feedback: "Bu beynini stresle doldurabilir. ❌", correct: false },
      { id: "b", text: "Bir bardak ılık su içmek", feedback: "Harika! Vücudunu uyandırmanın en iyi yolu. ✅", correct: true },
      { id: "c", text: "Yarım saat daha uyumak", feedback: "Güne geç başlamak motivasyonunu düşürebilir. ❌", correct: false }
    ],
  },
  {
    id: 3,
    type: "explanation",
    title: "Hidrasyonun Gücü 💧",
    content: "Su içmek, gece boyunca susuz kalan beynini ve organlarını uyandırır. Bu, bilişsel performansını %15 oranında artırabilir.",
    characterLine: "Su hayattır, unutma!",
  },
  {
    id: 4,
    type: "question",
    question: "Güne odaklanmış başlamak için en iyi 'derin çalışma' saati nedir?",
    options: [
      { id: "a", text: "Gece yarısından sonra", feedback: "Uyku düzenini bozabilir.", correct: false },
      { id: "b", text: "Uyandıktan sonraki ilk 2 saat", feedback: "Tam isabet! Kortizol seviyen en verimli halinde.", correct: true },
      { id: "c", text: "Öğle yemeğinden hemen sonra", feedback: "Öğle mahmurluğu odaklanmanı zorlaştırabilir.", correct: false }
    ],
  },
  {
    id: 5,
    type: "complete",
    title: "Tebrikler! 🎉",
    content: "Bugünün ilk adımını attın. Defne AI ile her gün daha iyiye gidiyorsun.",
    characterLine: "Harika bir iş çıkardın! Yarın görüşmek üzere.",
  }
];

export default function InteractiveLesson() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [streak, setStreak] = useState(5);
  const [lessonComplete, setLessonComplete] = useState(false);

  const step = sampleLesson[currentStep];

  const handleAnswer = (answer) => {
    if (step.type === 'explanation') {
      nextStep();
      return;
    }

    setSelectedAnswer(answer.id);
    setIsCorrect(answer.correct);

    setTimeout(() => {
      if (answer.correct) {
        nextStep();
      } else {
        // Allow retry or just stay
        setSelectedAnswer(null);
        setIsCorrect(null);
      }
    }, 2000);
  };

  const nextStep = () => {
    if (currentStep < sampleLesson.length - 1) {
      setCurrentStep(prev => prev + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
    } else {
      setLessonComplete(true);
    }
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white overflow-hidden relative selection:bg-primary/30">
      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/30 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
      </div>

      <div className="container mx-auto px-6 py-12 relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between gap-8 mb-16">
          <Link href="/" className="text-zinc-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
          <div className="flex-1 max-w-xl">
            <ProgressBar current={currentStep + 1} total={sampleLesson.length} />
          </div>
          <StreakDisplay count={streak} />
        </header>

        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-20">
          {!lessonComplete ? (
            <LessonCard 
              step={step} 
              onAnswer={handleAnswer} 
              selectedAnswer={selectedAnswer}
              isCorrect={isCorrect}
            />
          ) : (
            <div className="glass-panel p-12 rounded-[40px] text-center max-w-lg border-2 border-green-500/20 animate-message-pop">
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-4xl font-black mb-4">Harika!</h2>
              <p className="text-xl text-zinc-400 mb-8">
                Günün dersini tamamladın ve serini korudun.
              </p>
              <Link 
                href="/" 
                className="block w-full py-5 bg-white text-black font-black text-xl rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
              >
                KONTROL PANELİNE DÖN
              </Link>
            </div>
          )}
        </div>

        {/* Defne AI Fixed */}
        <DefneAI 
          message={lessonComplete ? sampleLesson[sampleLesson.length-1].characterLine : step?.characterLine} 
        />
      </div>
    </main>
  );
}
