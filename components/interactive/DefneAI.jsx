"use client";
import React, { useState, useEffect } from 'react';

const DefneAI = ({ message, mood = 'friendly' }) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (message) {
      setIsTyping(true);
      setDisplayText('');
      let i = 0;
      const interval = setInterval(() => {
        setDisplayText((prev) => prev + message.charAt(i));
        i++;
        if (i >= message.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [message]);

  return (
    <div className="fixed right-8 bottom-8 md:right-12 md:bottom-12 flex flex-col items-end z-50 pointer-events-none">
      {/* Chat Bubble */}
      {message && (
        <div className="mb-4 max-w-xs bg-white text-zinc-900 p-4 rounded-2xl rounded-br-none shadow-xl border-2 border-primary animate-message-pop pointer-events-auto">
          <p className="text-sm font-medium leading-relaxed">
            {displayText}
            {isTyping && <span className="inline-block w-1 h-4 ml-1 bg-primary animate-pulse" />}
          </p>
          <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-r-2 border-b-2 border-primary rotate-45 transform origin-bottom-right" />
        </div>
      )}

      {/* Defne Avatar */}
      <div className="relative group pointer-events-auto">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
        
        {/* Avatar Container */}
        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white/20 bg-zinc-900 overflow-hidden shadow-2xl flex items-center justify-center animate-idle-breathing">
          <svg viewBox="0 0 100 100" className="w-full h-full defne-glow">
            {/* Background Circle */}
            <circle cx="50" cy="50" r="45" fill="#1e1e24" />
            
            {/* Defne's Face and Hair (Simplified Modern Vector Style) */}
            <defs>
              <linearGradient id="hairGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>

            {/* Hair */}
            <path 
              d="M20,50 C20,20 80,20 80,50 C80,80 20,80 20,50" 
              fill="url(#hairGradient)" 
              className="animate-float"
            />
            
            {/* Face */}
            <circle cx="50" cy="55" r="30" fill="#fce7f3" />
            
            {/* Eyes */}
            <g className="animate-blinking origin-center">
              <circle cx="40" cy="55" r="3" fill="#1e1e24" />
              <circle cx="60" cy="55" r="3" fill="#1e1e24" />
            </g>
            
            {/* Smile */}
            <path 
              d="M42,65 Q50,70 58,65" 
              fill="none" 
              stroke="#1e1e24" 
              strokeWidth="2" 
              strokeLinecap="round" 
            />
            
            {/* Accessory */}
            <circle cx="70" cy="40" r="5" fill="#3b82f6" opacity="0.8" />
          </svg>
        </div>

        {/* Status Indicator */}
        <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-zinc-900 rounded-full" />
      </div>
    </div>
  );
};

export default DefneAI;
