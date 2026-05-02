"use client";
import React, { useState, useEffect } from 'react';

export default function Leaderboard({ userEmail, isMobile, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/gamify/leaderboard?email=${userEmail}`)
      .then(res => res.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(err => {
        setError("Sunucuya bağlanılamadı");
        setLoading(false);
      });
  }, [userEmail]);

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
       <div style={{ width: '40px', height: '40px', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'ci-spin 1s linear infinite' }} />
    </div>
  );

  if (error) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
       <div style={{ padding: '20px', background: '#1a1a2e', borderRadius: '12px', border: '1px solid #ff4444', color: '#ff4444', textAlign: 'center' }}>
          <p>Hata: {error}</p>
          <button onClick={onClose} style={{ marginTop: '10px', background: '#ff4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Kapat</button>
       </div>
    </div>
  );

  return (
    <div style={{ 
      position: 'fixed', inset: 0, zIndex: 100, 
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? '16px' : '40px',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(12px)',
      animation: 'ci-fadein 0.3s ease-out'
    }}>
      {/* Click outside to close */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0 }} />

      <div style={{ 
        position: 'relative', width: '100%', maxWidth: '650px', maxHeight: '90vh',
        background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.95), rgba(10, 10, 20, 0.98))',
        borderRadius: '32px', border: '1px solid rgba(99,102,241,0.2)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
             <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>🏆 Global Focus Arenası</h2>
             <p style={{ fontSize: '12px', color: 'rgba(165,180,252,0.5)' }}>{(data?.totalUsers || 12500).toLocaleString()} aktif disiplin savaşçısı</p>
          </div>
          <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          {/* Top 3 Podium Style Card */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            {data?.top5?.slice(0, 3).map((bot, idx) => (
              <div key={bot.rank} style={{ 
                flex: 1, background: idx === 0 ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                border: idx === 0 ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.08)',
                padding: '16px', borderRadius: '20px', textAlign: 'center',
                transform: idx === 0 ? 'scale(1.05)' : 'scale(1)',
                zIndex: idx === 0 ? 2 : 1
              }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
                <div style={{ fontWeight: 800, color: '#fff', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bot.name}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{bot.country}</div>
              </div>
            ))}
          </div>

          {/* User Rankings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             {data?.neighbors?.map((n) => (
               <div key={n.rank} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', opacity: 0.6 }}>
                  <div style={{ width: '35px', fontSize: '12px', fontWeight: 800, color: 'rgba(255,255,255,0.3)' }}>#{n.rank}</div>
                  <div style={{ flex: 1, color: '#fff', fontSize: '14px' }}>{n.name} <span style={{ opacity: 0.4, fontSize: '11px' }}>{n.country}</span></div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#6366f1' }}>Lvl {n.level}</div>
               </div>
             ))}

             {/* YOU */}
             <div style={{ 
               display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', 
               background: 'linear-gradient(90deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))',
               border: '1.5px solid rgba(99,102,241,0.4)',
               borderRadius: '16px', margin: '4px 0',
               boxShadow: '0 0 20px rgba(99,102,241,0.2)'
             }}>
                <div style={{ width: '35px', fontSize: '14px', fontWeight: 900, color: '#fff' }}>#{data?.userRank}</div>
                <div style={{ flex: 1, fontWeight: 800, color: '#fff', fontSize: '15px' }}>SİZ</div>
                <div style={{ color: '#fff', fontWeight: 800, background: '#6366f1', padding: '5px 12px', borderRadius: '8px', fontSize: '11px' }}>BU SENSİN!</div>
             </div>
          </div>
        </div>

        <div style={{ padding: '20px 32px', background: 'rgba(255,255,255,0.02)', textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
           Daha fazla hedef tamamlayarak sıralamanı koru. Disiplin başarının anahtarıdır.
        </div>
      </div>

      <style>{`
        @keyframes ci-spin { to { transform: rotate(360deg); } }
        @keyframes ci-fadein { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
