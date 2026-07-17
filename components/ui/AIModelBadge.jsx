"use client";

const MODELS = [
  { id: "qwen", label: "Qwen 3.7", icon: "🧠" },
];

export default function AIModelBadge({ model = "qwen", onChange }) {
  const active = MODELS.find((m) => m.id === model) || MODELS[0];

  return (
    <div className="flex items-center gap-2">
      {onChange ? (
        <select
          value={model}
          onChange={(e) => onChange(e.target.value)}
          className="bg-white/[0.03] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/70 focus:border-violet-500/50 outline-none"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id} className="bg-[#0d0e15]">
              {m.icon} {m.label}
            </option>
          ))}
        </select>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-600/15 border border-violet-500/25 text-[9px] font-semibold text-violet-300">
          {active.icon} {active.label}
        </span>
      )}
    </div>
  );
}
