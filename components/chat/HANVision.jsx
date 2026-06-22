import React, { useRef, useState, useEffect } from 'react';
import styles from './AutomationWorkbench.module.css'; // Stil için geçici olarak overlay kullanabiliriz veya inline

export default function HANVision({ onSnapshot, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    let stream = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch (err) {
        console.error("Kamera izni alınamadı:", err);
      }
    };

    startCamera();

    // Cleanup: Kameraları kapat
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setAnalyzing(true);
    
    setTimeout(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      
      // Python HAN Engine'e İstek At
      fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64Data })
      })
      .then(res => {
         if (!res.ok) throw new Error("Python Backend Not Ready");
         return res.json();
      })
      .then(data => {
        if (data.status === 'success') {
          onSnapshot(base64Data, data);
        } else {
          onSnapshot(base64Data, null);
        }
      })
      .catch(err => {
        console.log("Python Backend kullanılamıyor, LLM Vision'a düşülecek...", err.message);
        onSnapshot(base64Data, null); // Fallback to raw vision
      })
      .finally(() => {
        setAnalyzing(false);
      });
    }, 800); // Tarama efekti için kısa bir bekleme
  };

  return (
    <div
      className="fixed z-[9999] flex flex-col overflow-hidden shadow-2xl"
      style={{
        top: 'max(12px, env(safe-area-inset-top))',
        right: 'max(12px, env(safe-area-inset-right))',
        width: 'min(280px, calc(100vw - 24px))',
        height: 'min(380px, calc(100vh - 120px))',
        borderRadius: '20px',
        background: '#000',
        border: '2px solid rgba(99,102,241,0.5)',
        boxShadow: '0 0 30px rgba(99,102,241,0.3)',
      }}
    >
      {/* Üst Bar */}
      <div style={{
        background: 'rgba(0,0,0,0.8)', padding: '8px 12px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)', zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', letterSpacing: '1px' }}>HAN VISION</span>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>✕</button>
      </div>

      {/* Video Feed */}
      <div style={{ position: 'relative', flex: 1, backgroundColor: '#111' }}>
        {!hasPermission && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
            Kamera erişimi bekleniyor...
          </div>
        )}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
        />
        
        {/* Terminatör / Analiz Efekti */}
        {analyzing && (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(99,102,241,0.2)', border: '2px solid #6366f1',
            boxShadow: 'inset 0 0 20px rgba(99,102,241,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 5
          }}>
            <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px' }}>
              [BİYOMETRİK ANALİZ...]
            </div>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Beta Notice Overlay */}
        <div style={{
          position: 'absolute', bottom: '12px', left: '12px', right: '12px',
          background: 'rgba(99,102,241,0.9)', backdropFilter: 'blur(8px)',
          padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)',
          zIndex: 20, textAlign: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
          animation: 'lp-msg-in 0.5s ease both'
        }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
            🚀 Beta Aşamasında
          </div>
          <div style={{ fontSize: '11px', color: '#e0e0ff', fontWeight: 500, lineHeight: 1.3 }}>
            HAN Vision Beta aşamasındadır Çok yakında.
          </div>
        </div>
      </div>

      {/* Alt Kontrol */}
      <div style={{ background: 'rgba(0,0,0,0.8)', padding: '12px', zIndex: 10, display: 'flex', justifyContent: 'center' }}>
        <button 
          onClick={captureFrame}
          disabled={!hasPermission || analyzing}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
            border: 'none', padding: '8px 16px', borderRadius: '12px', fontSize: '12px',
            fontWeight: 'bold', cursor: 'pointer', opacity: (!hasPermission || analyzing) ? 0.5 : 1,
            width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px'
          }}
        >
          <span>👁️</span> İfademi Analiz Et
        </button>
      </div>
    </div>
  );
}
