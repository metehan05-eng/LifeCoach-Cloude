import { getKVData, setKVData } from './db.js';

export async function saveToSecondBrain(userId, entry) {
  const {
    type = 'note',
    title,
    content,
    category = null,
    tags = [],
    source = 'chat',
    sourceUrl = null,
    filePath = null,
  } = entry;

  const key = `second_brain:${userId}`;
  const stored = await getKVData(key);
  if (!Array.isArray(stored)) stored.data = [];

  const newEntry = {
    id: `sb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    title: title || content.slice(0, 80),
    content,
    summary: null,
    category,
    tags: [...new Set(tags)],
    source,
    sourceUrl,
    filePath,
    isArchived: false,
    isFavorite: false,
    aiAnalysis: null,
    metadata: { savedAt: new Date().toISOString() },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  stored.data.push(newEntry);
  await setKVData(key, stored);

  return newEntry;
}

export async function searchSecondBrain(userId, query, options = {}) {
  const {
    type = null,
    category = null,
    limit = 20,
    includeArchived = false,
  } = options;

  const key = `second_brain:${userId}`;
  const stored = await getKVData(key);
  let entries = stored?.data || [];

  if (!includeArchived) {
    entries = entries.filter(e => !e.isArchived);
  }
  if (type) {
    entries = entries.filter(e => e.type === type);
  }
  if (category) {
    entries = entries.filter(e => e.category === category);
  }

  if (query) {
    const q = query.toLowerCase();
    entries = entries.filter(e =>
      e.title?.toLowerCase().includes(q) ||
      e.content?.toLowerCase().includes(q) ||
      e.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  return entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
}

export async function getSecondBrainEntry(userId, entryId) {
  const key = `second_brain:${userId}`;
  const stored = await getKVData(key);
  const entries = stored?.data || [];
  return entries.find(e => e.id === entryId) || null;
}

export async function updateSecondBrainEntry(userId, entryId, updates) {
  const key = `second_brain:${userId}`;
  const stored = await getKVData(key);
  const entries = stored?.data || [];
  const index = entries.findIndex(e => e.id === entryId);

  if (index === -1) return null;

  entries[index] = {
    ...entries[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await setKVData(key, stored);
  return entries[index];
}

export async function deleteSecondBrainEntry(userId, entryId) {
  const key = `second_brain:${userId}`;
  const stored = await getKVData(key);
  if (!stored?.data) return false;

  stored.data = stored.data.filter(e => e.id !== entryId);
  await setKVData(key, stored);
  return true;
}

export async function getSecondBrainCategories(userId) {
  const key = `second_brain:${userId}`;
  const stored = await getKVData(key);
  const entries = stored?.data || [];

  const categories = {};
  for (const e of entries) {
    const cat = e.category || 'diğer';
    if (!categories[cat]) {
      categories[cat] = { count: 0, types: new Set() };
    }
    categories[cat].count++;
    categories[cat].types.add(e.type);
  }

  return Object.entries(categories).map(([name, data]) => ({
    name,
    count: data.count,
    types: [...data.types],
  }));
}

export async function generateSecondBrainSummary(userId) {
  const key = `second_brain:${userId}`;
  const stored = await getKVData(key);
  const entries = stored?.data || [];

  const typeCounts = {};
  let totalEntries = entries.length;
  let favoriteCount = entries.filter(e => e.isFavorite).length;
  let recentEntries = entries.slice(-5).reverse();

  for (const e of entries) {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
  }

  return {
    totalEntries,
    favoriteCount,
    typeDistribution: typeCounts,
    recentEntries: recentEntries.map(e => ({
      id: e.id,
      title: e.title,
      type: e.type,
      category: e.category,
      createdAt: e.createdAt,
    })),
  };
}
