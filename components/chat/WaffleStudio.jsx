"use client";
import React, { useRef, useState, useEffect } from 'react';

const MAX_REFERENCE_IMAGES = 10;

export default function WaffleStudio({ isMobile }) {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState('');
  const [mode, setMode] = useState('image');
  const [aspect, setAspect] = useState('1:1');
  const [referenceImages, setReferenceImages] = useState([]);
  const [refInstruction, setRefInstruction] = useState('');
  const [isCombining, setIsCombining] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const fileInputRef = useRef(null);
  const refFileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const examples = [
    { icon: '🌇', text: 'Cyberpunk İstanbul, 2099, neon ışıklar, yağmurlu atmosfer, gerçekçi' },
    { icon: '🚀', text: 'Mars kolonisinde kahve içen astronot, sinematik, güneş ışığı' },
    { icon: '🎨', text: 'Sürrealist tarzda eriyen saatler ve uçan adalar, sanatsal' },
    { icon: '🐱', text: 'Samuray kıyafeti içinde kedi, kar taneleri altında, epik aura' },
  ];

  const handleReferenceUpload = (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    const remaining = MAX_REFERENCE_IMAGES - referenceImages.length;
    const toAdd = files.slice(0, remaining);
    Promise.all(toAdd.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve({ name: file.name, data: e.target.result });
      reader.readAsDataURL(file);
    }))).then(results => {
      setReferenceImages(prev => [...prev, ...results]);
    });
    event.target.value = '';
  };

  const removeRefImage = (index) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCombine = async () => {
    if (referenceImages.length === 0 || !refInstruction.trim() || isCombining) return;
    setIsCombining(true);
    try {
      const response = await fetch('/api/waffle-combine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: referenceImages.map(r => r.data),
          instruction: refInstruction.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Birleştirme başarısız');
      setImages(prev => [{
        id: Date.now(),
        prompt: `Birleştirme: ${refInstruction.trim()}`,
        url: data.url,
        status: 'ready',
        mediaType: 'image',
        timestamp: new Date(),
      }, ...prev]);
      setRefInstruction('');
    } catch (error) {
      console.error('Combine error:', error);
    } finally {
      setIsCombining(false);
    }
  };

  const generateMedia = async (text) => {
    if (!text?.trim() && referenceImages.length === 0) return;
    if (isGenerating) return;

    const tempId = Date.now();
    const newItem = {
      id: tempId,
      prompt: text?.trim() || 'Referans görsellerden üretim',
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
          referenceImages: referenceImages.map(r => r.data),
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim()) generateMedia(prompt);
    }
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [prompt]);

  const isReady = prompt.trim().length > 0 || referenceImages.length > 0;

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
        {/* Header */}
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

        {/* Mode & Aspect Toggles */}
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

        {/* Reference Images Section - Multi-photo combine */}
        <div style={{
          maxWidth: '700px', margin: '0 auto', width: '100%',
          padding: '20px', borderRadius: '20px',
          background: 'rgba(245,158,11,0.04)',
          border: '1px solid rgba(245,158,11,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <span style={{ fontSize: '18px' }}>🖼️</span>
            <span style={{ color: '#fcd34d', fontWeight: 700, fontSize: '14px' }}>Referans Görseller</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
              {referenceImages.length}/{MAX_REFERENCE_IMAGES}
            </span>
          </div>

          {referenceImages.length > 0 && (
            <div style={{
              display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px',
              marginBottom: '14px', scrollbarWidth: 'thin',
            }}>
              {referenceImages.map((img, i) => (
                <div key={i} style={{
                  position: 'relative', minWidth: '72px', width: '72px', height: '72px',
                  borderRadius: '12px', overflow: 'hidden', flexShrink: 0,
                  border: '2px solid rgba(245,158,11,0.3)',
                }}>
                  <img src={img.data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => removeRefImage(i)}
                    style={{
                      position: 'absolute', top: '2px', right: '2px', width: '20px', height: '20px',
                      borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: '#fff',
                      border: 'none', fontSize: '12px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              ref={refFileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleReferenceUpload}
            />
            <button
              type="button"
              onClick={() => refFileInputRef.current?.click()}
              disabled={referenceImages.length >= MAX_REFERENCE_IMAGES}
              style={{
                padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                color: '#fcd34d', fontWeight: 700, fontSize: '13px',
                opacity: referenceImages.length >= MAX_REFERENCE_IMAGES ? 0.4 : 1,
              }}
            >
              📸 Fotoğraf Seç
            </button>
            <input
              value={refInstruction}
              onChange={e => setRefInstruction(e.target.value)}
              placeholder="Görseller nasıl birleştirilsin?"
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '12px',
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(245,158,11,0.2)',
                color: '#e8e8ff', fontSize: '13px', outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={handleCombine}
              disabled={referenceImages.length === 0 || !refInstruction.trim() || isCombining}
              style={{
                padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
                background: isCombining ? 'rgba(245,158,11,0.3)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none', color: '#000', fontWeight: 800, fontSize: '13px',
                opacity: referenceImages.length === 0 || !refInstruction.trim() ? 0.4 : 1,
              }}
            >
              {isCombining ? '🌀' : '✨ Birleştir'}
            </button>
          </div>
        </div>

        {/* Content - Examples or Generated Images */}
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

      {/* Oven-shaped Input Area */}
      <div style={{
        padding: isMobile ? '0 12px 16px' : '0 24px 24px',
        position: 'relative',
      }}>
        {/* Oven glow effect */}
        <div style={{
          position: 'absolute', bottom: isMobile ? '16px' : '24px',
          left: '50%', transform: 'translateX(-50%)',
          width: isMobile ? '90%' : '70%', height: '80px',
          background: 'radial-gradient(ellipse, rgba(245,158,11,0.15), transparent 70%)',
          pointerEvents: 'none',
          animation: 'oven-glow 3s ease-in-out infinite',
        }} />

        <div style={{
          maxWidth: '700px', margin: '0 auto',
          position: 'relative',
        }}>
          {/* Oven top arch */}
          <div style={{
            position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
            width: isMobile ? '70%' : '60%', height: '28px',
            background: '#1a1a2e',
            borderTopLeftRadius: '50%', borderTopRightRadius: '50%',
            border: '2px solid rgba(245,158,11,0.3)',
            borderBottom: 'none',
            zIndex: 2,
          }}>
            {/* Oven handle */}
            <div style={{
              position: 'absolute', top: '-2px', left: '50%', transform: 'translateX(-50%)',
              width: '40%', height: '4px',
              background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)',
              borderRadius: '2px',
            }} />
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(20,18,35,0.95), rgba(30,25,50,0.95))',
            borderRadius: '20px 20px 16px 16px',
            border: '2px solid rgba(245,158,11,0.25)',
            boxShadow: inputFocused
              ? '0 0 40px rgba(245,158,11,0.2), inset 0 0 30px rgba(245,158,11,0.05)'
              : '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Fire border animation */}
            <div style={{
              position: 'absolute', inset: 0,
              background: inputFocused
                ? 'radial-gradient(ellipse at 50% 100%, rgba(245,158,11,0.08), transparent 70%)'
                : 'none',
              pointerEvents: 'none',
              transition: 'all 0.5s ease',
            }} />

            {/* Input area */}
            <div style={{
              padding: '14px 16px 10px',
              display: 'flex', alignItems: 'flex-end', gap: '8px',
              position: 'relative', zIndex: 1,
            }}>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={mode === 'video'
                  ? 'Hareketli sahne tarif et...'
                  : 'Fırına ne atalım? 🧇 İstediğin görseli tarif et...'}
                disabled={isGenerating}
                rows={1}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#f0e6d0', fontSize: isMobile ? '14px' : '15px', lineHeight: '22px',
                  resize: 'none', fontFamily: 'Geist, Inter, sans-serif', fontWeight: '500', letterSpacing: '-0.02em',
                  minHeight: '22px', padding: '8px 4px',
                  maxHeight: '120px', overflowY: 'auto',
                  scrollbarWidth: 'thin', scrollbarColor: 'rgba(245,158,11,0.2) transparent',
                  caretColor: '#f59e0b',
                }}
              />

              {/* Send button */}
              <button
                type="button"
                onClick={() => generateMedia(prompt)}
                disabled={!isReady || isGenerating}
                style={{
                  width: '42px', height: '42px', borderRadius: '14px', flexShrink: 0,
                  background: isReady && !isGenerating
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : 'rgba(255,255,255,0.05)',
                  border: isReady && !isGenerating ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  cursor: isReady && !isGenerating ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isReady && !isGenerating
                    ? '0 0 24px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.3)'
                    : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isReady && !isGenerating ? 'scale(1)' : 'scale(0.9)',
                  position: 'relative', zIndex: 2,
                }}
                onMouseEnter={e => {
                  if (isReady && !isGenerating) {
                    e.currentTarget.style.transform = 'scale(1.08)';
                    e.currentTarget.style.boxShadow = '0 0 36px rgba(245,158,11,0.6), inset 0 1px 0 rgba(255,255,255,0.4)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = isReady && !isGenerating ? 'scale(1)' : 'scale(0.9)';
                  e.currentTarget.style.boxShadow = isReady && !isGenerating
                    ? '0 0 24px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.3)'
                    : 'none';
                }}
              >
                {isGenerating ? (
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.25)',
                    borderTop: '2px solid #fff',
                    animation: 'oven-spin 0.8s linear infinite',
                  }} />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={isReady ? '#1a1a2e' : '#666'}
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                )}
              </button>
            </div>

            {/* Flame decoration */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: '12px',
              padding: '0 16px 10px', position: 'relative', zIndex: 1,
            }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  width: '6px', height: '10px',
                  borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                  background: 'linear-gradient(to top, rgba(245,158,11,0.3), rgba(251,191,36,0.1))',
                  animation: 'oven-fire 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>

          {/* Oven legs */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '0 30px', marginTop: '2px',
          }}>
            <div style={{ width: '8px', height: '6px', background: 'rgba(245,158,11,0.2)', borderRadius: '0 0 4px 4px' }} />
            <div style={{ width: '8px', height: '6px', background: 'rgba(245,158,11,0.2)', borderRadius: '0 0 4px 4px' }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes waffle-pop { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes waffle-spin { to { transform: rotate(360deg); } }
        @keyframes waffle-float {
           0%, 100% { transform: translateY(0) rotate(0deg); }
           50% { transform: translateY(-10px) rotate(5deg); }
        }
        @keyframes oven-glow {
          0%, 100% { opacity: 0.5; transform: translateX(-50%) scaleY(1); }
          50% { opacity: 1; transform: translateX(-50%) scaleY(1.2); }
        }
        @keyframes oven-fire {
          0%, 100% { transform: translateY(0) scaleY(1); opacity: 0.6; }
          50% { transform: translateY(-4px) scaleY(1.4); opacity: 1; }
        }
        @keyframes oven-spin { to { transform: rotate(360deg); } }
        textarea::placeholder { color: rgba(210,180,140,0.35); }
      `}</style>
    </div>
  );
}
