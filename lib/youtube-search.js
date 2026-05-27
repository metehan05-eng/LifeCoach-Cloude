const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export function isYouTubeUrl(input) {
  return /youtube\.com|youtu\.be/.test(input || '');
}

export function detectYouTubeVideoIntent(message) {
  if (!message || typeof message !== 'string') return false;
  if (isYouTubeUrl(message)) return false;

  const msgLower = message.toLowerCase().trim();
  const patterns = [
    /\byoutube\b/i,
    /\bvideo\s*(öner|oner|bul|ara|izle|göster|goster|at|paylaş|paylas|var\s*mı|varmi)/i,
    /\b(öner|oner|bul|ara|göster|goster).{0,35}\bvideo/i,
    /\bvideo.{0,35}\b(öner|oner|bul|ara|göster|goster)/i,
    /\bhakkında.{0,50}\bvideo/i,
    /\bvideo.{0,50}\bhakkında/i,
    /\bhangi\s+video/i,
    /\bvideo\s+istiyorum/i,
    /\bvideo\s+ara/i,
    /\biçin\s+video/i,
    /\bicin\s+video/i,
    /\bkonu(an)?\s+.*video/i,
    /\bwatch\b.*\bvideo/i,
    /\brecommend\b.*\bvideo/i,
    /\bsuggest\b.*\bvideo/i,
    /\böğrenmek\s+için\b.*\bvideo/i,
    /\banlat(an)?\b.*\bvideo/i,
    /\bvideolar?\s+öner/i,
  ];

  return patterns.some((pattern) => pattern.test(msgLower));
}

export function extractYouTubeSearchQuery(message, fallback = 'motivasyon') {
  if (!message || typeof message !== 'string') return fallback;

  let query = message.trim();
  const stripPatterns = [
    /youtube('?(da|de|u)?)?/gi,
    /video\s*(öner(ileri|isi|ir\s*mi)?|oner(ileri|isi|ir\s*mi)?|bul|ara|izle|göster|goster|at|paylaş|paylas|var\s*mı|varmi)/gi,
    /(bana|ban|lütfen|please|bir|bi|şu|su|bu)\s+/gi,
    /(öner|oner|bul|ara|göster|goster|istiyorum|izlemek\s+istiyorum|aram|ara\s*rmısın|arar\s*mısın)/gi,
    /(hakkında|hakkinda|konusunda|ile\s+ilgili|about|regarding|on|for)\s+(bir\s+)?/gi,
    /(için|icin)\s+(bir\s+)?video/gi,
    /(var\s*mı|varmi|misin|mısın|mı|mi)/gi,
    /[?!.]+$/g,
  ];

  for (const pattern of stripPatterns) {
    query = query.replace(pattern, ' ').trim();
  }
  query = query.replace(/\s+/g, ' ').trim();

  if (query.length < 3) {
    const captures = [
      message.match(/(?:hakkında|hakkinda|konusunda|about)\s+(.+?)(?:\s+(?:video|youtube|için|icin)|[?!.]|$)/i),
      message.match(/(.+?)\s+(?:hakkında|hakkinda|konusunda).{0,24}(?:video|youtube)/i),
      message.match(/(?:video|youtube).{0,24}(?:hakkında|hakkinda|konusunda|about)\s+(.+?)(?:[?!.]|$)/i),
      message.match(/(?:öner|oner|bul|ara).{0,20}(?:video|youtube).{0,20}(.+?)(?:[?!.]|$)/i),
      message.match(/(?:şu|su|bu)\s+konu\s+(.+?)(?:[?!.]|$)/i),
    ];
    for (const match of captures) {
      if (match?.[1] && match[1].trim().length >= 3) {
        query = match[1].trim();
        break;
      }
    }
  }

  if (query.length < 3) {
    query = message.replace(/[?!.]/g, '').trim().slice(0, 100);
  }

  return query.slice(0, 120);
}

function formatDuration(isoDuration) {
  if (!isoDuration) return null;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = match[1] ? `${match[1]}:` : '';
  const minutes = (match[2] || '0').padStart(hours ? 2 : 1, '0');
  const seconds = (match[3] || '0').padStart(2, '0');
  return `${hours}${minutes}:${seconds}`;
}

export async function searchYouTubeVideos(query, maxResults = 3, options = {}) {
  if (!YOUTUBE_API_KEY) {
    console.warn('[YouTube] YOUTUBE_API_KEY tanımlı değil.');
    return null;
  }

  const language = options.language || 'tr';
  const searchQuery = (query || '').trim();
  if (!searchQuery) return null;

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${Math.min(maxResults, 10)}&q=${encodeURIComponent(searchQuery)}&relevanceLanguage=${language}&safeSearch=moderate&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl, { headers: { Referer: 'https://lifecoach.ai/' } });
    if (!searchRes.ok) {
      console.error('[YouTube] Search API error:', searchRes.status, await searchRes.text());
      return null;
    }

    const searchData = await searchRes.json();
    if (!searchData.items?.length) return null;

    const videoIds = searchData.items.map((item) => item.id.videoId).filter(Boolean);
    let statsMap = {};

    if (videoIds.length > 0) {
      const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`;
      const statsRes = await fetch(statsUrl, { headers: { Referer: 'https://lifecoach.ai/' } });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        statsMap = Object.fromEntries(
          (statsData.items || []).map((item) => [item.id, item])
        );
      }
    }

    return searchData.items.map((item) => {
      const stats = statsMap[item.id.videoId];
      return {
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        description: (item.snippet.description || '').slice(0, 180),
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails?.high?.url
          || item.snippet.thumbnails?.medium?.url
          || item.snippet.thumbnails?.default?.url
          || '',
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        viewCount: stats?.statistics?.viewCount ? Number(stats.statistics.viewCount) : null,
        duration: formatDuration(stats?.contentDetails?.duration),
      };
    });
  } catch (err) {
    console.error('[YouTube] Error:', err);
    return null;
  }
}

export async function getYouTubeSuggestionsForMessage(message, options = {}) {
  if (!detectYouTubeVideoIntent(message)) {
    return { suggestions: null, searchQuery: null, triggered: false };
  }

  const searchQuery = extractYouTubeSearchQuery(message, options.fallback || 'kişisel gelişim');
  const maxResults = options.maxResults || 3;
  const suggestions = await searchYouTubeVideos(searchQuery, maxResults, options);

  return {
    suggestions,
    searchQuery,
    triggered: true,
  };
}
