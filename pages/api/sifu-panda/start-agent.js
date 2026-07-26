/**
 * Sifu Panda — Deepgram Voice Agent session başlatma
 * POST → { wsUrl, settings } döndürür
 * İstemci bu bilgilerle Deepgram Voice Agent WebSocket'e bağlanır.
 */

import { getQwenConfig } from '../../../lib/qwen-api.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const qwenConfig = getQwenConfig();
    return res.json({
      dgKey: !!(process.env.DEEPGRAM_API_KEY && !process.env.DEEPGRAM_API_KEY.includes('PLACEHOLDER')),
      qwenProvider: qwenConfig.provider,
      qwenModel: qwenConfig.model,
      qwenBaseUrl: qwenConfig.baseURL,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const dgKey = process.env.DEEPGRAM_API_KEY;
  if (!dgKey || dgKey.includes('PLACEHOLDER')) {
    console.error('[start-agent] DEEPGRAM_API_KEY missing or placeholder');
    return res.status(503).json({ error: 'DEEPGRAM_API_KEY not configured' });
  }

  const qwenConfig = getQwenConfig();
  let llmApiKey;
  let llmBaseUrl;
  console.log('[start-agent] Qwen provider:', qwenConfig.provider);

  if (qwenConfig.provider === 'mock') {
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey && !openrouterKey.includes('Your') && !openrouterKey.includes('PLACEHOLDER')) {
      llmApiKey = openrouterKey;
      llmBaseUrl = 'https://openrouter.ai/api/v1';
    } else {
      console.error('[start-agent] No AI key configured (mock mode)');
      return res.status(503).json({ error: 'AI_API_KEY_MISSING - DASHSCOPE_API_KEY veya OPENROUTER_API_KEY gerekli' });
    }
  } else {
    llmApiKey = qwenConfig.apiKey;
    llmBaseUrl = qwenConfig.baseURL;
  }

  const settings = {
    audio: {
      input: { encoding: 'linear16', sample_rate: 16000 },
      output: { encoding: 'linear16', sample_rate: 24000, container: 'none' },
    },
    agent: {
      listen: { model: 'nova-3', language: 'en' },
      think: {
        provider: { type: 'open_ai', model: qwenConfig.model, temperature: 0.8 },
        endpoint: {
          url: llmBaseUrl.replace(/\/$/, '') + '/chat/completions',
          headers: { authorization: `Bearer ${llmApiKey}` },
        },
        prompt: `You are Sifu Panda — a wise, calm, and slightly humorous kung fu master panda.

RULES:
- Speak ONLY in English.
- Keep responses short and conversational (1-3 sentences).
- Use simple, warm words like a patient teacher.
- Occasionally add wisdom about balance, patience, and inner peace — but keep it natural.
- Never mention you are an AI. You are Sifu Panda.
- Be encouraging and supportive.
- Ask follow-up questions to keep the conversation flowing.`,
      },
      speak: { model: 'aura-orion-en', rate: 1.0 },
    },
  };

  res.json({
    wsUrl: `wss://agent.deepgram.com/v1/agent/converse?Authorization=Token%20${dgKey}`,
    settings,
  });
}
