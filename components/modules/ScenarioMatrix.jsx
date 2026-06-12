"use client";
/**
 * ScenarioMatrix – 3/6/12 Aylık Senaryo Matrisi + Risk Tablosu
 */

const riskColors = {
  critical: { bg: "rgba(239,68,68,0.12)", border: "#ef4444", dot: "#ef4444", label: "Kritik" },
  high: { bg: "rgba(245,158,11,0.12)", border: "#f59e0b", dot: "#f59e0b", label: "Yüksek" },
  medium: { bg: "rgba(99,102,241,0.12)", border: "#6366f1", dot: "#6366f1", label: "Orta" },
  low: { bg: "rgba(16,185,129,0.12)", border: "#10b981", dot: "#10b981", label: "Düşük" },
};

export default function ScenarioMatrix({ timelineScenarios = {}, riskMatrix = [], optionALabel = "Seçenek A", optionBLabel = "Seçenek B" }) {
  const timelines = [
    { key: "threeMonth", label: "3 Ay", icon: "🌱" },
    { key: "sixMonth", label: "6 Ay", icon: "🌿" },
    { key: "twelveMonth", label: "12 Ay", icon: "🌳" },
  ];

  return (
    <div className="scenario-wrapper">
      {/* Senaryo Matrisi */}
      {Object.keys(timelineScenarios).length > 0 && (
        <div className="scenario-matrix">
          <h4 className="scenario-matrix-title">📅 Zaman Senaryoları</h4>
          <div className="scenario-table">
            {/* Header */}
            <div className="scenario-row scenario-header-row">
              <div className="scenario-cell scenario-time-cell">Zaman</div>
              <div className="scenario-cell scenario-option-cell">{optionALabel}</div>
              <div className="scenario-cell scenario-option-cell">{optionBLabel}</div>
            </div>
            {/* Rows */}
            {timelines.map(({ key, label, icon }) => {
              const row = timelineScenarios[key];
              if (!row) return null;
              return (
                <div key={key} className="scenario-row" style={{ animationDelay: `${timelines.indexOf({ key, label, icon }) * 0.1}s` }}>
                  <div className="scenario-cell scenario-time-cell">
                    <span className="scenario-icon">{icon}</span>
                    {label}
                  </div>
                  <div className="scenario-cell scenario-desc-cell scenario-a-cell">
                    {row.optionA || row.a || "—"}
                  </div>
                  <div className="scenario-cell scenario-desc-cell scenario-b-cell">
                    {row.optionB || row.b || "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Risk Matrisi */}
      {riskMatrix.length > 0 && (
        <div className="risk-matrix">
          <h4 className="risk-matrix-title">⚠️ Risk Analizi</h4>
          <div className="risk-list">
            {riskMatrix.map((risk, i) => {
              const cfg = riskColors[risk.level] || riskColors.medium;
              return (
                <div
                  key={i}
                  className="risk-item"
                  style={{ background: cfg.bg, borderLeft: `3px solid ${cfg.border}` }}
                >
                  <div className="risk-item-top">
                    <span className="risk-dot" style={{ background: cfg.dot }} />
                    <span className="risk-name">{risk.risk}</span>
                    <span className="risk-level-badge" style={{ color: cfg.dot, borderColor: cfg.border }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="risk-meta">
                    <span className="risk-prob">Olasılık: <strong>{risk.probability}</strong></span>
                    <span className="risk-impact">Etki: <strong>{risk.impact}</strong></span>
                  </div>
                  <div className="risk-mitigation">
                    <span className="risk-mit-icon">🛡️</span>
                    {risk.mitigation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
