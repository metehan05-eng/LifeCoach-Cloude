import { getKVData, setKVData } from './db.js';
import { getMemories } from './life-memory.js';

const SCORE_WEIGHTS = {
  health: { keywords: ['spor', 'egzersiz', 'sağlıklı', 'diyet', 'uyku', 'yürüyüş', 'koşu', 'meditasyon'] },
  career: { keywords: ['iş', 'kariyer', 'proje', 'terfi', 'maaş', 'çalışmak', 'profesyonel'] },
  finance: { keywords: ['para', 'yatırım', 'bütçe', 'tasarruf', 'gelir', 'birikim', 'borsa'] },
  education: { keywords: ['ders', 'kitap', 'öğrenmek', 'kurs', 'sertifika', 'okul', 'çalışma'] },
  social: { keywords: ['arkadaş', 'aile', 'etkinlik', 'topluluk', 'iletişim', 'yardım'] },
};

function calculateAreaScore(memories, area) {
  const areaMemories = memories.filter(m => m.category === area);
  if (areaMemories.length === 0) return 50;

  const weights = SCORE_WEIGHTS[area];
  let positiveScore = 50;
  let count = 0;

  for (const mem of areaMemories) {
    const content = mem.content.toLowerCase();
    const hasPositive = weights.keywords.some(kw => content.includes(kw));
    const hasNegative = content.includes('zorlan') || content.includes('yapamıyor') ||
      content.includes('problem') || content.includes('kötü') || content.includes('başarısız');

    if (hasPositive && !hasNegative) positiveScore += 5;
    else if (hasNegative) positiveScore -= 5;
    else positiveScore += 2;

    if (mem.importance > 7) positiveScore += mem.importance > 8 ? 3 : 1;
    count++;
  }

  return Math.max(0, Math.min(100, Math.round(positiveScore / Math.max(1, count))));
}

export async function calculateLifeScore(userId) {
  const memories = await getMemories(userId, { limit: 500 });

  const health = calculateAreaScore(memories, 'health');
  const career = calculateAreaScore(memories, 'career');
  const finance = calculateAreaScore(memories, 'finance');
  const education = calculateAreaScore(memories, 'education');
  const social = calculateAreaScore(memories, 'social');
  const overall = Math.round((health + career + finance + education + social) / 5);

  const key = `life_score_history:${userId}`;
  const history = await getKVData(key);
  if (!Array.isArray(history)) history.data = [];

  const entry = {
    id: `ls_${Date.now()}`,
    health, career, finance, education, social, overall,
    recordedAt: new Date().toISOString(),
  };

  history.data.push(entry);
  await setKVData(key, history);

  return entry;
}

export async function getLatestLifeScore(userId) {
  const key = `life_score_history:${userId}`;
  const history = await getKVData(key);
  const scores = history?.data || [];
  return scores.length > 0 ? scores[scores.length - 1] : null;
}

export async function getLifeScoreHistory(userId, days = 30) {
  const key = `life_score_history:${userId}`;
  const history = await getKVData(key);
  const scores = history?.data || [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return scores.filter(s => new Date(s.recordedAt) >= cutoff);
}

export async function getLifeScoreTrend(userId) {
  const history = await getLifeScoreHistory(userId, 30);
  if (history.length < 2) return null;

  const latest = history[history.length - 1];
  const oldest = history[0];

  const trends = {};
  const areas = ['health', 'career', 'finance', 'education', 'social'];

  for (const area of areas) {
    const diff = latest[area] - oldest[area];
    trends[area] = {
      current: latest[area],
      change: diff,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
      label: diff > 0 ? 'yükseldi' : diff < 0 ? 'düştü' : 'sabit',
    };
  }

  let lowestArea = areas.reduce((a, b) => latest[a] < latest[b] ? a : b);
  let highestArea = areas.reduce((a, b) => latest[a] > latest[b] ? a : b);

  const areaLabels = {
    health: 'Sağlık', career: 'Kariyer', finance: 'Finans',
    education: 'Eğitim', social: 'Sosyal Hayat',
  };

  return {
    latest,
    trends,
    lowestArea: { name: areaLabels[lowestArea], score: latest[lowestArea], key: lowestArea },
    highestArea: { name: areaLabels[highestArea], score: latest[highestArea], key: highestArea },
    droppingAreas: areas.filter(a => trends[a].direction === 'down').map(a => ({
      name: areaLabels[a], change: trends[a].change, key: a,
    })),
  };
}
