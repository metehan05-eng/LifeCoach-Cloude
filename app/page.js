"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const features = [
  { icon: '🧠', title: 'Derin Hafıza', desc: 'Geçmiş sohbetlerini hatırlar, seni tanır.' },
  { icon: '⚡', title: 'Anlık Yanıt', desc: 'Gemini 2.0 Flash ile milisaniye hızında.' },
  { icon: '🎯', title: 'Hedef Takibi', desc: 'Hedeflerini planlar ve seni motive eder.' },
  { icon: '🔐', title: 'Güvenli', desc: 'Verilerinin güvenliği en önceliğimiz.' },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <main style={{
      minHeight: '100vh',
      background: '#030308',
      color: '#f0f0ff',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '40px 20px',
    }}>
      {/* Ambient */}
      <div style={{
        position: 'fixed', top: '-200px', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '600px',
        background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-200px', right: '-100px',
        width: '600px', height: '500px',
        background: 'radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        marginBottom: '48px',
        opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px',
          boxShadow: '0 8px 32px rgba(99,102,241,0.5)',
        }}>⚡</div>
        <div>
          <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            LifeCoach <span style={{
              background: 'linear-gradient(135deg, #818cf8, #c4b5fd)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>AI</span>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(99,102,241,0.8)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
            HAN 4.2 Ultra Core
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{
        textAlign: 'center', maxWidth: '620px',
        opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(24px)',
        transition: 'all 0.7s ease 0.1s',
      }}>
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 900,
          letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '20px',
        }}>
          Potansiyelini{' '}
          <span style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Sonsuza Taşı
          </span>
        </h1>
        <p style={{
          fontSize: '17px', color: 'rgba(160,160,192,0.8)',
          lineHeight: 1.7, marginBottom: '36px',
        }}>
          Seni anlayan, hedeflerini hatırlayan ve seninle birlikte gelişen
          yeni nesil yapay zeka yaşam koçuna hoş geldin.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/chat" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '15px 36px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', color: 'white',
              fontSize: '16px', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(99,102,241,0.45)',
              transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              letterSpacing: '-0.2px',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.03)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(99,102,241,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.45)'; }}
            >
              ✦ Sohbete Başla
            </button>
          </Link>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '15px 36px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.04)',
              border: '1.5px solid rgba(99,102,241,0.25)',
              color: '#a5b4fc', fontSize: '16px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; }}
            >
              Giriş Yap
            </button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px', maxWidth: '760px', width: '100%', marginTop: '64px',
        opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(32px)',
        transition: 'all 0.8s ease 0.25s',
      }}>
        {features.map((f, i) => (
          <div key={i} style={{
            padding: '20px', borderRadius: '16px',
            background: 'rgba(18,18,31,0.7)',
            border: '1px solid rgba(99,102,241,0.12)',
            backdropFilter: 'blur(20px)',
            transition: 'all 0.2s ease',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(18,18,31,0.7)';
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.12)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div style={{ fontSize: '26px', marginBottom: '8px' }}>{f.icon}</div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, marginBottom: '4px', color: '#d0d0f0' }}>{f.title}</div>
            <div style={{ fontSize: '12.5px', color: 'rgba(160,160,192,0.6)', lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '60px', fontSize: '12px',
        color: 'rgba(160,160,192,0.35)', textAlign: 'center',
      }}>
        LifeCoach AI · by Metehan Haydar Erbaş · HAN AI Tech
      </div>
    </main>
  );
}
