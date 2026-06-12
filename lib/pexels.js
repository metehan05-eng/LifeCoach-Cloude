const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_BASE_URL = 'https://api.pexels.com/v1';

const TOPIC_KEYWORDS = {
  motivation: ['motivation', 'success', 'achievement', 'goal', 'inspiration', 'mountain', 'sunrise', 'winner', 'motivasyon', 'başarı', 'hedef', 'ilham'],
  health: ['fitness', 'workout', 'running', 'healthy food', 'yoga', 'meditation', 'gym', 'sport', 'sağlık', 'spor', 'egzersiz', 'kilo', 'diyet', 'yürüyüş'],
  career: ['office', 'business', 'meeting', 'presentation', 'laptop', 'professional', 'career', 'success', 'kariyer', 'iş', 'meslek', 'terfi', 'maaş'],
  finance: ['money', 'finance', 'investment', 'saving', 'bank', 'economy', 'business chart', 'growth', 'para', 'yatırım', 'bütçe', 'finans', 'borsa', 'birikim'],
  education: ['library', 'study', 'books', 'student', 'learning', 'university', 'reading', 'knowledge', 'eğitim', 'ders', 'kitap', 'okul', 'üniversite', 'öğrenmek', 'ingilizce', 'sertifika', 'kurs'],
  startup: ['startup', 'innovation', 'technology', 'coding', 'laptop', 'creative', 'brainstorming', 'office', 'girişim', 'inovasyon', 'şirket', 'firma'],
  technology: ['technology', 'coding', 'computer', 'ai', 'digital', 'future', 'robot', 'data', 'teknoloji', 'yazılım', 'kod', 'bilgisayar', 'yapay zeka'],
  nature: ['nature', 'forest', 'sea', 'landscape', 'beach', 'mountain', 'tree', 'sky', 'doğa', 'orman', 'deniz', 'manzara'],
  travel: ['travel', 'adventure', 'explore', 'vacation', 'journey', 'airplane', 'map', 'seyahat', 'gezi', 'tatil'],
  food: ['food', 'cooking', 'healthy', 'kitchen', 'nutrition', 'meal prep', 'vegetables', 'yemek', 'sağlıklı beslenme', 'tarif'],
  productivity: ['productivity', 'focus', 'time management', 'clock', 'planning', 'organization', 'desk', 'üretkenlik', 'zaman yönetimi', 'planlama', 'odak'],
  meditation: ['meditation', 'mindfulness', 'peace', 'calm', 'zen', 'relaxation', 'spiritual', 'meditasyon', 'huzur', 'sakin', 'stres'],
  social: ['friends', 'community', 'together', 'team', 'group', 'connection', 'people', 'arkadaş', 'aile', 'sosyal', 'topluluk'],
};

function detectTopics(text) {
  const lower = text.toLowerCase();
  const topics = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (score > 0) {
      topics.push({ topic, score });
    }
  }

  topics.sort((a, b) => b.score - a.score);
  return topics.slice(0, 2).map(t => t.topic);
}

function extractSearchQuery(text, topic) {
  const lower = text.toLowerCase();

  const specificKeywords = TOPIC_KEYWORDS[topic] || [];
  for (const kw of specificKeywords) {
    if (lower.includes(kw)) return kw;
  }

  const categoryDefaults = {
    motivation: 'inspiration success',
    health: 'healthy lifestyle',
    career: 'professional business',
    finance: 'finance investment',
    education: 'learning education',
    startup: 'startup innovation',
    technology: 'modern technology',
    nature: 'nature landscape',
    productivity: 'productivity focus',
    meditation: 'meditation peace',
    social: 'people community',
  };

  return categoryDefaults[topic] || 'inspiration';
}

export async function searchPexelsImages(query, options = {}) {
  const { perPage = 1, orientation = null, size = null } = options;

  if (!PEXELS_API_KEY) {
    return { success: false, error: 'PEXELS_API_KEY yapılandırılmamış' };
  }

  try {
    const params = new URLSearchParams({
      query: query,
      per_page: Math.min(perPage, 5),
    });
    if (orientation) params.append('orientation', orientation);
    if (size) params.append('size', size);

    const response = await fetch(`${PEXELS_BASE_URL}/search?${params}`, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Pexels] API error: ${response.status} - ${errorText}`);
      return { success: false, error: `Pexels API hatası: ${response.status}` };
    }

    const data = await response.json();
    const photos = (data.photos || []).map(photo => ({
      id: photo.id,
      width: photo.width,
      height: photo.height,
      url: photo.url,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      src: {
        original: photo.src.original,
        large: photo.src.large,
        medium: photo.src.medium,
        small: photo.src.small,
        tiny: photo.src.tiny,
      },
      alt: photo.alt || query,
    }));

    return { success: true, photos, totalResults: data.total_results };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'Pexels isteği zaman aşımına uğradı' };
    }
    console.error('[Pexels] Search error:', err.message);
    return { success: false, error: err.message };
  }
}

export async function getImagesForText(text, maxImages = 2) {
  const topics = detectTopics(text);
  if (topics.length === 0) return { success: true, images: [] };

  const imagePromises = topics.slice(0, maxImages).map(async (topic) => {
    const query = extractSearchQuery(text, topic);
    const result = await searchPexelsImages(query, { perPage: 1, orientation: 'landscape' });
    if (result.success && result.photos.length > 0) {
      return { ...result.photos[0], topic, searchQuery: query };
    }
    return null;
  });

  const images = (await Promise.all(imagePromises)).filter(Boolean);
  return { success: true, images, topics };
}
