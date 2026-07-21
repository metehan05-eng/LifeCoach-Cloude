/**
 * TTS API — Text-to-Speech with Qwen DashScope only.
 * Model: qwen-audio-3.0-tts-plus
 * Voice: longyu (erkek, kalın, bilge) — Sifu Panda'ya yakışır.
 * Requires DASHSCOPE_API_KEY or QWEN_API_KEY in environment.
 */

import { qwenTTS } from '../../lib/qwen-audio.js';

export default async function handler(req, res) {
  if (req.method === 'HEAD') {
    const hasKey = !!(process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY);
    return hasKey ? res.status(200).end() : res.status(503).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const audioBuffer = await qwenTTS(text, {
      voice: 'longyu',
      format: 'mp3',
      sampleRate: 24000,
    });

    if (!audioBuffer) {
      return res.status(503).json({ error: 'Qwen TTS kullanılamıyor.' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-TTS-Provider', 'qwen-dashscope');
    res.send(audioBuffer);
  } catch {
    return res.status(503).json({ error: 'Qwen TTS başarısız.' });
  }
}
