"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOX_TYPES = {
  standard: { label: 'Standart Kasa', price: 200, color: '#6366f1', icon: '📦' },
  premium:  { label: 'Premium Kasa',  price: 500, color: '#f59e0b', icon: '👑' },
};

export default function LootBox({ email, isPremium, balance, onClose, onReward }) {
  const [boxType, setBoxType] = useState('standard');
  const [opening, setOpening] = useState(false);
  const [drop, setDrop] = useState(null);
  const [error, setError] = useState(null);

  const price = BOX_TYPES[boxType]?.price || 200;
  const canOpen = balance >= price && !opening;

  async function handleOpen() {
    if (!canOpen) return;
    setOpening(true);
    setError(null);
    setDrop(null);
    try {
      const res = await fetch('/api/gamification/open-box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, boxType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Kasa açılamadı');
        setOpening(false);
        return;
      }
      setDrop(data.drop);
      if (onReward) onReward(data);
      setTimeout(() => setOpening(false), 600);
    } catch (e) {
      setError('Bir hata oluştu');
      setOpening(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{
          background: 'linear-gradient(135deg, rgba(15,15,30,0.98), rgba(20,20,40,0.95))',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '24px', padding: '32px', maxWidth: '420px', width: '90%',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e0e0ff' }}>
            {isPremium ? '👑 ' : ''}Kasa Aç
          </h2>
          <span style={{ fontSize: '13px', color: '#a5b4fc' }}>🪙 {balance} Coin</span>
        </div>

        {/* Box type selector */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {Object.entries(BOX_TYPES).map(([key, bt]) => (
            <button key={key} onClick={() => { setBoxType(key); setDrop(null); }}
              style={{
                flex: 1, padding: '12px', borderRadius: '14px', cursor: 'pointer',
                border: `1px solid ${boxType === key ? bt.color : 'rgba(255,255,255,0.1)'}`,
                background: boxType === key ? `${bt.color}22` : 'rgba(255,255,255,0.03)',
                color: boxType === key ? bt.color : 'rgba(255,255,255,0.5)',
                fontWeight: 600, fontSize: '13px', textAlign: 'center', transition: 'all 0.2s',
              }}
            >
              {bt.icon} {bt.label}<br />
              <span style={{ fontSize: '11px', opacity: 0.7 }}>{bt.price} Coin</span>
            </button>
          ))}
        </div>

        {/* Box animation */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '180px' }}>
          <AnimatePresence mode="wait">
            {!drop && (
              <motion.div key="box" exit={{ scale: 0, rotate: 180, opacity: 0 }}
                style={{ textAlign: 'center' }}
              >
                <motion.div
                  animate={opening ? { rotate: [0, -15, 15, -15, 0], scale: [1, 1.1, 1.1, 1.05, 1] } : {}}
                  transition={{ duration: 0.6 }}
                  style={{ fontSize: '80px', marginBottom: '12px' }}
                >
                  {isPremium ? '👑' : '📦'}
                </motion.div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                  {opening ? 'Açılıyor...' : `${price} Coin karşılığında aç`}
                </div>
              </motion.div>
            )}
            {drop && (
              <motion.div key="drop" initial={{ scale: 0, y: 40, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                style={{ textAlign: 'center' }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 10, delay: 0.2 }}
                  style={{
                    fontSize: '72px', marginBottom: '12px',
                    textShadow: `0 0 40px ${drop.colors?.glow || 'rgba(99,102,241,0.3)'}`,
                  }}
                >
                  {drop.icon}
                </motion.div>
                <div style={{
                  fontSize: '16px', fontWeight: 700, color: drop.colors?.text || '#fff',
                  marginBottom: '4px',
                }}>
                  {drop.name}
                </div>
                <div style={{
                  fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                  color: drop.colors?.text || 'rgba(255,255,255,0.4)',
                  opacity: 0.6,
                }}>
                  {drop.rarity === 'legendary' ? '⭐ EFSANEVİ' : drop.rarity === 'epic' ? '💎 EPİK' : drop.rarity === 'rare' ? '🔷 NADİR' : 'Sıradan'}
                </div>
                <div style={{
                  marginTop: '12px', padding: '8px 16px', borderRadius: '10px',
                  background: `${drop.colors?.bg || 'rgba(255,255,255,0.05)'}`,
                  border: `1px solid ${drop.colors?.border || 'rgba(255,255,255,0.1)'}`,
                  fontSize: '13px', color: drop.colors?.text || '#fff',
                  fontWeight: 600,
                }}>
                  {drop.itemType === 'coin' ? `+${drop.quantity} HAN Coin kazandın!` : `${drop.name} envanterine eklendi!`}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && <div style={{ color: '#f87171', fontSize: '13px', textAlign: 'center', marginTop: '12px' }}>{error}</div>}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '13px',
            }}
          >Kapat</button>
          <button onClick={handleOpen} disabled={!canOpen}
            style={{
              flex: 2, padding: '12px', borderRadius: '12px', cursor: canOpen ? 'pointer' : 'not-allowed',
              background: canOpen ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
              border: 'none', color: '#fff', fontWeight: 700, fontSize: '13px',
              opacity: canOpen ? 1 : 0.4,
            }}
          >{opening ? '🎲 Açılıyor...' : drop ? '✅ Tekrar Aç' : `🔓 Kasayı Aç (${price} Coin)`}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
