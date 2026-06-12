"use client";
import { useState } from "react";
/**
 * MicroStepList – Mikro Adım Checkbox Listesi + XP Animasyonu
 */
export default function MicroStepList({ steps = [], targetId, onStepComplete, disabled = false }) {
  const [xpPopup, setXpPopup] = useState(null); // { xp, stepIndex }
  const [localSteps, setLocalSteps] = useState(steps);

  const handleCheck = async (step, index) => {
    if (disabled) return;
    const newCompleted = !step.completed;

    // Optimistic UI
    const updated = localSteps.map((s, i) =>
      i === index ? { ...s, completed: newCompleted } : s
    );
    setLocalSteps(updated);

    // XP Animasyonu
    if (newCompleted) {
      setXpPopup({ xp: step.xpReward || 25, stepIndex: index });
      setTimeout(() => setXpPopup(null), 1500);
    }

    // Backend güncelleme
    try {
      if (onStepComplete) {
        await onStepComplete(step.id, newCompleted, step.xpReward);
      }
    } catch (err) {
      // Rollback
      setLocalSteps(steps);
      console.error("Adım güncellenemedi:", err);
    }
  };

  const completedCount = localSteps.filter((s) => s.completed).length;
  const totalXp = localSteps.reduce((sum, s) => sum + (s.xpReward || 25), 0);
  const earnedXp = localSteps.filter((s) => s.completed).reduce((sum, s) => sum + (s.xpReward || 25), 0);

  return (
    <div className="micro-step-list">
      {/* Özet */}
      <div className="micro-step-summary">
        <span className="micro-step-count">{completedCount}/{localSteps.length} Tamamlandı</span>
        <span className="micro-step-xp">⚡ {earnedXp}/{totalXp} XP</span>
      </div>

      {/* Adımlar */}
      <div className="micro-step-items">
        {localSteps.map((step, index) => (
          <div
            key={step.id || index}
            className={`micro-step-item ${step.completed ? "micro-step-done" : ""}`}
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            {/* Checkbox */}
            <button
              className={`micro-step-checkbox ${step.completed ? "micro-step-checked" : ""}`}
              onClick={() => handleCheck(step, index)}
              disabled={disabled}
              aria-label={step.completed ? "Tamamlandı" : "Tamamla"}
            >
              {step.completed && (
                <svg viewBox="0 0 12 10" fill="none">
                  <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            {/* Metin */}
            <div className="micro-step-text-area">
              <span className={`micro-step-text ${step.completed ? "micro-step-text-done" : ""}`}>
                {step.text}
              </span>
              {step.estimatedMinutes && (
                <span className="micro-step-time">⏱ {step.estimatedMinutes} dk</span>
              )}
            </div>

            {/* XP Rozeti */}
            <span className="micro-step-xp-badge">+{step.xpReward || 25} XP</span>

            {/* XP Pop-up Animasyonu */}
            {xpPopup?.stepIndex === index && (
              <div className="micro-step-xp-popup">+{xpPopup.xp} XP ⚡</div>
            )}
          </div>
        ))}
      </div>

      {/* Tümü tamamlandıysa kutlama */}
      {completedCount === localSteps.length && localSteps.length > 0 && (
        <div className="micro-step-complete-banner">
          🎉 Tüm adımları tamamladın! +100 Bonus XP kazandın!
        </div>
      )}
    </div>
  );
}
