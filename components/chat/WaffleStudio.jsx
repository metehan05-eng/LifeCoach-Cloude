"use client";
import React, { useRef, useState } from 'react';
import ChatInput from './ChatInput';

export default function WaffleStudio({ isMobile }) {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState('');
  const [mode, setMode] = useState('image');
  const [aspect, setAspect] = useState('1:1');
  const [referenceImage, setReferenceImage] = useState(null);
  const fileInputRef = useRef(null);

  const examples = [
    { icon: '🌇', text: 'Cyberpunk İstanbul, 2099, neon ışıklar, yağmurlu atmosfer, gerçekçi' },
    { icon: '🚀', text: 'Mars kolonisinde kahve içen astronot, sinematik, güneş ışığı' },
    { icon: '🎨', text: 'Sürrealist tarzda eriyen saatler ve uçan adalar, sanatsal' },
    { icon: '🐱', text: 'Samuray kıyafeti içinde kedi, kar taneleri altında, epik aura' },
  ];

  const handleReferenceUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setReferenceImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const generateMedia = async (text) => {
    if (!text?.trim() && !referenceImage) return;
    if (isGenerating) return;

    const tempId = Date.now();
    const newItem = {
      id: tempId,
      prompt: text?.trim() || 'Referans görselden üretim',
      url: '',
      status: 'loading',
      mediaType: mode === 'video' ? 'video' : 'image',
      timestamp: new Date(),
    };

    setImages(prev => [newItem, ...prev]);
    setIsGenerating(true);
    setPrompt('');
    setGenStatus('optimizing');

    try {
      setGenStatus(mode === 'video' ? 'rendering-video' : 'drawing');

      const response = await fetch('/api/waffle-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text?.trim() || '',
          mode,
          referenceImage,
          aspect,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Üretim başarısız');
      }

      setImages(prev => prev.map(item => item.id === tempId ? {
        ...item,
        status: 'ready',
        url: data.url,
        optimized: data.optimizedPrompt,
        model: data.model,
        provider: data.provider,
        promptEngine: data.promptEngine,
        mediaType: data.mediaType || (mode === 'video' ? 'video' : 'image'),
      } : item));
    } catch (error) {
      console.error('Waffle generate error:', error);
      setImages(prev => prev.map(item => item.id === tempId ? { ...item, status: 'error', error: error.message } : item));
    } finally {
      setIsGenerating(false);
      setGenStatus('');
    }
  };

  const handleDownload = async (item) => {
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const ext = item.mediaType === 'video' ? 'mp4' : 'png';
      link.download = `waffle-studio-${Date.now()}.${ext}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      window.open(item.url, '_blank');
    }
  };

  const statusLabel = () => {
    if (genStatus === 'optimizing') return '🧠 HF PROMPT USTASI ÇALIŞIYOR...';
    if (genStatus === 'rendering-video') return '🎬 VİDEO RENDER EDİLİYOR...';
    if (genStatus === 'drawing') return '🎨 GÖRSEL ÜRETİLİYOR...';
    return '⏳ HAZIRLANIYOR...';
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', height: '100%',
      background: 'rgba(10,10,24,0.6)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '40px 32px',
        display: 'flex', flexDirection: 'column', gap: '32px',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(245, 158, 11, 0.3) transparent',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', boxShadow: '0 12px 40px rgba(245, 158, 11, 0.4)',
            animation: 'waffle-float 6s ease-in-out infinite',
          }}>🧇</div>
          <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#fff', marginBottom: '8px', letterSpacing: '-0.5px' }}>Waffle AI Studio</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>
            Hugging Face FLUX + LTX Video — text-to-image ve image-to-video.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { id: 'image', label: '🎨 Görsel' },
            { id: 'video', label: '🎬 Video' },
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMode(opt.id)}
              style={{
                padding: '10px 18px', borderRadius: '999px', cursor: 'pointer', fontWeight: 800, fontSize: '13px',
                border: mode === opt.id ? '1px solid rgba(245,158,11,0.6)' : '1px solid rgba(255,255,255,0.08)',
                background: mode === opt.id ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.03)',
                color: mode === opt.id ? '#fbbf24' : 'rgba(255,255,255,0.55)',
              }}
            >
              {opt.label}
            </button>
          ))}
          {mode === 'image' && ['1:1', '16:9', '9:16'].map(size => (
            <button
              key={size}
              type="button"
              onClick={() => setAspect(size)}
              style={{
                padding: '10px 14px', borderRadius: '999px', cursor: 'pointer', fontWeight: 700, fontSize: '12px',
                border: aspect === size ? '1px solid rgba(96,165,250,0.5)' : '1px solid rgba(255,255,255,0.08)',
                background: aspect === size ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                color: aspect === size ? '#93c5fd' : 'rgba(255,255,255,0.45)',
              }}
            >
              {size}
            </button>
          ))}
        </div>

        <div style={{ maxWidth: '850px', margin: '0 auto', width: '100%', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleReferenceUpload} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d', fontWeight: 700,
            }}
          >
            📎 Referans Görsel
          </button>
          {referenceImage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <img src={referenceImage} alt="Referans" style={{ width: 44, height: 44, borderRadius: '8px', objectFit: 'cover' }} />
              <button type="button" onClick={() => setReferenceImage(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>✕</button>
            </div>
          )}
        </div>

        {images.length === 0 ? (
          <div style={{
            display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '16px', maxWidth: '700px', margin: '0 auto', width: '100%',
          }}>
            {examples.map((ex, i) => (
              <button key={i} type="button" onClick={() => generateMedia(ex.text)}
                style={{
                  padding: '20px', borderRadius: '16px', textAlign: 'left',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245, 158, 11, 0.15)',
                  cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', gap: '14px', alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '24px' }}>{ex.icon}</span>
                <span style={{ color: '#d0d0f0', fontSize: '13px', fontWeight: 500, lineHeight: 1.4 }}>{ex.text}</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '32px', maxWidth: '1200px', margin: '0 auto', width: '100%',
          }}>
            {images.map((img) => (
              <div key={img.id} style={{
                background: 'rgba(18,18,35,0.85)', borderRadius: '24px', overflow: 'hidden',
                border: '1px solid rgba(245, 158, 11, 0.25)', boxShadow: '0 12px 50px rgba(0,0,0,0.4)',
                animation: 'waffle-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
              }}>
                <div style={{ position: 'relative', aspectRatio: img.mediaType === 'video' ? '16/9' : '1/1', background: '#07070a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {img.status === 'loading' && (
                    <div style={{
                      position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(7,7,10,0.8)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px',
                      backdropFilter: 'blur(8px)',
                    }}>
                      <div style={{ width: '48px', height: '48px', border: '3px solid rgba(245, 158, 11, 0.2)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'waffle-spin 1s linear infinite' }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#f59e0b', fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                          {statusLabel()}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '6px' }}>
                          {img.mediaType === 'video' ? 'Video render 1-2 dk sürebilir' : 'Yüksek kalite FLUX üretimi'}
                        </div>
                      </div>
                    </div>
                  )}
                  {img.status === 'error' && (
                    <div style={{ color: '#ef4444', padding: '20px', textAlign: 'center' }}>
                      ❌ {img.error || 'Üretim başarısız oldu.'}
                    </div>
                  )}
                  {img.url && img.mediaType === 'video' && (
                    <video src={img.url} controls loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  {img.url && img.mediaType !== 'video' && (
                    <img src={img.url} alt={img.prompt} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: img.status === 'ready' ? 1 : 0 }} />
                  )}
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 800, background: 'rgba(245,158,11,0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                      ⚡ {img.promptEngine?.toUpperCase() || 'HF'} PROMPT
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                      {img.model || (img.mediaType === 'video' ? 'LTX Video' : 'FLUX')}
                    </span>
                  </div>
                  <p style={{ color: '#e0e0ff', fontSize: '13px', lineHeight: 1.6, marginBottom: '18px', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {img.prompt}
                  </p>
                  {img.status === 'ready' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={() => handleDownload(img)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#f59e0b', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                        📥 İndir
                      </button>
                      <button type="button" onClick={() => generateMedia(img.prompt)} style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                        🔄
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        padding: isMobile ? '12px 16px 20px' : '24px 40px 40px',
        background: 'linear-gradient(to top, rgba(8,8,18,1) 0%, transparent 100%)',
      }}>
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <ChatInput
            value={prompt}
            onChange={setPrompt}
            onSend={() => generateMedia(prompt)}
            isLoading={isGenerating}
            placeholder={mode === 'video'
              ? 'Hareketli sahne tarif et veya referans görsel yükle...'
              : 'Ne çizeyim? Türkçe yaz, HF prompt ustası İngilizce kalite promptuna çevirir...'}
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
