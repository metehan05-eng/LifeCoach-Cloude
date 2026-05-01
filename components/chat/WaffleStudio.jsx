"use client";
import React, { useState, useEffect } from 'react';
import ChatInput from './ChatInput';

export default function WaffleStudio({ isMobile }) {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const examples = [
    { icon: '🌇', text: 'Cyberpunk İstanbul kış manzarası, sinematik ışıklandırma' },
    { icon: '🧸', text: '3D Pixar tarzı sevimli robot karakteri' },
    { icon: '⛰️', text: 'Sisli dağlar üzerinde yüzen adalar, dijital sanat' },
    { icon: '🐱', text: 'Astronot kedi uzayda, neon renkler' }
  ];

  const generateImage = async (text) => {
    if (!text?.trim() || isGenerating) return;
    setIsGenerating(true);
    
    // Temizleme ve URL oluşturma
    const cleanPrompt = encodeURIComponent(text.trim());
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://pollinations.ai/p/${cleanPrompt}?width=1024&height=1024&seed=${seed}&model=flux`;

    // Yeni görseli başa ekle
    const newImage = {
      id: Date.now(),
      prompt: text.trim(),
      url: imageUrl,
      timestamp: new Date()
    };

    // Simülasyon: Sayfada anında placeholder göster
    setImages(prev => [newImage, ...prev]);
    
    // Görselin gerçekten yüklenmesini bekle (opsiyonel ama şık durur)
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setIsGenerating(false);
      setPrompt('');
    };
  };

  const handleDownload = (url, prompt) => {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `waffle-ai-${prompt.slice(0, 20)}.png`;
        link.click();
      });
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', height: '100%',
      background: 'rgba(10,10,20,0.4)', position: 'relative', overflow: 'hidden'
    }}>
      {/* Scrollable Content Area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '40px 32px',
        display: 'flex', flexDirection: 'column', gap: '32px',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(245, 158, 11, 0.2) transparent'
      }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)'
          }}>🧇</div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Waffle AI Studio</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>
            Hayalindeki dünyayı tarif et, Waffle senin için çizsin.
          </p>
        </div>

        {/* Gallery / Results */}
        {images.length === 0 ? (
          <div style={{
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px', maxWidth: '900px', margin: '0 auto', width: '100%'
          }}>
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => generateImage(ex.text)}
                style={{
                  padding: '24px', borderRadius: '16px', textAlign: 'left',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245, 158, 11, 0.15)',
                  cursor: 'pointer', transition: 'all 0.3s ease',
                  display: 'flex', flexDirection: 'column', gap: '10px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '24px' }}>{ex.icon}</span>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500, lineHeight: 1.5 }}>{ex.text}</div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%'
          }}>
            {images.map((img) => (
              <div key={img.id} style={{
                background: 'rgba(15,15,30,0.8)', borderRadius: '20px', overflow: 'hidden',
                border: '1px solid rgba(245, 158, 11, 0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                animation: 'waffle-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
              }}>
                <div style={{ position: 'relative', aspectRatio: '1/1', background: '#000' }}>
                   <img 
                    src={img.url} 
                    alt={img.prompt} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                   />
                </div>
                <div style={{ padding: '16px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', lineHeight: 1.5, marginBottom: '16px', height: '36px', overflow: 'hidden' }}>
                    {img.prompt}
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleDownload(img.url, img.prompt)}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '10px',
                        background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b',
                        color: '#f59e0b', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                      }}
                    >📥 İndir</button>
                    <button
                      onClick={() => generateImage(img.prompt)}
                      style={{
                        padding: '8px 12px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff', fontSize: '12px', cursor: 'pointer'
                      }}
                    >🔄 Tekrarla</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ 
        padding: isMobile ? '12px 16px 20px' : '20px 40px 32px',
        background: 'linear-gradient(to top, rgba(12,12,24,1) 0%, transparent 100%)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <ChatInput 
            value={prompt}
            onChange={setPrompt}
            onSend={() => generateImage(prompt)}
            isLoading={isGenerating}
            placeholder="Ne hayal ediyorsun? (Örn: Mars'ta akşam yemeği yiyen astronotlar...)"
            isMobile={isMobile}
          />
        </div>
      </div>

      <style>{`
        @keyframes waffle-pop {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
