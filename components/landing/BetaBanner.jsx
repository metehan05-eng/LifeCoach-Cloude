import Link from "next/link";

export default function BetaBanner() {
  return (
    <section className="relative z-10 border-y border-white/[0.06] bg-gradient-to-r from-han-purple/[0.04] to-han-indigo/[0.02] px-6 py-10">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-start gap-4 text-center sm:text-left">
          <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-han-purple/20 bg-han-purple/10 sm:mx-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <div>
            <p className="mb-1 text-sm font-bold text-han-text">
              Sınırlı Beta Erişimi — İlk 100 Kullanıcıya Özel Fırsatlar
            </p>
            <p className="text-xs leading-relaxed text-han-muted">
              DeepSeek destekli derin öğrenme motoru ile kişiselleştirilmiş koçluk.
              Tüm premium özellikler beta süresince ücretsiz.
            </p>
          </div>
        </div>
        <Link href="/chat" className="shrink-0">
          <button className="lp-btn-primary whitespace-nowrap px-7 py-3 text-sm">
            Hemen Katıl
          </button>
        </Link>
      </div>
    </section>
  );
}
