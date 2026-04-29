"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/* ── Animated Counter ── */
function Counter({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const step = target / (duration / 16);
        let cur = 0;
        const t = setInterval(() => {
          cur = Math.min(cur + step, target);
          setCount(Math.floor(cur));
          if (cur >= target) clearInterval(t);
        }, 16);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ── Floating Orbs Background ── */
function Background() {
  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }} />
        {/* Top center glow */}
        <div style={{
          position: 'absolute', top: '-300px', left: '50%', transform: 'translateX(-50%)',
          width: '1000px', height: '700px',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 65%)',
          animation: 'lp-pulse 8s ease-in-out infinite',
        }} />
        {/* Bottom right */}
        <div style={{
          position: 'absolute', bottom: '-200px', right: '-150px',
          width: '700px', height: '600px',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.14) 0%, transparent 65%)',
          animation: 'lp-pulse 10s ease-in-out 2s infinite',
        }} />
        {/* Bottom left */}
        <div style={{
          position: 'absolute', bottom: '20%', left: '-100px',
          width: '500px', height: '500px',
          background: 'radial-gradient(ellipse, rgba(6,182,212,0.10) 0%, transparent 65%)',
          animation: 'lp-pulse 12s ease-in-out 4s infinite',
        }} />
      </div>
      <style>{`
        @keyframes lp-pulse {
          0%,100% { transform: scale(1) translateX(-50%); opacity:0.8; }
          50% { transform: scale(1.15) translateX(-50%); opacity:1; }
        }
        @keyframes lp-float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
        }
        @keyframes lp-spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes lp-slide-up {
          from { opacity:0; transform:translateY(40px); }
          to { opacity:1; transform:translateY(0); }
        }
        @keyframes lp-fade {
          from { opacity:0; }
          to { opacity:1; }
        }
        @keyframes lp-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes lp-blink {
          0%,100% { opacity:1; }
          50% { opacity:0; }
        }
        @keyframes lp-bar {
          from { width: 0; }
          to { width: var(--w); }
        }
        @keyframes lp-msg-in {
          from { opacity:0; transform:translateX(-16px); }
          to { opacity:1; transform:translateX(0); }
        }
        @keyframes lp-msg-in-r {
          from { opacity:0; transform:translateX(16px); }
          to { opacity:1; transform:translateX(0); }
        }
        @keyframes lp-typing {
          0%,60%,100% { transform:translateY(0); opacity:0.4; }
          30% { transform:translateY(-5px); opacity:1; }
        }
        @keyframes lp-scroll-x {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .lp-nav-link {
          color: rgba(160,160,200,0.7);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: color 0.2s;
        }
        .lp-nav-link:hover { color: #a5b4fc; }
        .lp-feature-card {
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          cursor: default;
        }
        .lp-feature-card:hover {
          transform: translateY(-8px) scale(1.02);
          border-color: rgba(99,102,241,0.4) !important;
          background: rgba(99,102,241,0.1) !important;
          box-shadow: 0 24px 60px rgba(99,102,241,0.15);
        }
        .lp-step-card {
          transition: all 0.25s ease;
        }
        .lp-step-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 50px rgba(99,102,241,0.2);
        }
        .lp-testimonial {
          transition: all 0.25s ease;
        }
        .lp-testimonial:hover {
          transform: translateY(-4px);
          border-color: rgba(99,102,241,0.3) !important;
        }
        .lp-glow-btn {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none; color: white;
          font-weight: 700; cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .lp-glow-btn::after {
          content:'';
          position:absolute; inset:0;
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          opacity:0; transition: opacity 0.3s;
        }
        .lp-glow-btn:hover::after { opacity:1; }
        .lp-glow-btn:hover {
          transform: translateY(-3px) scale(1.04);
          box-shadow: 0 20px 60px rgba(99,102,241,0.55);
        }
        .lp-glow-btn span { position:relative; z-index:1; }
        .lp-outline-btn {
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(99,102,241,0.25);
          color: #a5b4fc; font-weight: 600; cursor: pointer;
          transition: all 0.2s ease;
        }
        .lp-outline-btn:hover {
          background: rgba(99,102,241,0.12);
          border-color: rgba(99,102,241,0.5);
          transform: translateY(-2px);
        }
      `}</style>
    </>
  );
}

/* ── Navbar ── */
function Navbar({ mounted }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 24px',
      background: scrolled ? 'rgba(3,3,8,0.85)' : 'transparent',
      backdropFilter: scrolled ? 'blur(24px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(99,102,241,0.1)' : 'none',
      transition: 'all 0.3s ease',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: '68px',
      opacity: mounted ? 1 : 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', boxShadow: '0 4px 20px rgba(99,102,241,0.45)',
        }}>⚡</div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>
            LifeCoach <span style={{ background: 'linear-gradient(135deg,#818cf8,#c4b5fd)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>AI</span>
          </div>
          <div style={{ fontSize: '9px', color: 'rgba(99,102,241,0.7)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '-2px' }}>HAN 4.2 Ultra Core</div>
        </div>
      </div>

      {/* Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        <a href="#features" className="lp-nav-link">Özellikler</a>
        <a href="#how" className="lp-nav-link">Nasıl Çalışır</a>
        <a href="#testimonials" className="lp-nav-link">Yorumlar</a>
      </div>

      {/* Auth */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Link href="/login" style={{ textDecoration: 'none' }}>
          <button className="lp-outline-btn" style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '14px' }}>
            Giriş Yap
          </button>
        </Link>
        <Link href="/chat" style={{ textDecoration: 'none' }}>
          <button className="lp-glow-btn" style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '14px' }}>
            <span>Başla →</span>
          </button>
        </Link>
      </div>
    </nav>
  );
}

/* ── Live Demo Chat Preview ── */
function LiveDemo() {
  const messages = [
    { role: 'user', text: 'Motivasyonum düştü, ne yapmalıyım? 😔' },
    { role: 'ai', text: 'Anlıyorum seni. Motivasyon dalgalanması tamamen **normal**. Şu 3 adımı dene:\n\n◆ 5 dakikalık micro-görev belirle\n◆ Beynine "küçük zafer" hissi ver\n◆ Ortamını değiştir' },
    { role: 'user', text: 'Teşekkürler! Çok işe yarıyor' },
    { role: 'ai', text: '🎯 Harika! Yarın için bir hedef belirleyelim mi?' },
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
      background: 'rgba(12,12,24,0.9)', borderRadius: '20px',
      border: '1px solid rgba(99,102,241,0.2)',
      boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)',
      overflow: 'hidden', width: '100%', maxWidth: '420px',
      backdropFilter: 'blur(20px)',
    }}>
      {/* Window bar */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px',
        borderBottom: '1px solid rgba(99,102,241,0.1)',
        background: 'rgba(22,22,42,0.6)',
      }}>
        {['#ef4444','#f59e0b','#10b981'].map(c => (
          <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.8 }} />
        ))}
        <span style={{ marginLeft: '8px', fontSize: '12px', color: 'rgba(160,160,200,0.5)', fontWeight: 500 }}>LifeCoach AI · HAN 4.2</span>
      </div>
      {/* Messages */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '260px' }}>
        {messages.slice(0, visible).map((m, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
            gap: '8px', alignItems: 'flex-start',
            animation: `${m.role === 'user' ? 'lp-msg-in-r' : 'lp-msg-in'} 0.4s ease both`,
          }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
              background: m.role === 'user'
                ? 'linear-gradient(135deg,#06b6d4,#3b82f6)'
                : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
            }}>{m.role === 'user' ? '👤' : '⚡'}</div>
            <div style={{
              maxWidth: '75%',
              background: m.role === 'user' ? 'rgba(6,182,212,0.15)' : 'rgba(22,22,42,0.8)',
              border: `1px solid ${m.role === 'user' ? 'rgba(6,182,212,0.2)' : 'rgba(99,102,241,0.15)'}`,
              borderRadius: m.role === 'user' ? '14px 3px 14px 14px' : '3px 14px 14px 14px',
              padding: '8px 12px', fontSize: '12px', lineHeight: 1.6,
              color: m.role === 'user' ? '#e0f7ff' : '#d0d0f0',
              whiteSpace: 'pre-line',
            }}>{m.text}</div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px' }}>⚡</div>
            <div style={{ background:'rgba(22,22,42,0.8)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:'3px 14px 14px 14px', padding:'10px 14px', display:'flex', gap:'4px', alignItems:'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#6366f1', animation:`lp-typing 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
      </div>
      {/* Input bar */}
      <div style={{
        padding: '10px 14px', borderTop: '1px solid rgba(99,102,241,0.1)',
        display: 'flex', gap: '8px', alignItems: 'center',
        background: 'rgba(12,12,24,0.6)',
      }}>
        <div style={{ flex: 1, background: 'rgba(22,22,42,0.6)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: 'rgba(160,160,200,0.4)' }}>
          Bir şey sor...
        </div>
        <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', color:'white' }}>↑</div>
      </div>
    </div>
  );
}

/* ── Features Data ── */
const FEATURES = [
  { icon: '🧠', color: '#6366f1', title: 'Derin Hafıza', desc: 'Her konuşmanı hatırlar, alışkanlıklarını öğrenir. Seni tanıyan tek AI.', tag: 'Akıllı' },
  { icon: '⚡', color: '#8b5cf6', title: 'Anlık Yanıt', desc: 'Gemini 2.0 Flash ile milisaniyeler içinde derin analiz ve rehberlik.', tag: 'Hızlı' },
  { icon: '🎯', color: '#06b6d4', title: 'Hedef Takibi', desc: 'Hedeflerini planlar, ilerlemeyi izler ve seni doğru yolda tutar.', tag: 'Planlayıcı' },
  { icon: '🔐', color: '#10b981', title: 'Tam Güvenlik', desc: 'Verilerinin şifreli ve güvende olduğunu garanti ediyoruz.', tag: 'Güvenli' },
  { icon: '🌍', color: '#f59e0b', title: 'Çok Dilli', desc: '81 dil desteğiyle dünyanın her yerinden erişilebilir.', tag: 'Global' },
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

/* ── STATS ── */
const STATS = [
  { value: 12000, suffix: '+', label: 'Aktif Kullanıcı' },
  { value: 850000, suffix: '+', label: 'Mesaj Gönderildi' },
  { value: 98, suffix: '%', label: 'Memnuniyet' },
  { value: 81, suffix: '', label: 'Dil Desteği' },
];

/* ── Main Page ── */
export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <main style={{ minHeight: '100vh', background: '#030308', color: '#f0f0ff', fontFamily: 'Inter, sans-serif', overflowX: 'hidden', position: 'relative' }}>
      <Background />
      <Navbar mounted={mounted} />

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        padding: '100px 24px 60px', position: 'relative', zIndex: 1,
        maxWidth: '1200px', margin: '0 auto',
        gap: '60px', flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {/* Left */}
        <div style={{ flex: '1 1 480px', maxWidth: '580px', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(40px)', transition: 'all 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px', borderRadius: '100px',
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
            marginBottom: '24px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'lp-blink 2s ease-in-out infinite' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#a5b4fc', letterSpacing: '0.5px' }}>
              Gemini 2.0 Flash · Aktif
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(38px, 6vw, 68px)', fontWeight: 900,
            letterSpacing: '-2px', lineHeight: 1.05, marginBottom: '24px',
          }}>
            Potansiyelini{' '}
            <span style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'lp-shimmer 4s linear infinite',
              display: 'block',
            }}>
              Sonsuza Taşı
            </span>
          </h1>

          <p style={{
            fontSize: '18px', color: 'rgba(160,160,200,0.75)',
            lineHeight: 1.75, marginBottom: '40px', maxWidth: '480px',
          }}>
            Seni anlayan, hedeflerini hatırlayan ve seninle birlikte büyüyen
            yeni nesil yapay zeka yaşam koçuyla tanış.
            <strong style={{ color: '#a5b4fc', fontWeight: 600 }}> Ücretsiz başla.</strong>
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/chat" style={{ textDecoration: 'none' }}>
              <button className="lp-glow-btn" style={{ padding: '16px 36px', borderRadius: '14px', fontSize: '16px' }}>
                <span>✦ Ücretsiz Başla</span>
              </button>
            </Link>
            <a href="#how" style={{ textDecoration: 'none' }}>
              <button className="lp-outline-btn" style={{ padding: '16px 36px', borderRadius: '14px', fontSize: '16px' }}>
                Nasıl Çalışır? ↓
              </button>
            </a>
          </div>

          {/* Trust */}
          <div style={{ marginTop: '36px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex' }}>
              {['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b'].map((c,i) => (
                <div key={i} style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: `linear-gradient(135deg, ${c}, ${c}aa)`,
                  border: '2px solid #030308',
                  marginLeft: i === 0 ? 0 : '-8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
                }}>{'👤'}</div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', gap: '2px' }}>{[1,2,3,4,5].map(i => <span key={i} style={{ color: '#f59e0b', fontSize: '12px' }}>★</span>)}</div>
              <p style={{ fontSize: '12px', color: 'rgba(160,160,200,0.6)', marginTop: '2px' }}>12,000+ kullanıcı tarafından güveniliyor</p>
            </div>
          </div>
        </div>

        {/* Right — Live Demo */}
        <div style={{
          flex: '1 1 360px', display: 'flex', justifyContent: 'center', alignItems: 'center',
          opacity: mounted ? 1 : 0, transition: 'opacity 1s ease 0.3s',
          animation: mounted ? 'lp-float 7s ease-in-out infinite' : 'none',
        }}>
          <LiveDemo />
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{
        padding: '60px 24px', position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(99,102,241,0.08)', borderBottom: '1px solid rgba(99,102,241,0.08)',
        background: 'rgba(10,10,20,0.5)',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 'clamp(36px,5vw,52px)', fontWeight: 900, lineHeight: 1,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                <Counter target={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(160,160,200,0.6)', marginTop: '6px', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: '100px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '100px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '12px', color: '#a5b4fc', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.5px' }}>
              ✦ ÖZELLİKLER
            </div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '16px' }}>
              Neden HAN AI?
            </h2>
            <p style={{ fontSize: '17px', color: 'rgba(160,160,200,0.65)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.7 }}>
              Diğer AI'lardan farklı olarak gerçekten seni anlayan, büyüyen ve geliştiren bir koç.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="lp-feature-card" style={{
                padding: '28px 26px', borderRadius: '20px',
                background: 'rgba(16,16,30,0.7)', border: '1px solid rgba(99,102,241,0.12)',
                backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden',
              }}>
                {/* Glow top */}
                <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: `radial-gradient(ellipse, ${f.color}20, transparent 70%)`, pointerEvents: 'none' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '14px',
                    background: `${f.color}18`, border: `1px solid ${f.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                  }}>{f.icon}</div>
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: f.color, background: `${f.color}15`, padding: '4px 10px', borderRadius: '100px', border: `1px solid ${f.color}25`, textTransform: 'uppercase' }}>{f.tag}</span>
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px', color: '#e8e8ff' }}>{f.title}</h3>
                <p style={{ fontSize: '13.5px', color: 'rgba(160,160,200,0.65)', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ padding: '100px 24px', position: 'relative', zIndex: 1, background: 'rgba(8,8,18,0.6)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '100px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '12px', color: '#a5b4fc', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.5px' }}>
              ⚡ NASIL ÇALIŞIR
            </div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '16px' }}>
              3 Adımda Başarıya Ulaş
            </h2>
            <p style={{ fontSize: '17px', color: 'rgba(160,160,200,0.65)', maxWidth: '460px', margin: '0 auto', lineHeight: 1.7 }}>
              Saniyeler içinde başla, hayatın boyunca büyü.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', position: 'relative' }}>
            {/* Connector line */}
            <div style={{ position: 'absolute', top: '48px', left: '16.6%', right: '16.6%', height: '1px', background: 'linear-gradient(90deg, rgba(99,102,241,0), rgba(99,102,241,0.3), rgba(99,102,241,0))', display: 'none' }} />
            {STEPS.map((s, i) => (
              <div key={i} className="lp-step-card" style={{
                padding: '32px 28px', borderRadius: '20px',
                background: 'rgba(16,16,30,0.8)', border: '1px solid rgba(99,102,241,0.12)',
                backdropFilter: 'blur(20px)', textAlign: 'center',
                transition: 'all 0.3s ease',
              }}>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '18px', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
                  border: '1px solid rgba(99,102,241,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px',
                  boxShadow: '0 8px 24px rgba(99,102,241,0.2)',
                }}>{s.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(99,102,241,0.6)', letterSpacing: '2px', marginBottom: '10px' }}>ADIM {s.num}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: '#e8e8ff' }}>{s.title}</h3>
                <p style={{ fontSize: '14px', color: 'rgba(160,160,200,0.6)', lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" style={{ padding: '100px 0', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '100px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '12px', color: '#a5b4fc', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.5px' }}>
              💬 KULLANICI YORUMLARI
            </div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, letterSpacing: '-1.5px' }}>
              Hayatları Değiştirenler
            </h2>
          </div>
        </div>

        {/* Scrolling marquee */}
        <div style={{ overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'flex', gap: '16px', animation: 'lp-scroll-x 30s linear infinite', width: 'max-content' }}>
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <div key={i} className="lp-testimonial" style={{
                width: '300px', flexShrink: 0, padding: '24px',
                borderRadius: '18px', background: 'rgba(16,16,30,0.8)',
                border: '1px solid rgba(99,102,241,0.12)',
                backdropFilter: 'blur(20px)',
              }}>
                <div style={{ display: 'flex', gap: '2px', marginBottom: '12px' }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ color: '#f59e0b', fontSize: '13px' }}>★</span>)}
                </div>
                <p style={{ fontSize: '13.5px', color: 'rgba(200,200,230,0.8)', lineHeight: 1.65, marginBottom: '16px', fontStyle: 'italic' }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ff' }}>{t.name}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(160,160,200,0.5)' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Fade edges */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '120px', height: '100%', background: 'linear-gradient(90deg, #030308, transparent)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '100%', background: 'linear-gradient(-90deg, #030308, transparent)', pointerEvents: 'none' }} />
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '100px 24px', position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Glow blob */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '22px', margin: '0 auto 28px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px',
              boxShadow: '0 0 60px rgba(99,102,241,0.5), 0 0 120px rgba(139,92,246,0.3)',
              animation: 'lp-float 6s ease-in-out infinite',
            }}>⚡</div>

            <h2 style={{ fontSize: 'clamp(32px,5vw,54px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '20px' }}>
              Hazır mısın?{' '}
              <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                Şimdi Başla.
              </span>
            </h2>
            <p style={{ fontSize: '17px', color: 'rgba(160,160,200,0.65)', lineHeight: 1.7, marginBottom: '40px' }}>
              12,000+ kullanıcı hayallerini gerçeğe dönüştürdü.<br />
              Sıra sende. Ücretsiz, kayıt gerektirmez.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/chat" style={{ textDecoration: 'none' }}>
                <button className="lp-glow-btn" style={{ padding: '18px 48px', borderRadius: '16px', fontSize: '17px' }}>
                  <span>✦ Hemen Başla — Ücretsiz</span>
                </button>
              </Link>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <button className="lp-outline-btn" style={{ padding: '18px 32px', borderRadius: '16px', fontSize: '17px' }}>
                  Giriş Yap
                </button>
              </Link>
            </div>
            <p style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(160,160,200,0.35)' }}>
              ✦ Kredi kartı gerekmez · %100 ücretsiz · İstediğin zaman çık
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid rgba(99,102,241,0.08)',
        padding: '40px 24px',
        position: 'relative', zIndex: 1,
        background: 'rgba(6,6,14,0.8)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>⚡</div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#d0d0f0' }}>LifeCoach AI</span>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(160,160,200,0.3)', textAlign: 'center' }}>
            © 2026 LifeCoach AI · by <span style={{ color: 'rgba(99,102,241,0.6)' }}>Metehan Haydar Erbaş</span> · HAN AI Tech
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            {['Gizlilik', 'Kullanım', 'İletişim'].map(link => (
              <span key={link} style={{ fontSize: '12px', color: 'rgba(160,160,200,0.35)', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(160,160,200,0.35)'}
              >{link}</span>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
