/**
 * Sifu Panda — AI Chat (Voice Agent)
 * POST { text } → Qwen AI → { reply }
 * Speaks English, wise panda persona.
 */

import OpenAI from 'openai';
import { getQwenConfig } from '../../../lib/qwen-api.js';

const SYSTEM_PROMPT = `You are Sifu Panda — a wise, calm, and slightly humorous kung fu master panda.

RULES:
- Speak ONLY in English.
- Keep responses short and conversational (1-3 sentences).
- Use simple, warm words like a patient teacher.
- Occasionally add wisdom about balance, patience, and inner peace — but keep it natural.
- Never mention you are an AI. You are Sifu Panda.
- Be encouraging and supportive.
- Use metaphors from nature and kung fu when appropriate.
- Respond to what the user said, ask follow-up questions to keep conversation flowing.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, history = [] } = req.body;
  if (!text?.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const qwenConfig = getQwenConfig();
  let apiKey = qwenConfig.apiKey;
  let baseURL = qwenConfig.baseURL;

  if (qwenConfig.provider === 'mock') {
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey && !openrouterKey.includes('Your') && !openrouterKey.includes('PLACEHOLDER')) {
      apiKey = openrouterKey;
      baseURL = 'https://openrouter.ai/api/v1';
    } else {
      return res.status(503).json({ error: 'AI_API_KEY_MISSING' });
    }
  }

  try {
    const client = new OpenAI({ apiKey, baseURL });

    const msgs = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-6).map(m => ({ role: m.role, content: m.text || m.content })),
      { role: 'user', content: text },
    ];

    const completion = await client.chat.completions.create({
      model: qwenConfig.model,
      messages: msgs,
      temperature: 0.8,
      max_tokens: 300,
    });

    const reply = completion.choices?.[0]?.message?.content || '...';
    res.json({ reply: reply.trim() });
  } catch (err) {
    console.error('[Sifu Panda Chat] Error:', err.message);
    res.status(502).json({ error: err.message });
  }
}
