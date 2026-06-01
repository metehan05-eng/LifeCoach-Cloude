"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function ConfettiParticle({ index }) {
  const x = Math.random() * 100;
  const delay = Math.random() * 0.5;
  const duration = 1.5 + Math.random() * 1;
  const color = ['#6366f1', '#8b5cf6', '#f59e0b', '#f472b6', '#34d399', '#60a5fa'][index % 6];
  const size = 4 + Math.random() * 8;
  const rotation = Math.random() * 360;

  return (
    <motion.div
      initial={{ x: `${x}vw`, y: -20, rotate: 0, opacity: 1 }}
      animate={{ y: '100vh', rotate: rotation + 720, opacity: 0 }}
      transition={{ duration, delay, ease: 'easeIn' }}
      style={{
        position: 'fixed', top: 0, zIndex: 9999, pointerEvents: 'none',
        width: size, height: size, borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        background: color,
        boxShadow: `0 0 6px ${color}`,
      }}
    />
  );
}

export default function LevelUpCelebration({ levelUpData }) {
  const [show, setShow] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (levelUpData) {
      setShow(true);
      setParticles(Array.from({ length: 40 }, (_, i) => i));
      const timer = setTimeout(() => {
        setShow(false);
        setParticles([]);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [levelUpData]);

  return (
    <AnimatePresence>
      {show && levelUpData && (
        <>
          {/* Confetti */}
          {particles.map(i => <ConfettiParticle key={i} index={i} />)}

          {/* Level Up Card */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -80, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            style={{
              position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
              zIndex: 9998, pointerEvents: 'none',
              textAlign: 'center',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(139,92,246,0.9))',
                border: '2px solid rgba(250,204,21,0.4)',
                borderRadius: '24px', padding: '32px 48px',
                boxShadow: '0 0 80px rgba(99,102,241,0.5), 0 0 160px rgba(139,92,246,0.2)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 250, damping: 12, delay: 0.2 }}
                style={{ fontSize: '64px', marginBottom: '8px' }}
              >
                ⬆
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{ fontSize: '28px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}
              >
                LEVEL UP!
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 10, delay: 0.6 }}
                style={{
                  fontSize: '48px', fontWeight: 900, color: '#facc15',
                  margin: '4px 0',
                  textShadow: '0 0 30px rgba(250,204,21,0.5)',
                }}
              >
                {levelUpData.oldLevel} → {levelUpData.newLevel}
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}
              >
                Yeni seviyeye ulaştın! 🎉
              </motion.div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 1.2, duration: 1, ease: 'easeOut' }}
                style={{
                  height: '3px', background: 'linear-gradient(90deg, #facc15, #f59e0b)',
                  borderRadius: '2px', marginTop: '16px',
                }}
              />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
