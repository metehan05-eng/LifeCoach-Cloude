"use client";
import { useState, useRef, useCallback, useEffect } from "react";

export default function DraggableSlider({ min = 1, max = 10, value, onChange, label }) {
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const ratio = (value - min) / (max - min);
  const percent = Math.round(ratio * 100);

  const getValueFromClientX = useCallback((clientX) => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const raw = min + (x / rect.width) * (max - min);
    return Math.round(raw);
  }, [min, max, value]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    const val = getValueFromClientX(e.clientX);
    if (onChange) onChange(String(val));
  }, [getValueFromClientX, onChange]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e) => {
      const val = getValueFromClientX(e.clientX);
      if (onChange) onChange(String(val));
    };
    const handleUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, getValueFromClientX, onChange]);

  return (
    <div>
      {label && (
        <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 block mb-1.5">{label}</label>
      )}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        className={`relative w-full h-7 rounded-full cursor-pointer select-none ${
          isDragging ? "cursor-grabbing" : "cursor-pointer"
        }`}
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all"
          style={{
            width: `${percent}%`,
            background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-violet-400 bg-[#1a1a2e] shadow-lg shadow-violet-500/30 transition-transform hover:scale-110 active:scale-95"
          style={{
            left: `calc(${percent}% - 12px)`,
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/70 select-none pointer-events-none"
          style={{
            left: `${percent}%`,
            transform: `translate(-50%, -50%)`,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
