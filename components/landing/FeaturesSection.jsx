import {
  IconBrain,
  IconZap,
  IconTarget,
  IconShield,
  IconGlobe,
  IconSparkles,
} from "./icons";

const FEATURES = [
  {
    icon: IconBrain,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/15",
    title: "Derin Hafıza",
    desc: "Her konuşmanı hatırlar, alışkanlıklarını öğrenir. Seni tanıyan tek AI.",
    tag: "Akıllı",
  },
  {
    icon: IconZap,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/15",
    title: "Anlık Yanıt",
    desc: "DeepSeek altyapısı ile milisaniyeler içinde derin analiz ve rehberlik.",
    tag: "Hızlı",
  },
  {
    icon: IconTarget,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/15",
    title: "Hedef Takibi",
    desc: "Hedeflerini planlar, ilerlemeyi izler ve seni doğru yolda tutar.",
    tag: "Planlayıcı",
  },
  {
    icon: IconShield,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/15",
    title: "Tam Güvenlik",
    desc: "Verilerinin şifreli ve güvende olduğunu garanti ediyoruz.",
    tag: "Güvenli",
  },
  {
    icon: IconGlobe,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/15",
    title: "Çok Dilli",
    desc: "Doğal dil işleme ile Türkçe ve dünya dillerinde tam destek.",
    tag: "Global",
  },
  {
    icon: IconSparkles,
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/15",
    title: "Kişiselleştirilmiş",
    desc: "Senin tarzına, hedeflerine ve alışkanlıklarına özel AI deneyimi.",
    tag: "Özel",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 px-6 py-24 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <span className="mb-4 inline-block rounded-full border border-han-purple/20 bg-han-purple/[0.08] px-3.5 py-1 text-xs font-semibold tracking-wide text-violet-300">
            ÖZELLİKLER
          </span>
          <h2 className="font-display mb-4 text-3xl font-extrabold tracking-tight text-han-text md:text-4xl">
            Neden HAN AI?
          </h2>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-han-muted md:text-base">
            Diğer AI&apos;lardan farklı olarak gerçekten seni anlayan, büyüyen ve geliştiren bir koç.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-colors duration-200 hover:border-han-purple/20 hover:bg-white/[0.04]"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${f.bg} ${f.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${f.bg} ${f.color}`}>
                    {f.tag}
                  </span>
                </div>
                <h3 className="mb-1.5 text-[15px] font-bold text-han-text">{f.title}</h3>
                <p className="text-[13px] leading-relaxed text-han-muted">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
