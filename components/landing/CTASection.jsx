import Link from "next/link";
import { LCLogo } from "@/components/brand";

export default function CTASection() {
  return (
    <section className="relative z-10 px-6 py-24 text-center md:py-28">
      <div className="relative mx-auto max-w-xl">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-han-purple/10 blur-3xl" />

        <div className="relative">
          <div className="mx-auto mb-6">
            <LCLogo variant="chat" size={72} />
          </div>

          <h2 className="font-display mb-4 text-3xl font-extrabold tracking-tight text-han-text md:text-5xl">
            Hazır mısın?{" "}
            <span className="bg-gradient-to-r from-han-purple via-violet-300 to-han-indigo bg-clip-text text-transparent">
              Şimdi Başla.
            </span>
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-han-muted md:text-base">
            Sana özel yapay zeka yaşam koçunla tanışmaya hazır mısın?
            <br />
            Ücretsiz, kredi kartı gerektirmez.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/chat">
              <button className="lp-btn-primary px-10 py-4 text-base">
                Hemen Başla — Ücretsiz
              </button>
            </Link>
            <Link href="/login">
              <button className="lp-btn-ghost px-8 py-4 text-base">
                Giriş Yap
              </button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/25">
            Kredi kartı gerekmez · %100 ücretsiz · İstediğin zaman çık
          </p>
        </div>
      </div>
    </section>
  );
}
