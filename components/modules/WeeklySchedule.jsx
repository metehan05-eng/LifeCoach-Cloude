"use client";
import { useState } from "react";
/**
 * WeeklySchedule – Haftalık Zaman Bloklama Takvimi
 */

const typeColors = {
  deep_work: { bg: "rgba(138,43,226,0.15)", border: "#8a2be2", label: "Derin Çalışma" },
  break: { bg: "rgba(16,185,129,0.15)", border: "#10b981", label: "Mola" },
  project: { bg: "rgba(99,102,241,0.15)", border: "#6366f1", label: "Proje" },
  learning: { bg: "rgba(245,158,11,0.15)", border: "#f59e0b", label: "Öğrenme" },
  planning: { bg: "rgba(6,182,212,0.15)", border: "#06b6d4", label: "Planlama" },
  default: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", label: "Diğer" },
};

export default function WeeklySchedule({ schedule = [], routines = [], tips = [] }) {
  const [activeDay, setActiveDay] = useState(0);

  const currentDaySchedule = schedule[activeDay] || { day: "Pazartesi", blocks: [] };

  return (
    <div className="weekly-schedule">
      {/* Gün Sekmeler */}
      <div className="weekly-tabs">
        {schedule.map((day, i) => (
          <button
            key={i}
            className={`weekly-tab ${activeDay === i ? "weekly-tab-active" : ""}`}
            onClick={() => setActiveDay(i)}
          >
            {day.day?.substring(0, 3)}
          </button>
        ))}
      </div>

      {/* Zaman Blokları */}
      <div className="weekly-blocks">
        <div className="weekly-day-title">{currentDaySchedule.day}</div>
        {currentDaySchedule.blocks?.map((block, i) => {
          const cfg = typeColors[block.type] || typeColors.default;
          return (
            <div
              key={i}
              className="weekly-block"
              style={{
                background: cfg.bg,
                borderLeft: `3px solid ${cfg.border}`,
                animationDelay: `${i * 0.05}s`,
              }}
            >
              <div className="weekly-block-time">
                {block.start} – {block.end}
              </div>
              <div className="weekly-block-info">
                <span className="weekly-block-task">{block.task}</span>
                <span className="weekly-block-type" style={{ color: cfg.border }}>
                  {cfg.label}
                </span>
              </div>
            </div>
          );
        })}
        {currentDaySchedule.blocks?.length === 0 && (
          <p className="weekly-empty">Bu gün için blok tanımlanmadı</p>
        )}
      </div>

      {/* Rutinler */}
      {routines.length > 0 && (
        <div className="weekly-routines">
          <h4 className="weekly-routines-title">📅 Günlük Rutinler</h4>
          <div className="weekly-routine-grid">
            {routines.map((r, i) => (
              <div key={i} className="weekly-routine-item">
                <span className="weekly-routine-icon">{r.icon || "⏰"}</span>
                <div>
                  <div className="weekly-routine-name">{r.title}</div>
                  <div className="weekly-routine-time">{r.time}</div>
                  <div className="weekly-routine-desc">{r.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* İpuçları */}
      {tips.length > 0 && (
        <div className="weekly-tips">
          <h4 className="weekly-tips-title">💡 HAN'ın İpuçları</h4>
          {tips.map((tip, i) => (
            <div key={i} className="weekly-tip-item">
              <span className="weekly-tip-dot" />
              {tip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
