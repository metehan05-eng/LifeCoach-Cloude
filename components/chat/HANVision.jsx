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
      onSnapshot(base64Data);
      setAnalyzing(false);
    }, 800); // Tarama efekti için kısa bir bekleme
  };

  return (
    <div style={{
      position: 'fixed', top: '20px', right: '20px', 
      width: '240px', height: '320px', 
      borderRadius: '20px', overflow: 'hidden',
      background: '#000', border: '2px solid rgba(99,102,241,0.5)',
      boxShadow: '0 0 30px rgba(99,102,241,0.3)', zIndex: 9999,
      display: 'flex', flexDirection: 'column'
    }}>
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
