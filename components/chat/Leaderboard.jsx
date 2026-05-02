"use client";
import React, { useState, useEffect } from 'react';

export default function Leaderboard({ userEmail, isMobile }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/gamify/leaderboard?email=${userEmail}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, [userEmail]);

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
       <div style={{ width: '40px', height: '40px', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'ci-spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ 
      flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '40px 24px',
      background: 'rgba(10, 10, 20, 0.4)', backdropFilter: 'blur(20px)'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>🚀 Global Focus Ranks</h2>
          <p style={{ color: 'rgba(165,180,252,0.6)' }}>{data.totalUsers.toLocaleString()} aktif kullanıcı arasında senin yerin</p>
        </div>

        {/* Top 5 Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '40px' }}>
          {data.top5.map((bot) => (
            <div key={bot.rank} style={{ 
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              padding: '20px', borderRadius: '20px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>{bot.rank === 1 ? '🥇' : bot.rank === 2 ? '🥈' : '🥉'}</div>
              <div style={{ fontWeight: 800, color: '#fff' }}>{bot.name}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{bot.country}</div>
              <div style={{ 
                marginTop: '12px', fontSize: '12px', fontWeight: 700, 
                color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '4px 0', borderRadius: '8px'
              }}>LVL {bot.level}</div>
            </div>
          ))}
        </div>

        {/* User's Current Position */}
        <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: '24px', padding: '24px', border: '1.5px solid rgba(99,102,241,0.2)', marginBottom: '40px' }}>
           <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '1px' }}>Senin Sıralaman</h3>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             {/* Neighbor Above */}
             <div style={{ display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.6 }}>
                <div style={{ width: '40px', fontWeight: 800, color: 'rgba(255,255,255,0.3)' }}>#{data.neighbors[0].rank}</div>
                <div style={{ flex: 1, color: '#fff' }}>{data.neighbors[0].name} <span style={{ opacity: 0.5, fontSize: '12px' }}>{data.neighbors[0].country}</span></div>
                <div style={{ color: '#6366f1', fontWeight: 700 }}>LVL {data.neighbors[0].level}</div>
             </div>

             {/* YOU */}
             <div style={{ 
               display: 'flex', alignItems: 'center', gap: '16px', 
               background: 'rgba(99,102,241,0.2)', padding: '16px', borderRadius: '16px',
               boxShadow: '0 8px 32px rgba(99,102,241,0.15)', transform: 'scale(1.02)'
             }}>
                <div style={{ width: '40px', fontWeight: 800, color: '#fff', fontSize: '18px' }}>#{data.userRank}</div>
                <div style={{ flex: 1, fontWeight: 800, color: '#fff', fontSize: '16px' }}>SİZ</div>
                <div style={{ color: '#fff', fontWeight: 800, background: '#6366f1', padding: '6px 12px', borderRadius: '10px' }}>SENİN YERİN</div>
             </div>

             {/* Neighbor Below */}
             <div style={{ display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.6 }}>
                <div style={{ width: '40px', fontWeight: 800, color: 'rgba(255,255,255,0.3)' }}>#{data.neighbors[1].rank}</div>
                <div style={{ flex: 1, color: '#fff' }}>{data.neighbors[1].name} <span style={{ opacity: 0.5, fontSize: '12px' }}>{data.neighbors[1].country}</span></div>
                <div style={{ color: '#6366f1', fontWeight: 700 }}>LVL {data.neighbors[1].level}</div>
             </div>
           </div>
        </div>

        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>
          Dünya çapındaki 12.500+ odaklanmış zihin ile yarışıyorsun. <br/>Günde en az 3 hedef tamamlayarak sıralamanı koru!
        </div>
      </div>

      <style>{`
        @keyframes ci-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
