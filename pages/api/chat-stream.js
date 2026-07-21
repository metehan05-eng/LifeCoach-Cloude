import OpenAI from 'openai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getQwenConfig } from '../../lib/qwen-api.js';
import { buildLifeCoachSystemPrompt, LEGACY_TOOL_JSON_FORMAT } from '@/lib/lifecoach-system-prompt';

const STREAM_TIMEOUT = 30000;

const LIVENOTES = `
## Aktif yetenekler (arka planda çalışır, kullanıcıya gösterilmez)
- GÖRSEL ANALİZİ: JPG, PNG, WEBP gibi görselleri analiz eder.
- VİDEO ANLAMA: YouTube videolarının transkriptini analiz eder.
- WEB ARAMA: Güncel bilgiyi doğal şekilde kullan.
- ÇOK DİLLİ: Hangi dilde konuşulursa o dilde yanıt ver.
${LEGACY_TOOL_JSON_FORMAT}`;

function sse(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  const sessionEmail = session?.user?.email;
  if (!sessionEmail) {
    return res.status(401).json({ error: 'UNAUTHENTICATED' });
  }

  const { message, audio, visionFrame, history = [], chatId, sessionId } = req.body;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const systemPrompt = buildLifeCoachSystemPrompt({
    userContext: `Kullanıcı: ${sessionEmail}`,
    extraContext: LIVENOTES,
  });

  const qwenConfig = getQwenConfig();
  let apiKey = qwenConfig.apiKey;
  let baseURL = qwenConfig.baseURL;

  if (qwenConfig.provider === 'mock') {
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey && openrouterKey.trim() !== "" && !openrouterKey.includes("YourOpenRouterKeyHere")) {
      apiKey = openrouterKey.trim();
      baseURL = "https://openrouter.ai/api/v1";
    } else {
      sse(res, { error: 'AI_API_KEY_MISSING', message: 'API anahtarı ayarlanmamış.' });
      sse(res, { done: true });
      res.end();
      return;
    }
  }

  let userContent = message || '...';
  if (visionFrame) {
    userContent = {
      role: 'user',
      content: [
        { type: 'text', text: userContent },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${visionFrame}` } },
      ],
    };
  }

  const historyMsgs = history.map(m => ({ role: m.role, content: m.content }));
  const msgs = [
    { role: 'system', content: systemPrompt },
    ...historyMsgs,
    ...(typeof userContent === 'string'
      ? [{ role: 'user', content: userContent }]
      : [userContent]),
  ];

  let fullResponse = '';

  try {
    const client = new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: baseURL.includes('openrouter.ai') ? {
        'HTTP-Referer': 'https://han-ai.dev/',
        'X-Title': 'Life Coach AI - Stream',
      } : {},
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT);

    const stream = await client.chat.completions.create({
      model: qwenConfig.model,
      messages: msgs,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    }, { signal: controller.signal });

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        sse(res, { content });

        // Flush every sentence for progressive TTS
        if (/[.!?]\s*$/.test(fullResponse.trim())) {
          sse(res, { flush: true, sentence: fullResponse });
          fullResponse = '';
        }
      }
    }

    clearTimeout(timeoutId);

    // Flush remaining text
    if (fullResponse.trim()) {
      sse(res, { flush: true, sentence: fullResponse });
    }

    sse(res, { done: true });
    res.end();
  } catch (err) {
    console.error('[Stream Error]', err.message);
    sse(res, { error: err.message });
    sse(res, { done: true });
    res.end();
  }
}
