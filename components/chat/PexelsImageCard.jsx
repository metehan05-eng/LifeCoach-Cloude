"use client";
import React, { useState } from 'react';

const TOPIC_LABELS = {
  motivation: 'Motivasyon', health: 'Sağlık', career: 'Kariyer',
  finance: 'Finans', education: 'Eğitim', startup: 'Girişim',
  technology: 'Teknoloji', nature: 'Doğa', productivity: 'Üretkenlik',
  meditation: 'Meditasyon', social: 'Sosyal', food: 'Beslenme',
};

export default function PexelsImageCard({ images }) {
  const [loaded, setLoaded] = useState({});
  const [expanded, setExpanded] = useState(null);

  if (!images || images.length === 0) return null;

  const image = images[0];
  const topicLabel = TOPIC_LABELS[image.topic] || 'Görsel';

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{
        fontSize: '11px', fontWeight: 700, color: 'rgba(236,72,153,0.7)',
        letterSpacing: '0.8px', textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px'
      }}>
        <span style={{ fontSize: '13px' }}>🖼️</span> {topicLabel}
      </div>
      <div style={{
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid rgba(236,72,153,0.2)',
        background: 'rgba(236,72,153,0.04)',
        animation: 'ci-pop 0.3s ease-out both',
      }}>
        <a href={image.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <div style={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%',
            background: 'rgba(0,0,0,0.15)',
            overflow: 'hidden',
            cursor: 'pointer',
          }}>
            <img
              src={image.src.large}
              alt={image.alt}
              loading="lazy"
              onLoad={() => setLoaded(prev => ({ ...prev, [image.id]: true }))}
              style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: loaded[image.id] ? 1 : 0,
                transition: 'opacity 0.4s ease',
              }}
            />
            {!loaded[image.id] && (
              <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'rgba(255,255,255,0.2)',
                fontSize: '24px',
              }}>
                🖼️
              </div>
            )}
          </div>
        </a>
        <div style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(236,72,153,0.1)',
        }}>
          <span style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.4)',
          }}>
            📸 <a href={image.photographerUrl} target="_blank" rel="noopener noreferrer"
              style={{ color: 'rgba(236,72,153,0.6)', textDecoration: 'none' }}>
              {image.photographer}
            </a>
          </span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
            Pexels
          </span>
        </div>
      </div>
      {images.length > 1 && (
        <div style={{
          display: 'flex', gap: '6px', marginTop: '6px', overflowX: 'auto',
          paddingBottom: '4px',
        }}>
          {images.slice(1).map(img => (
            <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer"
              style={{ flexShrink: 0, width: '80px', height: '60px', borderRadius: '8px',
                overflow: 'hidden', border: '1px solid rgba(236,72,153,0.15)',
                textDecoration: 'none' }}>
              <img src={img.src.small} alt={img.alt}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
