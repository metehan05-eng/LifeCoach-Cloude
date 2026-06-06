import Link from "next/link";
import ProductMockup from "./ProductMockup";
import { IconShield, IconStar } from "./icons";

export default function HeroSection({ mounted }) {
  return (
    <section className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col-reverse items-center gap-12 px-6 pb-16 pt-28 md:flex-row md:gap-16 md:pb-24 md:pt-32">
      <div
        className="flex max-w-xl flex-1 flex-col transition-all duration-700 md:text-left"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "none" : "translateY(24px)",
        }}
      >
        <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-han-purple/20 bg-han-purple/[0.08] px-3.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold tracking-wide text-violet-300">
            DeepSeek Altyapısı · Çevrimiçi
          </span>
        </div>

        <h1 className="font-display mb-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-han-text sm:text-5xl lg:text-[3.5rem]">
          Hedeflerine{" "}
          <span className="bg-gradient-to-r from-han-purple via-violet-300 to-han-indigo bg-clip-text text-transparent">
            10 Kat Daha Hızlı
          </span>{" "}
          Ulaş
        </h1>

        <p className="mb-8 max-w-lg text-base leading-relaxed text-han-muted md:text-[17px]">
          Sana özel yapay zeka algoritmalarıyla hayatını planla, alışkanlıklarını yönet ve potansiyelini optimize et.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link href="/chat">
            <button className="lp-btn-primary px-8 py-4 text-base">
              Hemen Ücretsiz Dene
            </button>
          </Link>
          <a href="#how">
            <button className="lp-btn-ghost px-8 py-4 text-base">
              Farkı Keşfet ↓
            </button>
          </a>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 text-xs text-han-muted">
            <IconStar className="h-4 w-4 text-han-gold" />
            4.9/5 Kullanıcı Memnuniyeti
          </div>
          <div className="flex items-center gap-2 text-xs text-han-muted">
            <IconShield className="h-4 w-4 text-emerald-400" />
            KVKK Uyumlu & Güvenli
          </div>
        </div>
      </div>

      <div
        className="flex flex-1 justify-center transition-opacity duration-700 md:justify-end"
        style={{ opacity: mounted ? 1 : 0, transitionDelay: "0.15s" }}
      >
        <ProductMockup />
      </div>
    </section>
  );
}
