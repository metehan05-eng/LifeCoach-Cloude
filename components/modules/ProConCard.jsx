"use client";
/**
 * ProConCard – Artı/Eksi Analiz Kartları
 */
export default function ProConCard({ proConAnalysis = {}, recommendation = "", recommendedOption = "" }) {
  const { optionA, optionB } = proConAnalysis;
  if (!optionA && !optionB) return null;

  return (
    <div className="procon-wrapper">
      {/* Kartlar */}
      <div className="procon-grid">
        {[optionA, optionB].filter(Boolean).map((opt, idx) => {
          const key = idx === 0 ? "A" : "B";
          const isRecommended = recommendedOption === key;
          return (
            <div
              key={key}
              className={`procon-card ${isRecommended ? "procon-card-recommended" : ""}`}
            >
              {isRecommended && (
                <div className="procon-recommended-badge">⭐ HAN Önerisi</div>
              )}
              <div className="procon-card-header">
                <span className="procon-option-label">Seçenek {key}</span>
                <h4 className="procon-option-title">{opt.label}</h4>
                <div className="procon-score-ring">
                  <svg viewBox="0 0 36 36" className="procon-score-svg">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={isRecommended ? "#8a2be2" : "#6366f1"}
                      strokeWidth="3"
                      strokeDasharray={`${opt.totalScore || 0}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="procon-score-text">{opt.totalScore || 0}</span>
                </div>
              </div>

              {/* Artılar */}
              <div className="procon-section">
                <div className="procon-section-label procon-pros-label">✅ Artılar</div>
                {(opt.pros || []).map((p, i) => (
                  <div key={i} className="procon-item procon-pro">
                    <div className="procon-item-bar-track">
                      <div
                        className="procon-item-bar procon-pro-bar"
                        style={{ width: `${(p.weight / 10) * 100}%` }}
                      />
                    </div>
                    <span className="procon-item-text">{p.text}</span>
                    <span className="procon-item-weight">{p.weight}/10</span>
                  </div>
                ))}
              </div>

              {/* Eksiler */}
              <div className="procon-section">
                <div className="procon-section-label procon-cons-label">❌ Eksiler</div>
                {(opt.cons || []).map((c, i) => (
                  <div key={i} className="procon-item procon-con">
                    <div className="procon-item-bar-track">
                      <div
                        className="procon-item-bar procon-con-bar"
                        style={{ width: `${(c.weight / 10) * 100}%` }}
                      />
                    </div>
                    <span className="procon-item-text">{c.text}</span>
                    <span className="procon-item-weight">{c.weight}/10</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Risk Tablosu */}
    </div>
  );
}
