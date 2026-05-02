"use client";
import React, { useState } from 'react';
import ChatInput from './ChatInput';

export default function WaffleStudio({ isMobile }) {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState(''); // 'optimizing' | 'drawing' | 'ready' | 'error'

  const examples = [
    { icon: '🌇', text: 'Cyberpunk İstanbul, 2099, neon ışıklar, yağmurlu atmosfer, gerçekçi' },
    { icon: '🚀', text: 'Mars kolonisinde kahve içen astronot, sinematik, güneş ışığı' },
    { icon: '🎨', text: 'Sürrealist tarzda eriyen saatler ve uçan adalar, sanatsal' },
    { icon: '🐱', text: 'Samuray kıyafeti içinde kedi, kar taneleri altında, epik aura' }
  ];

  const generateImage = async (text) => {
    if (!text?.trim() || isGenerating) return;
    
    // UI'da yer aç
    const tempId = Date.now();
    const newImage = {
      id: tempId,
      prompt: text.trim(),
      url: '',
      status: 'loading',
      timestamp: new Date()
    };
    
    setImages(prev => [newImage, ...prev]);
    setIsGenerating(true);
    setPrompt('');
    setGenStatus('optimizing');

    let finalPrompt = text.trim();

    // 1. Groq ile Promptu Uçur (Optimizasyon)
    try {
      const response = await fetch('/api/waffle-magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text.trim() })
      });
      const data = await response.json();
      if (data.optimizedPrompt) {
        finalPrompt = data.optimizedPrompt.slice(0, 800); // URL Güvenliği
      }
    } catch (e) {
      console.error("Groq Optimizer failed, proceeding with original.");
    }

    setGenStatus('drawing');
    
    // 2. Pollinations FLUX ile Çiz
    const cleanPrompt = encodeURIComponent(finalPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://pollinations.ai/p/${cleanPrompt}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

    // 3. Görselin gerçekten yüklendiğinden emin ol
    const imgLoad = new Image();
    imgLoad.src = imageUrl;

    const timeout = setTimeout(() => {
        setImages(prev => prev.map(img => img.id === tempId ? {...img, status: 'error'} : img));
        setIsGenerating(false);
        setGenStatus('');
    }, 30000); // 30 sn timeout

    imgLoad.onload = () => {
      clearTimeout(timeout);
      setImages(prev => prev.map(img => img.id === tempId ? {...img, status: 'ready', url: imageUrl, optimized: finalPrompt} : img));
      setIsGenerating(false);
      setGenStatus('');
    };

    imgLoad.onerror = async () => {
      clearTimeout(timeout);
      
      // FALLBACK: Eğer optimize edilmiş prompt hata verirse orijinal ile tekrar dene
      if (finalPrompt !== text.trim()) {
        console.log("Optimization failed, retrying with original prompt...");
        const originalUrl = `https://pollinations.ai/p/${encodeURIComponent(text.trim())}?width=1024&height=1024&seed=${seed}&nologo=true`;
        
        const fallbackLoad = new Image();
        fallbackLoad.src = originalUrl;
        
        fallbackLoad.onload = () => {
          setImages(prev => prev.map(img => img.id === tempId ? {...img, status: 'ready', url: originalUrl} : img));
          setIsGenerating(false);
          setGenStatus('');
        };

        fallbackLoad.onerror = () => {
          setImages(prev => prev.map(img => img.id === tempId ? {...img, status: 'error'} : img));
          setIsGenerating(false);
          setGenStatus('');
        };
      } else {
        setImages(prev => prev.map(img => img.id === tempId ? {...img, status: 'error'} : img));
        setIsGenerating(false);
        setGenStatus('');
      }
    };
  };

  const handleDownload = async (url, prompt) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `waffle-studio-${Date.now()}.png`;
      link.click();
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', height: '100%',
      background: 'rgba(10,10,24,0.6)', position: 'relative', overflow: 'hidden'
    }}>
      {/* Gallery Area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '40px 32px',
        display: 'flex', flexDirection: 'column', gap: '32px',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(245, 158, 11, 0.3) transparent'
      }}>
        
        {/* Empty State / Welcome */}
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', boxShadow: '0 12px 40px rgba(245, 158, 11, 0.4)',
            animation: 'waffle-float 6s ease-in-out infinite'
          }}>🧇</div>
          <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#fff', marginBottom: '8px', letterSpacing: '-0.5px' }}>Waffle AI Studio</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>
            HAN AI ve FLUX güç birliği ile yüksek kaliteli görseller üretin.
          </p>
        </div>

        {images.length === 0 ? (
          <div style={{
            display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '16px', maxWidth: '700px', margin: '0 auto', width: '100%'
          }}>
            {examples.map((ex, i) => (
              <button key={i} onClick={() => generateImage(ex.text)}
                style={{
                  padding: '20px', borderRadius: '16px', textAlign: 'left',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245, 158, 11, 0.15)',
                  cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', gap: '14px', alignItems: 'center'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span style={{ fontSize: '24px' }}>{ex.icon}</span>
                <span style={{ color: '#d0d0f0', fontSize: '13px', fontWeight: 500, lineHeight: 1.4 }}>{ex.text}</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '32px', maxWidth: '1200px', margin: '0 auto', width: '100%'
          }}>
            {images.map((img) => (
              <div key={img.id} style={{
                background: 'rgba(18,18,35,0.85)', borderRadius: '24px', overflow: 'hidden',
                border: '1px solid rgba(245, 158, 11, 0.25)', boxShadow: '0 12px 50px rgba(0,0,0,0.4)',
                animation: 'waffle-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
              }}>
                <div style={{ position: 'relative', aspectRatio: '1/1', background: '#07070a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {img.status === 'loading' && (
                       <div style={{ 
                         position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(7,7,10,0.8)',
                         display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px',
                         backdropFilter: 'blur(8px)'
                       }}>
                         <div style={{ width: '48px', height: '48px', border: '3px solid rgba(245, 158, 11, 0.2)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'waffle-spin 1s linear infinite' }} />
                         <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#f59e0b', fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {genStatus === 'optimizing' ? '🚀 GROQ TASARLIYOR...' : '🎨 WAFFLE ÇİZİYOR...'}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '6px' }}>Bu bir sanat eseri, biraz zaman gerekebilir</div>
                         </div>
                       </div>
                    )}
                    {img.status === 'error' && <div style={{ color: '#ef4444' }}>❌ Üretim başarısız oldu.</div>}
                    {img.url && (
                        <img src={img.url} alt={img.prompt} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: img.status === 'ready' ? 1 : 0 }} />
                    )}
                </div>
                <div style={{ padding: '20px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 800, background: 'rgba(245,158,11,0.1)', padding: '4px 8px', borderRadius: '6px' }}>⚡ GROQ ENHANCED</span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>FLUX.1 SCHNELL</span>
                   </div>
                   <p style={{ color: '#e0e0ff', fontSize: '13px', lineHeight: 1.6, marginBottom: '18px', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                     {img.prompt}
                   </p>
                   {img.status === 'ready' && (
                     <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleDownload(img.url, img.prompt)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#f59e0b', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '13px' }}>📥 İndir</button>
                        <button onClick={() => generateImage(img.prompt)} style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>🔄</button>
                     </div>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Overlay */}
      <div style={{ 
          padding: isMobile ? '12px 16px 20px' : '24px 40px 40px',
          background: 'linear-gradient(to top, rgba(8,8,18,1) 0%, transparent 100%)'
      }}>
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <ChatInput 
            value={prompt}
            onChange={setPrompt}
            onSend={() => generateImage(prompt)}
            isLoading={isGenerating}
            placeholder="Ne çizeyim dostum? Fikirlerini yaz, sanata dönüştüreyim..."
            isMobile={isMobile}
          />
        </div>
      </div>

      <style>{`
        @keyframes waffle-pop { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes waffle-spin { to { transform: rotate(360deg); } }
        @keyframes waffle-float { 
           0%, 100% { transform: translateY(0) rotate(0deg); }
           50% { transform: translateY(-10px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
