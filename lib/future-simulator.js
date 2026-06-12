import { getKVData, setKVData } from './db.js';
import { getMemories } from './life-memory.js';
import { getLatestLifeScore } from './life-score.js';

const SIMULATION_AREAS = {
  education: {
    label: 'Eğitim',
    metrics: ['seviye', 'çalışma saati', 'pratik', 'kelime dağarcığı'],
    improvementRate: 0.15,
  },
  career: {
    label: 'Kariyer',
    metrics: ['deneyim', 'beceri', 'network', 'başvuru sayısı'],
    improvementRate: 0.12,
  },
  finance: {
    label: 'Finans',
    metrics: ['gelir', 'tasarruf', 'yatırım', 'borç'],
    improvementRate: 0.10,
  },
  health: {
    label: 'Sağlık',
    metrics: ['kilo', 'egzersiz', 'beslenme', 'uyku'],
    improvementRate: 0.18,
  },
  social: {
    label: 'Sosyal Hayat',
    metrics: ['etkinlik', 'bağlantı', 'iletişim'],
    improvementRate: 0.12,
  },
};

function detectArea(text) {
  const lower = text.toLowerCase();
  const areaScores = {};

  for (const [area, info] of Object.entries(SIMULATION_AREAS)) {
    areaScores[area] = 0;
    for (const metric of info.metrics) {
      if (lower.includes(metric)) areaScores[area]++;
    }
  }

  const keywords = {
    education: ['ders', 'öğren', 'çalış', 'kitap', 'okul', 'sertifika', 'diploma', 'ingilizce', 'yabancı dil'],
    career: ['iş', 'kariyer', 'terfi', 'maaş', 'işe gir'],
    finance: ['para', 'yatırım', 'tasarruf', 'borsa', 'kripto', 'birikim'],
    health: ['kilo', 'spor', 'sağlık', 'diyet', 'egzersiz', 'form'],
    social: ['arkadaş', 'sosyal', 'çevre', 'tanış'],
  };

  for (const [area, kws] of Object.entries(keywords)) {
    for (const kw of kws) {
      if (lower.includes(kw)) areaScores[area] = (areaScores[area] || 0) + 2;
    }
  }

  let bestArea = 'education';
  let bestScore = 0;
  for (const [area, score] of Object.entries(areaScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestArea = area;
    }
  }

  return bestArea;
}

function parseDuration(text) {
  const durationPatterns = [
    { regex: /(\d+)\s*(ay|months?)/i, unit: 'months' },
    { regex: /(\d+)\s*(yıl|years?)/i, unit: 'years', multiplier: 12 },
    { regex: /(\d+)\s*(hafta|weeks?)/i, unit: 'weeks', multiplier: 0.23 },
    { regex: /(\d+)\s*(gün|days?)/i, unit: 'days', multiplier: 0.033 },
  ];

  for (const pattern of durationPatterns) {
    const match = text.match(pattern.regex);
    if (match) {
      const value = parseInt(match[1]);
      const months = pattern.multiplier ? value * pattern.multiplier : value;
      return Math.max(1, Math.round(months));
    }
  }

  return 3;
}

export async function simulateFuture(userId, scenario) {
  const area = detectArea(scenario);
  const months = parseDuration(scenario);
  const lifeScore = await getLatestLifeScore(userId);
  const memories = await getMemories(userId, { limit: 100 });

  const areaMemories = memories.filter(m => m.category === area);
  const currentScore = lifeScore?.[area] || 50;
  const areaInfo = SIMULATION_AREAS[area];

  const consistencyScore = Math.min(100, areaMemories.length * 10 + 20);
  const improvementFactor = areaInfo.improvementRate * (consistencyScore / 100);
  const predictedScore = Math.min(100, Math.round(currentScore + (improvementFactor * months * 10)));

  const milestones = [];
  for (let m = 1; m <= months; m++) {
    const monthScore = Math.min(100, Math.round(currentScore + (improvementFactor * m * 10)));
    let description = '';

    if (area === 'education') {
      description = m <= 2 ? 'Temel kavramlar öğreniliyor' :
        m <= 4 ? 'Orta seviye bilgi ediniliyor' :
        'İleri seviyeye geçiş başlıyor';
    } else if (area === 'health') {
      description = m <= 2 ? 'İlk değişimler gözlemleniyor' :
        m <= 4 ? 'Düzenli alışkanlıklar oturuyor' :
        'Hedefe yaklaşılıyor';
    } else if (area === 'career') {
      description = m <= 2 ? 'Yeni beceriler gelişiyor' :
        m <= 4 ? 'Profesyonel ağ genişliyor' :
        'Kariyer fırsatları artıyor';
    } else if (area === 'finance') {
      description = m <= 2 ? 'Bütçe düzeni oturuyor' :
        m <= 4 ? 'Birikim artışı başlıyor' :
        'Yatırım getirileri görülmeye başlıyor';
    } else if (area === 'social') {
      description = m <= 2 ? 'Yeni bağlantılar kuruluyor' :
        m <= 4 ? 'Sosyal çevre genişliyor' :
        'Anlamlı ilişkiler derinleşiyor';
    }

    milestones.push({
      month: m,
      expectedScore: monthScore,
      description,
    });
  }

  const prediction = `${months} ay boyunca düzenli çalışma ile ${areaInfo.label} skorun ${currentScore}'den ${predictedScore}'e yükselebilir. Bu süreçte ${milestones[0].description} ile başlayıp, ${milestones[milestones.length - 1].description} aşamasına ulaşabilirsin.`;

  const simulation = {
    id: `sim_${Date.now()}`,
    scenario,
    area,
    currentState: {
      score: currentScore,
      consistencyScore,
      totalMemories: areaMemories.length,
      lastUpdated: lifeScore?.recordedAt || null,
    },
    prediction,
    confidence: Math.min(90, Math.round(consistencyScore * 0.8 + 10)),
    milestones,
    months,
    createdAt: new Date().toISOString(),
  };

  const key = `future_simulations:${userId}`;
  const stored = await getKVData(key);
  if (!Array.isArray(stored)) stored.data = [];
  stored.data.push(simulation);
  await setKVData(key, stored);

  return simulation;
}

export async function getSimulations(userId, limit = 10) {
  const key = `future_simulations:${userId}`;
  const stored = await getKVData(key);
  const sims = stored?.data || [];
  return sims.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
}
