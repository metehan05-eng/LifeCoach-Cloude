"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { IconBolt } from "./icons";

function UserNav({ isMobile }) {
  const { data: session } = useSession();

  if (session) {
    return (
      <div className={`flex items-center gap-3 ${isMobile ? "w-full flex-col" : ""}`}>
        <div className="flex items-center gap-2">
          {session.user.image ? (
            <img
              src={session.user.image}
              alt=""
              className="h-8 w-8 rounded-full border-2 border-han-purple/50"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-han-purple text-sm font-bold">
              {session.user.name?.[0] || "U"}
            </div>
          )}
          {!isMobile && (
            <span className="text-sm font-semibold text-han-text">{session.user.name}</span>
          )}
        </div>
        <Link href="/chat" className={isMobile ? "w-full" : ""}>
          <button className="lp-btn-primary w-full px-5 py-2 text-sm">Panele Git</button>
        </Link>
        <button
          onClick={() => signOut()}
          className={`lp-btn-ghost px-5 py-2 text-sm ${isMobile ? "w-full" : ""}`}
        >
          Çıkış Yap
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${isMobile ? "w-full flex-col" : ""}`}>
      <Link href="/login" className={isMobile ? "w-full" : ""}>
        <button className={`lp-btn-ghost w-full px-5 py-2 text-sm ${isMobile ? "py-4" : ""}`}>
          Giriş Yap
        </button>
      </Link>
      <Link href="/chat" className={isMobile ? "w-full" : ""}>
        <button className={`lp-btn-primary w-full px-5 py-2 text-sm ${isMobile ? "py-4" : ""}`}>
          {isMobile ? "Ücretsiz Başla" : "Başla →"}
        </button>
      </Link>
    </div>
  );
}

export default function Navbar({ mounted }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const navBg = scrolled || mobileOpen
    ? "border-b border-white/[0.06] bg-[#060618]/90 backdrop-blur-xl"
    : "bg-transparent";

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between px-6 transition-all duration-300 ${navBg}`}
        style={{ opacity: mounted ? 1 : 0 }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-han-purple to-han-indigo shadow-[0_0_16px_rgba(124,58,237,0.35)]">
            <IconBolt className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-tight text-han-text">
              LifeCoach <span className="text-violet-300">AI</span>
            </div>
            <div className="text-[8px] font-semibold uppercase tracking-widest text-han-purple/60">
              DeepSeek Altyapısı
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-7 md:flex">
          <a href="#features" className="lp-nav-link">Özellikler</a>
          <a href="#how" className="lp-nav-link">Nasıl Çalışır</a>
          <a href="#testimonials" className="lp-nav-link">Yorumlar</a>
        </div>

        <div className="hidden md:block">
          <UserNav />
        </div>

        <button
          type="button"
          className="text-xl text-violet-300 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menü"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-[#060618]/98 px-8 backdrop-blur-xl md:hidden">
          {["#features", "#how", "#testimonials"].map((href, i) => (
            <a
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="text-xl font-bold text-han-text no-underline"
            >
              {["Özellikler", "Nasıl Çalışır", "Yorumlar"][i]}
            </a>
          ))}
          <div className="mt-4 w-full max-w-xs">
            <UserNav isMobile />
          </div>
        </div>
      )}
    </>
  );
}
