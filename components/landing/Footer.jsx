import { IconBolt } from "./icons";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06] bg-[#060618]/80 px-6 py-9">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-5 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-han-purple to-han-indigo">
            <IconBolt className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-white/80">LifeCoach AI</span>
        </div>

        <p className="text-center text-xs text-white/25">
          © 2026 LifeCoach AI · by{" "}
          <span className="text-han-purple/50">Metehan Haydar Erbaş</span>
          {" · "}DeepSeek Altyapısı
        </p>

        <div className="flex gap-5">
          {["Gizlilik", "Kullanım", "İletişim"].map((link) => (
            <span
              key={link}
              className="cursor-pointer text-xs text-white/30 transition-colors hover:text-violet-300"
            >
              {link}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
