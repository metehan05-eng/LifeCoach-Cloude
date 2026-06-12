import { getKVData, setKVData } from './db.js';

const MEMORY_CATEGORIES = {
  goal: { label: 'Hedef', keywords: ['hedef', 'istemek', 'olmak', 'yapmak', 'başarmak'] },
  health: { label: 'Sağlık', keywords: ['sağlık', 'kilo', 'spor', 'egzersiz', 'diyet', 'uyku', 'stres'] },
  career: { label: 'Kariyer', keywords: ['kariyer', 'iş', 'meslek', 'terfi', 'iş görüşmesi', 'cv'] },
  finance: { label: 'Finans', keywords: ['para', 'yatırım', 'bütçe', 'maaş', 'tasarruf', 'borç'] },
  education: { label: 'Eğitim', keywords: ['eğitim', 'okul', 'ders', 'üniversite', 'sertifika', 'kurs'] },
  social: { label: 'Sosyal', keywords: ['arkadaş', 'aile', 'ilişki', 'sosyal', 'çevre'] },
  idea: { label: 'Fikir', keywords: ['fikir', 'proje', 'icat', 'inovasyon'] },
  habit: { label: 'Alışkanlık', keywords: ['alışkanlık', 'rutin', 'her gün', 'düzenli'] },
  preference: { label: 'Tercih', keywords: ['sevmek', 'sevmemek', 'tercih', 'hoşlanmak'] },
};

function detectCategory(text) {
  const lower = text.toLowerCase();
  let bestCategory = 'general';
  let bestScore = 0;

  for (const [cat, info] of Object.entries(MEMORY_CATEGORIES)) {
    const score = info.keywords.reduce((acc, kw) => {
      return acc + (lower.includes(kw) ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }
  return bestCategory;
}

function detectImportance(text) {
  const urgentWords = ['acil', 'çok önemli', 'kritik', 'hemen', 'mutlaka'];
  const importantWords = ['önemli', 'lazım', 'gerekli', 'istemek'];
  const lower = text.toLowerCase();

  let score = 5;
  for (const w of urgentWords) {
    if (lower.includes(w)) score += 2;
  }
  for (const w of importantWords) {
    if (lower.includes(w)) score += 1;
  }
  return Math.min(10, score);
}

export async function saveMemory(userId, text, options = {}) {
  const {
    category = detectCategory(text),
    importance = detectImportance(text),
    source = 'chat',
    tags = [],
    metadata = {},
  } = options;

  const key = `life_memory:${userId}`;
  const memories = await getKVData(key);
  if (!Array.isArray(memories)) memories.data = [];

  const memory = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    category,
    content: text,
    importance,
    tags: [...new Set([category, ...tags])],
    source,
    metadata: { ...metadata, savedAt: new Date().toISOString() },
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  memories.data.push(memory);
  await setKVData(key, memories);

  return memory;
}

export async function getMemories(userId, options = {}) {
  const {
    category = null,
    limit = 50,
    includeInactive = false,
    search = null,
    daysBack = null,
  } = options;

  const key = `life_memory:${userId}`;
  const stored = await getKVData(key);
  let memories = stored?.data || [];

  if (!includeInactive) {
    memories = memories.filter(m => m.isActive !== false);
  }
  if (category) {
    memories = memories.filter(m => m.category === category);
  }
  if (daysBack) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    memories = memories.filter(m => new Date(m.createdAt) >= cutoff);
  }
  if (search) {
    const q = search.toLowerCase();
    memories = memories.filter(m => m.content.toLowerCase().includes(q));
  }

  return memories.sort((a, b) => b.importance - a.importance).slice(0, limit);
}

export async function getRelevantMemories(userId, context, limit = 5) {
  const allMemories = await getMemories(userId, { limit: 100 });
  const contextLower = context.toLowerCase();

  const scored = allMemories.map(m => {
    let score = 0;
    const contentLower = m.content.toLowerCase();
    const contextWords = contextLower.split(/\s+/).filter(w => w.length > 3);

    for (const word of contextWords) {
      if (contentLower.includes(word)) score += 2;
    }

    if (m.tags.some(t => contextLower.includes(t))) score += 3;
    score += m.importance * 0.5;

    return { ...m, score };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function getMemorySummary(userId) {
  const memories = await getMemories(userId, { limit: 200 });
  const categories = {};

  for (const m of memories) {
    const cat = m.category || 'general';
    if (!categories[cat]) {
      categories[cat] = { count: 0, items: [], avgImportance: 0 };
    }
    categories[cat].count++;
    categories[cat].items.push(m.content);
    categories[cat].avgImportance += m.importance;
  }

  for (const cat of Object.keys(categories)) {
    const c = categories[cat];
    c.avgImportance = Math.round(c.avgImportance / c.count);
  }

  return {
    totalMemories: memories.length,
    categories,
    recentMemories: memories.slice(0, 5),
  };
}
