import { IconUserPlus, IconMessage, IconTrending } from "./icons";

const STEPS = [
  {
    num: "01",
    icon: IconUserPlus,
    title: "Ücretsiz Kayıt Ol",
    desc: "Saniyeler içinde hesabını oluştur. Kredi kartı gerekmez.",
  },
  {
    num: "02",
    icon: IconMessage,
    title: "Hedefini Anlat",
    desc: "HAN AI seni dinler, sana özel bir yol haritası çizer.",
  },
  {
    num: "03",
    icon: IconTrending,
    title: "Büyü & Başar",
    desc: "Her gün biraz daha iyi bir versiyonuna ulaş.",
  },
];

export default function StepsSection() {
  return (
    <section id="how" className="relative z-10 bg-white/[0.01] px-6 py-24 md:py-28">
      <div className="mx-auto max-w-4xl">
        <div className="mb-14 text-center">
          <span className="mb-4 inline-block rounded-full border border-han-purple/20 bg-han-purple/[0.08] px-3.5 py-1 text-xs font-semibold tracking-wide text-violet-300">
            NASIL ÇALIŞIR
          </span>
          <h2 className="font-display mb-4 text-3xl font-extrabold tracking-tight text-han-text md:text-4xl">
            3 Adımda Başarıya Ulaş
          </h2>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-han-muted md:text-base">
            Saniyeler içinde başla, hayatın boyunca büyü.
          </p>
        </div>

        <div className="relative grid gap-6 md:grid-cols-3 md:gap-5">
          <div className="absolute left-[16.67%] right-[16.67%] top-12 hidden h-px bg-gradient-to-r from-transparent via-han-purple/20 to-transparent md:block" />

          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.num}
                className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-8 text-center backdrop-blur-sm"
              >
                <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-han-purple/20 bg-han-purple/10 text-violet-300">
                  <Icon className="h-6 w-6" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-han-purple text-[9px] font-bold text-white">
                    {s.num.slice(1)}
                  </span>
                </div>
                <div className="mb-2 text-[10px] font-bold tracking-[0.2em] text-han-purple/50">
                  ADIM {s.num}
                </div>
                <h3 className="mb-2 text-base font-bold text-han-text">{s.title}</h3>
                <p className="text-[13px] leading-relaxed text-han-muted">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
