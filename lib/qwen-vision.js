const DASHSCOPE_BASE = 'https://dashscope-intl.aliyuncs.com';
const MULTIMODAL_ENDPOINT = `${DASHSCOPE_BASE}/api/v1/services/aigc/multimodal-generation/generation`;
const VIDEO_ENDPOINT = `${DASHSCOPE_BASE}/api/v1/services/aigc/video-generation/video-synthesis`;
const TASK_ENDPOINT = `${DASHSCOPE_BASE}/api/v1/tasks`;

function getApiKey() {
  const key = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;
  if (!key || key.includes('PLACEHOLDER') || key.trim() === '') {
    throw new Error('DashScope API anahtarı ayarlanmamış. Lütfen DASHSCOPE_API_KEY tanımlayın.');
  }
  return key.trim();
}

function headers() {
  return {
    'Authorization': `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
}

async function pollTask(taskId, interval = 2000, timeout = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const res = await fetch(`${TASK_ENDPOINT}/${taskId}`, { headers: headers() });
    const data = await res.json();
    const status = data.output?.task_status;
    if (status === 'SUCCEEDED') return data;
    if (status === 'FAILED') throw new Error(`DashScope görevi başarısız: ${data.output?.message || 'Bilinmeyen hata'}`);
    if (status === 'CANCELED') throw new Error('DashScope görevi iptal edildi');
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('DashScope görevi zaman aşımına uğradı');
}

export async function generateWanImage(prompt, options = {}) {
  const { size = '1024*1024', n = 1, negativePrompt = '' } = options;
  const body = {
    model: 'wan2.6-t2i',
    input: {
      messages: [{ role: 'user', content: [{ text: prompt }] }],
    },
    parameters: {
      prompt_extend: true,
      watermark: false,
      n,
      size,
      negative_prompt: negativePrompt,
    },
  };

  const res = await fetch(MULTIMODAL_ENDPOINT, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Wan görsel üretimi başarısız: ${data.message || data.code || res.status}`);

  const content = data.output?.choices?.[0]?.message?.content || [];
  const imageContent = content.find(c => c.image);
  const imageUrl = imageContent?.image;

  if (!imageUrl) throw new Error('Wan görsel yanıtı boş');

  const imageRes = await fetch(imageUrl);
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  const base64 = buffer.toString('base64');

  return {
    url: `data:image/png;base64,${base64}`,
    mediaType: 'image',
    model: 'wan2.6-t2i',
    provider: 'dashscope',
  };
}

export async function generateWanImageVariation(imageUrlOrBase64, prompt, options = {}) {
  const { size = '1024*1024', n = 1 } = options;
  const image = imageUrlOrBase64.startsWith('http')
    ? imageUrlOrBase64
    : imageUrlOrBase64;

  const body = {
    model: 'wan2.6-image',
    input: {
      messages: [{
        role: 'user',
        content: [
          { text: prompt },
          { image },
        ],
      }],
    },
    parameters: {
      prompt_extend: true,
      watermark: false,
      n,
      size,
    },
  };

  const res = await fetch(MULTIMODAL_ENDPOINT, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Wan görsel düzenleme başarısız: ${data.message || data.code || res.status}`);

  const content = data.output?.choices?.[0]?.message?.content || [];
  const imageContent = content.find(c => c.image);
  const imageUrl = imageContent?.image;

  if (!imageUrl) throw new Error('Wan görsel varyasyon yanıtı boş');

  const imageRes = await fetch(imageUrl);
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  const base64 = buffer.toString('base64');

  return {
    url: `data:image/png;base64,${base64}`,
    mediaType: 'image',
    model: 'wan2.6-image',
    provider: 'dashscope',
  };
}

export async function generateWanVideo(prompt, options = {}) {
  const { duration = 5, ratio = '16:9', resolution = '720P' } = options;

  const body = {
    model: 'wan2.6-t2v',
    input: { prompt },
    parameters: {
      prompt_extend: true,
      duration,
      ratio,
      resolution,
      watermark: false,
    },
  };

  const res = await fetch(VIDEO_ENDPOINT, {
    method: 'POST',
    headers: { ...headers(), 'X-DashScope-Async': 'enable' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Wan video oluşturma başarısız: ${data.message || data.code || res.status}`);

  const taskId = data.output?.task_id;
  if (!taskId) throw new Error('Wan video task_id alınamadı');

  const result = await pollTask(taskId);
  const videoUrl = result.output?.video_url;
  if (!videoUrl) throw new Error('Wan video URL boş');

  const videoRes = await fetch(videoUrl);
  const buffer = Buffer.from(await videoRes.arrayBuffer());
  const base64 = buffer.toString('base64');

  return {
    url: `data:video/mp4;base64,${base64}`,
    mediaType: 'video',
    model: 'wan2.6-t2v',
    provider: 'dashscope',
  };
}

export async function generateWanVideoFromImage(imageUrlOrBase64, prompt, options = {}) {
  const { duration = 5, ratio = '16:9', resolution = '720P' } = options;
  const image = imageUrlOrBase64.startsWith('http')
    ? imageUrlOrBase64
    : imageUrlOrBase64;

  const body = {
    model: 'wan2.6-i2v',
    input: {
      prompt,
      image,
    },
    parameters: {
      prompt_extend: true,
      duration,
      ratio,
      resolution,
      watermark: false,
    },
  };

  const res = await fetch(VIDEO_ENDPOINT, {
    method: 'POST',
    headers: { ...headers(), 'X-DashScope-Async': 'enable' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Wan görselden video başarısız: ${data.message || data.code || res.status}`);

  const taskId = data.output?.task_id;
  if (!taskId) throw new Error('Wan i2v task_id alınamadı');

  const result = await pollTask(taskId);
  const videoUrl = result.output?.video_url;
  if (!videoUrl) throw new Error('Wan i2v video URL boş');

  const videoRes = await fetch(videoUrl);
  const buffer = Buffer.from(await videoRes.arrayBuffer());
  const base64 = buffer.toString('base64');

  return {
    url: `data:video/mp4;base64,${base64}`,
    mediaType: 'video',
    model: 'wan2.6-i2v',
    provider: 'dashscope',
  };
}
