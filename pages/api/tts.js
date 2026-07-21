/**
 * TTS API — Text-to-Speech with Qwen TTS only.
 * Model: qwen3-tts-flash
 * Voice: Eldric Sage (sakin, bilge — Sifu Panda'ya yakışır)
 * Requires DASHSCOPE_API_KEY in environment.
 */

const TTS_ENDPOINT = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

const QWEN_KEYS = ['DASHSCOPE_API_KEY', 'QWEN_API_KEY', 'DASHSCOPE_KEY'];
const QWEN_MODELS = [
  { model: 'qwen3-tts-flash', voice: 'Eldric Sage' },
  { model: 'qwen3-tts-flash-2025-11-27', voice: 'Eldric Sage' },
  { model: 'qwen-audio-3.0-tts-plus', voice: 'longyu' },
];

function getApiKey() {
  for (const key of QWEN_KEYS) {
    const val = process.env[key];
    if (val && !val.includes('PLACEHOLDER') && !val.includes('Your')) return val;
  }
  return null;
}

async function qwenTTS(text) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  for (const { model, voice } of QWEN_MODELS) {
    try {
      const body = model.startsWith('qwen-audio')
        ? { model, input: { text: text.slice(0, 500) }, parameters: { voice, format: 'mp3', sample_rate: 24000 } }
        : { model, input: { text: text.slice(0, 500), voice } };

      const res = await fetch(TTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const audioBase64 = data?.output?.audio || data?.output?.choices?.[0]?.message?.content?.[0]?.audio;
      if (audioBase64) return Buffer.from(audioBase64, 'base64');
    } catch {}
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method === 'HEAD') {
    const hasKey = !!getApiKey();
    return hasKey ? res.status(200).end() : res.status(503).end();
  }

  if (req.method === 'GET') {
    const keyName = QWEN_KEYS.find(k => {
      const v = process.env[k];
      return v && !v.includes('PLACEHOLDER') && !v.includes('Your');
    });
    return res.json({ status: keyName ? 'ok' : 'missing', key: keyName || 'YOK' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const audioBuffer = await qwenTTS(text);

  if (!audioBuffer) {
    return res.status(503).json({ error: 'Qwen TTS kullanılamıyor.' });
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('X-TTS-Provider', 'qwen');
  res.send(audioBuffer);
}
