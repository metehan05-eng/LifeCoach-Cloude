"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

/* ── Components ── */

function UserNav({ isMobile }) {
  const { data: session } = useSession();

  if (session) {
    return (
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {session.user.image ? (
            <img src={session.user.image} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #7c3aed' }} alt="Avatar" />
          ) : (
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
              {session.user.name?.[0] || 'U'}
            </div>
          )}
          {!isMobile && <span style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0ff' }}>{session.user.name}</span>}
        </div>
        <Link href="/chat" style={{ textDecoration: 'none', width: isMobile ? '100%' : 'auto' }}>
          <button className="lp-glow-btn" style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '14px', width: '100%' }}>
            <span>Panele Git</span>
          </button>
        </Link>
        <button onClick={() => signOut()} className="lp-outline-btn" style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '14px', width: isMobile ? '100%' : 'auto' }}>
          Çıkış Yap
        </button>
      </div>
    );
  }

  return (
    <>
      <Link href="/login" style={{ textDecoration: 'none', width: isMobile ? '100%' : 'auto' }}>
        <button className="lp-outline-btn" style={{ padding: isMobile ? '16px' : '8px 20px', borderRadius: isMobile ? '14px' : '10px', fontSize: isMobile ? '16px' : '14px', width: '100%' }}>
          Giriş Yap
        </button>
      </Link>
      <Link href="/chat" style={{ textDecoration: 'none', width: isMobile ? '100%' : 'auto' }}>
        <button className="lp-glow-btn" style={{ padding: isMobile ? '16px' : '8px 20px', borderRadius: isMobile ? '14px' : '10px', fontSize: isMobile ? '16px' : '14px', width: '100%' }}>
          <span>{isMobile ? '✦ Ücretsiz Başla' : 'Başla →'}</span>
        </button>
      </Link>
    </>
  );
}

/* ── Background ── */
function Background() {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }} />
        <div style={{
          position: 'absolute', top: '-250px', left: '50%', transform: 'translateX(-50%)',
          width: '900px', height: '600px',
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-150px', right: '-100px',
          width: '600px', height: '500px',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.10) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '30%', left: '-80px',
          width: '400px', height: '400px',
          background: 'radial-gradient(ellipse, rgba(6,182,212,0.08) 0%, transparent 65%)',
        }} />
      </div>
      <style>{`
        .lp-nav-link { color: rgba(160,160,200,0.6); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .lp-nav-link:hover { color: #a78bfa; }
        .lp-feature-card { transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1); cursor: default; }
        .lp-feature-card:hover { transform: translateY(-6px); border-color: rgba(124,58,237,0.35) !important; background: rgba(124,58,237,0.06) !important; box-shadow: 0 20px 50px rgba(124,58,237,0.1); }
        .lp-step-card { transition: all 0.3s ease; }
        .lp-step-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(124,58,237,0.12); }
        .lp-glow-btn { position: relative; overflow: hidden; background: linear-gradient(135deg, #7c3aed, #6366f1); border: none; color: white; font-weight: 700; cursor: pointer; transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        .lp-glow-btn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, #a78bfa, #6366f1); opacity: 0; transition: opacity 0.3s; }
        .lp-glow-btn:hover::after { opacity: 1; }
        .lp-glow-btn:hover { transform: translateY(-2px) scale(1.03); box-shadow: 0 16px 48px rgba(124,58,237,0.45); }
        .lp-outline-btn { background: transparent; border: 1px solid rgba(124,58,237,0.25); color: #a78bfa; font-weight: 600; cursor: pointer; transition: all 0.25s ease; }
        .lp-outline-btn:hover { background: rgba(124,58,237,0.1); border-color: rgba(124,58,237,0.45); transform: translateY(-1px); }
        .lp-mobile-toggle { display: none; }
        @media (max-width: 968px) {
          .lp-desktop-links, .lp-desktop-auth { display: none !important; }
          .lp-mobile-toggle { display: block !important; }
        }
        @media (max-width: 768px) {
          .lp-hero-section { text-align: center !important; flex-direction: column-reverse !important; padding-top: 80px !important; gap: 40px !important; min-height: auto !important; }
          .lp-hero-content { align-items: center !important; flex: 1 1 100% !important; max-width: 100% !important; }
          .lp-hero-badges { justify-content: center !important; }
          .lp-feature-grid { grid-template-columns: 1fr !important; }
          .lp-section-header { margin-bottom: 32px !important; }
          .lp-steps-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .lp-testimonial-grid { grid-template-columns: 1fr !important; }
          .lp-cta-box { padding: 40px 20px !important; }
          .lp-footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; text-align: center !important; }
          .lp-footer-logo { justify-content: center !important; }
          .lp-footer-social { justify-content: center !important; }
        }
      `}</style>
    </>
  );
}

/* ── Navbar ── */
function Navbar({ mounted }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 24px',
        background: (scrolled || mobileMenuOpen) ? 'rgba(6,6,24,0.92)' : 'transparent',
        backdropFilter: (scrolled || mobileMenuOpen) ? 'blur(24px)' : 'none',
        borderBottom: (scrolled || mobileMenuOpen) ? '1px solid rgba(124,58,237,0.08)' : 'none',
        transition: 'all 0.3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '64px',
        opacity: mounted ? 1 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', boxShadow: '0 0 16px rgba(124,58,237,0.4)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.3px' }}>
              LifeCoach <span style={{ background: 'linear-gradient(135deg,#a78bfa,#c4b5fd)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>AI</span>
            </div>
            <div style={{ fontSize: '8px', color: 'rgba(124,58,237,0.6)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '-1px' }}>DeepSeek Altyapısı</div>
          </div>
        </div>

        <div className="lp-desktop-links" style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <a href="#features" className="lp-nav-link">Özellikler</a>
          <a href="#how" className="lp-nav-link">Nasıl Çalışır</a>
          <a href="#testimonials" className="lp-nav-link">Yorumlar</a>
        </div>

        <div className="lp-desktop-auth" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <UserNav />
        </div>

        <button
          className="lp-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ display: 'none', background: 'transparent', border: 'none', color: '#a78bfa', fontSize: '24px', cursor: 'pointer', outline: 'none' }}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: 'rgba(6,6,24,0.98)', backdropFilter: 'blur(32px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '32px', padding: '40px',
        }}>
          <a href="#features" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '22px', fontWeight: 700, color: '#f0f0ff', textDecoration: 'none' }}>Özellikler</a>
          <a href="#how" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '22px', fontWeight: 700, color: '#f0f0ff', textDecoration: 'none' }}>Nasıl Çalışır</a>
          <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '22px', fontWeight: 700, color: '#f0f0ff', textDecoration: 'none' }}>Yorumlar</a>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '280px', marginTop: '20px' }}>
            <UserNav isMobile />
          </div>
        </div>
      )}
    </>
  );
}

/* ── Live Demo Chat Preview ── */
function LiveDemo() {
  const messages = [
    { role: 'user', text: 'Motivasyonum düştü, ne yapmalıyım?' },
    { role: 'ai', text: 'Anlıyorum. Şu 3 adımı dene:\n\n◆ 5 dakikalık micro-görev belirle\n◆ Beynine "küçük zafer" hissi ver\n◆ Ortamını değiştir' },
    { role: 'user', text: 'Teşekkürler! Çok işe yarıyor' },
    { role: 'ai', text: 'Harika! Yarın için bir hedef belirleyelim mi?' },
  ];

  const [visible, setVisible] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let idx = 0;
    const run = () => {
      if (idx >= messages.length) { idx = 0; setVisible(0); }
      if (messages[idx].role === 'ai') {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setVisible(v => v + 1);
          idx++;
          setTimeout(run, 1800);
        }, 1200);
      } else {
        setVisible(v => v + 1);
        idx++;
        setTimeout(run, 1800);
      }
    };
    const t = setTimeout(run, 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      background: 'rgba(10,10,30,0.85)', borderRadius: '20px',
      border: '1px solid rgba(124,58,237,0.15)',
      boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.06)',
      overflow: 'hidden', width: '100%', maxWidth: '460px',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '8px',
        borderBottom: '1px solid rgba(124,58,237,0.08)',
        background: 'rgba(18,18,45,0.6)',
      }}>
        {['#ef4444','#f59e0b','#10b981'].map(c => (
          <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.7 }} />
        ))}
        <span style={{ marginLeft: '8px', fontSize: '11px', color: 'rgba(160,160,200,0.4)', fontWeight: 500 }}>LifeCoach AI · DeepSeek</span>
        <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'rgba(16,185,129,0.6)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
          Çevrimiçi
        </span>
      </div>
      <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '280px' }}>
        {messages.slice(0, visible).map((m, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
            gap: '8px', alignItems: 'flex-start',
          }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0,
              background: m.role === 'user'
                ? 'linear-gradient(135deg,#06b6d4,#3b82f6)'
                : 'linear-gradient(135deg,#7c3aed,#6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
            }}>{m.role === 'user' ? '👤' : '⚡'}</div>
            <div style={{
              maxWidth: '78%',
              background: m.role === 'user' ? 'rgba(6,182,212,0.1)' : 'rgba(22,22,50,0.8)',
              border: `1px solid ${m.role === 'user' ? 'rgba(6,182,212,0.15)' : 'rgba(124,58,237,0.12)'}`,
              borderRadius: m.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
              padding: '10px 14px', fontSize: '13px', lineHeight: 1.6,
              color: m.role === 'user' ? '#e0f7ff' : '#d0d0f0',
              whiteSpace: 'pre-line',
            }}>{m.text}</div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{ width:'26px', height:'26px', borderRadius:'8px', background:'linear-gradient(135deg,#7c3aed,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px' }}>⚡</div>
            <div style={{ background:'rgba(22,22,50,0.8)', border:'1px solid rgba(124,58,237,0.12)', borderRadius:'4px 14px 14px 14px', padding:'10px 14px', display:'flex', gap:'4px', alignItems:'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#7c3aed' }} />)}
            </div>
          </div>
        )}
      </div>
      <div style={{
        padding: '10px 14px', borderTop: '1px solid rgba(124,58,237,0.08)',
        display: 'flex', gap: '8px', alignItems: 'center',
        background: 'rgba(10,10,30,0.6)',
      }}>
        <div style={{ flex: 1, background: 'rgba(22,22,50,0.6)', borderRadius: '10px', padding: '9px 14px', fontSize: '12px', color: 'rgba(160,160,200,0.3)' }}>
          HAN AI'ya bir şey sor...
        </div>
        <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'linear-gradient(135deg,#7c3aed,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', color:'white' }}>↑</div>
      </div>
    </div>
  );
}

/* ── Features Data ── */
const FEATURES = [
  { icon: '🧠', color: '#7c3aed', title: 'Derin Hafıza', desc: 'Her konuşmanı hatırlar, alışkanlıklarını öğrenir. Seni tanıyan tek AI.', tag: 'Akıllı' },
  { icon: '⚡', color: '#6366f1', title: 'Anlık Yanıt', desc: 'DeepSeek altyapısı ile milisaniyeler içinde derin analiz ve rehberlik.', tag: 'Hızlı' },
  { icon: '🎯', color: '#06b6d4', title: 'Hedef Takibi', desc: 'Hedeflerini planlar, ilerlemeyi izler ve seni doğru yolda tutar.', tag: 'Planlayıcı' },
  { icon: '🔐', color: '#10b981', title: 'Tam Güvenlik', desc: 'Verilerinin şifreli ve güvende olduğunu garanti ediyoruz.', tag: 'Güvenli' },
  { icon: '🌍', color: '#f59e0b', title: 'Çok Dilli', desc: 'Doğal dil işleme ile Türkçe ve dünya dillerinde tam destek.', tag: 'Global' },
  { icon: '🚀', color: '#ec4899', title: 'Kişiselleştirilmiş', desc: 'Senin tarzına, hedeflerine ve alışkanlıklarına özel AI deneyimi.', tag: 'Özel' },
];

/* ── Steps Data ── */
const STEPS = [
  { num: '01', icon: '✦', title: 'Ücretsiz Kayıt Ol', desc: 'Saniyeler içinde hesabını oluştur. Kredi kartı gerekmez.' },
  { num: '02', icon: '💬', title: 'Hedefini Anlat', desc: 'HAN AI seni dinler, sana özel bir yol haritası çizer.' },
  { num: '03', icon: '🚀', title: 'Büyü & Başar', desc: 'Her gün biraz daha iyi bir versiyonuna ulaş.' },
];

/* ── Testimonials ── */
const TESTIMONIALS = [
  { name: 'Ayşe K.', role: 'Girişimci', avatar: '👩‍💼', text: 'HAN AI ile 3 ayda startup\'ımı kurdum. Motivasyonumu hiç kaybetmedim. Gerçekten hayatımı değiştirdi!', stars: 5 },
  { name: 'Mehmet D.', role: 'Yazılım Mühendisi', avatar: '👨‍💻', text: 'Hedef belirleme konusunda çok zorlanıyordum. Artık her hafta net hedeflerim var ve hepsini gerçekleştiriyorum.', stars: 5 },
  { name: 'Zeynep A.', role: 'Öğrenci', avatar: '👩‍🎓', text: 'Sınav döneminde HAN AI\'nin motivasyon koçluğu olmasaydı başaramazdım. Mükemmel bir asistan!', stars: 5 },
  { name: 'Can B.', role: 'Sporcu', avatar: '🏃', text: 'Antrenman planımı optimize etti, beslenme önerileri sundu. Artık rekorlarımı kırıyorum!', stars: 5 },
  { name: 'Elif M.', role: 'Yönetici', avatar: '👩‍💼', text: 'Zaman yönetimi sorunum tamamen çözüldü. Verimlilik seviyem %200 arttı, ciddiyim!', stars: 5 },
  { name: 'Emre T.', role: 'Freelancer', avatar: '🧑‍🎨', text: 'Müşteri bulma, proje yönetimi, fiyatlandırma — her konuda bana yol gösterdi. Süper!', stars: 5 },
];

/* ── Main Page ── */
export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <main style={{ minHeight: '100vh', background: '#060618', color: '#f0f0ff', fontFamily: 'Inter, sans-serif', overflowX: 'hidden', position: 'relative' }}>
      <Background />
      <Navbar mounted={mounted} />

      {/* ── HERO ── */}
      <section className="lp-hero-section" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        padding: '100px 24px 60px', position: 'relative', zIndex: 1,
        maxWidth: '1200px', margin: '0 auto',
        gap: '60px', flexWrap: 'wrap', justifyContent: 'center',
      }}>
        <div className="lp-hero-content" style={{
          flex: '1 1 460px', maxWidth: '560px', opacity: mounted ? 1 : 0,
          transform: mounted ? 'none' : 'translateY(40px)', transition: 'all 0.8s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px', borderRadius: '100px',
            background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
            marginBottom: '28px', width: 'fit-content',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#a78bfa', letterSpacing: '0.5px' }}>
              DeepSeek Altyapısı · Çevrimiçi
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900,
            letterSpacing: '-2px', lineHeight: 1.05, marginBottom: '20px',
          }}>
            Hedeflerine{' '}
            <span style={{
              background: 'linear-gradient(135deg, #7c3aed, #a78bfa, #6366f1)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              10 Kat Daha Hızlı
            </span>{' '}
            Ulaş
          </h1>

          <p style={{
            fontSize: '17px', color: 'rgba(160,160,200,0.7)',
            lineHeight: 1.7, marginBottom: '36px', maxWidth: '500px',
          }}>
            Sana özel yapay zeka algoritmalarıyla hayatını planla, alışkanlıklarını yönet ve potansiyelini optimize et.
            <strong style={{ color: '#a78bfa', fontWeight: 600 }}> Ücretsiz başla.</strong>
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'inherit' }}>
            <Link href="/chat" style={{ textDecoration: 'none' }}>
              <button className="lp-glow-btn" style={{ padding: '16px 36px', borderRadius: '14px', fontSize: '16px' }}>
                <span>✦ Hemen Ücretsiz Dene</span>
              </button>
            </Link>
            <a href="#how" style={{ textDecoration: 'none' }}>
              <button className="lp-outline-btn" style={{ padding: '16px 36px', borderRadius: '14px', fontSize: '16px' }}>
                Farkı Keşfet ↓
              </button>
            </a>
          </div>

          <div className="lp-hero-badges" style={{ marginTop: '36px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span style={{ fontSize: '12px', color: 'rgba(160,160,200,0.5)' }}>4.9/5 Kullanıcı Memnuniyeti</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span style={{ fontSize: '12px', color: 'rgba(160,160,200,0.5)' }}>KVKK Uyumlu & Güvenli</span>
            </div>
          </div>
        </div>

        <div style={{
          flex: '1 1 380px', display: 'flex', justifyContent: 'center', alignItems: 'center',
          opacity: mounted ? 1 : 0, transition: 'opacity 1s ease 0.3s',
        }}>
          <LiveDemo />
        </div>
      </section>

      {/* ── DEEPSEEK TECH BANNER ── */}
      <section style={{
        padding: '48px 24px', position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(124,58,237,0.06)',
        borderBottom: '1px solid rgba(124,58,237,0.06)',
        background: 'linear-gradient(90deg, rgba(124,58,237,0.04), rgba(99,102,241,0.02))',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.1))',
              border: '1px solid rgba(124,58,237,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#d0d0ff', marginBottom: '2px' }}>
                🚀 Sınırlı Beta Erişimi — İlk 100 Kullanıcıya Özel
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(160,160,200,0.5)' }}>
                DeepSeek destekli yapay zeka asistanına erken erişim fırsatını kaçırma. Tüm özellikler ücretsiz.
              </div>
            </div>
          </div>
          <Link href="/chat" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <button className="lp-glow-btn" style={{ padding: '12px 28px', borderRadius: '12px', fontSize: '14px' }}>
              <span>✦ Hemen Katıl</span>
            </button>
          </Link>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: '100px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className="lp-section-header" style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '100px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)', fontSize: '12px', color: '#a78bfa', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.5px' }}>
              ✦ ÖZELLİKLER
            </div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '16px' }}>
              Neden HAN AI?
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(160,160,200,0.6)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
              Diğer AI'lardan farklı olarak gerçekten seni anlayan, büyüyen ve geliştiren bir koç.
            </p>
          </div>

          <div className="lp-feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="lp-feature-card" style={{
                padding: '28px 24px', borderRadius: '18px',
                background: 'rgba(12,12,36,0.6)',
                border: '1px solid rgba(124,58,237,0.08)',
                backdropFilter: 'blur(16px)',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: `radial-gradient(ellipse, ${f.color}15, transparent 70%)`, pointerEvents: 'none' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{
                    width: '46px', height: '46px', borderRadius: '12px',
                    background: `${f.color}12`, border: `1px solid ${f.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                  }}>{f.icon}</div>
                  <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px', color: f.color, background: `${f.color}10`, padding: '3px 10px', borderRadius: '100px', border: `1px solid ${f.color}20`, textTransform: 'uppercase' }}>{f.tag}</span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: '#e0e0ff' }}>{f.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(160,160,200,0.6)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ padding: '100px 24px', position: 'relative', zIndex: 1, background: 'rgba(8,8,24,0.5)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="lp-section-header" style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '100px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)', fontSize: '12px', color: '#a78bfa', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.5px' }}>
              ⚡ NASIL ÇALIŞIR
            </div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '16px' }}>
              3 Adımda Başarıya Ulaş
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(160,160,200,0.6)', maxWidth: '440px', margin: '0 auto', lineHeight: 1.7 }}>
              Saniyeler içinde başla, hayatın boyunca büyü.
            </p>
          </div>

          <div className="lp-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', position: 'relative' }}>
            {STEPS.map((s, i) => (
              <div key={i} className="lp-step-card" style={{
                padding: '32px 24px', borderRadius: '18px',
                background: 'rgba(12,12,36,0.6)', border: '1px solid rgba(124,58,237,0.08)',
                backdropFilter: 'blur(16px)', textAlign: 'center',
              }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.1))',
                  border: '1px solid rgba(124,58,237,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                  boxShadow: '0 4px 16px rgba(124,58,237,0.1)',
                }}>{s.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(124,58,237,0.5)', letterSpacing: '2px', marginBottom: '8px' }}>ADIM {s.num}</div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px', color: '#e0e0ff' }}>{s.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(160,160,200,0.55)', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" style={{ padding: '100px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className="lp-section-header" style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '100px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)', fontSize: '12px', color: '#a78bfa', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.5px' }}>
              💬 KULLANICI YORUMLARI
            </div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, letterSpacing: '-1.5px' }}>
              Hayatları Değiştirenler
            </h2>
          </div>

          <div className="lp-testimonial-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{
                padding: '24px', borderRadius: '18px',
                background: 'rgba(12,12,36,0.6)',
                border: '1px solid rgba(124,58,237,0.08)',
                backdropFilter: 'blur(16px)',
                transition: 'all 0.25s ease',
                display: 'flex', flexDirection: 'column',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)'; e.currentTarget.style.background = 'rgba(18,18,45,0.7)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.08)'; e.currentTarget.style.background = 'rgba(12,12,36,0.6)'; }}
              >
                <div style={{ display: 'flex', gap: '2px', marginBottom: '14px' }}>
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(200,200,230,0.75)', lineHeight: 1.65, marginBottom: '20px', flex: 1 }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid rgba(124,58,237,0.06)', paddingTop: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'linear-gradient(135deg,#7c3aed,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#e0e0ff' }}>{t.name}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(160,160,200,0.45)' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '100px 24px', position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '350px', background: 'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px', margin: '0 auto 24px',
              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 48px rgba(124,58,237,0.4), 0 0 96px rgba(99,102,241,0.2)',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>

            <h2 style={{ fontSize: 'clamp(30px,5vw,50px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '20px' }}>
              Hazır mısın?{' '}
              <span style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa,#6366f1)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                Şimdi Başla.
              </span>
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(160,160,200,0.6)', lineHeight: 1.7, marginBottom: '36px' }}>
              Sana özel yapay zeka yaşam koçunla tanışmaya hazır mısın?<br />
              Ücretsiz, kredi kartı gerektirmez.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/chat" style={{ textDecoration: 'none' }}>
                <button className="lp-glow-btn" style={{ padding: '18px 44px', borderRadius: '14px', fontSize: '17px' }}>
                  <span>✦ Hemen Başla — Ücretsiz</span>
                </button>
              </Link>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button className="lp-outline-btn" style={{ padding: '18px 28px', borderRadius: '14px', fontSize: '17px' }}>
                  Giriş Yap
                </button>
              </Link>
            </div>
            <p style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(160,160,200,0.3)' }}>
              Kredi kartı gerekmez · %100 ücretsiz · İstediğin zaman çık
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid rgba(124,58,237,0.06)',
        padding: '36px 24px',
        position: 'relative', zIndex: 1,
        background: 'rgba(6,6,18,0.8)',
      }}>
        <div className="lp-footer-grid" style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div className="lp-footer-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg,#7c3aed,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#d0d0f0' }}>LifeCoach AI</span>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(160,160,200,0.25)' }}>
            © 2026 LifeCoach AI · by <span style={{ color: 'rgba(124,58,237,0.5)' }}>Metehan Haydar Erbaş</span> · DeepSeek Altyapısı
          </div>
          <div className="lp-footer-social" style={{ display: 'flex', gap: '20px' }}>
            {['Gizlilik', 'Kullanım', 'İletişim'].map(link => (
              <span key={link} style={{ fontSize: '12px', color: 'rgba(160,160,200,0.3)', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#a78bfa'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(160,160,200,0.3)'}
              >{link}</span>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
