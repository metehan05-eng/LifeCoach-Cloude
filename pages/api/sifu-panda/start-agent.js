const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
const hasGemini = geminiKey && !geminiKey.includes('PLACEHOLDER');
const hasDashscope = !!(process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.json({
      dgKey: !!(process.env.DEEPGRAM_API_KEY && !process.env.DEEPGRAM_API_KEY.includes('PLACEHOLDER')),
      llmProvider: hasGemini ? 'gemini' : hasDashscope ? 'dashscope' : 'none',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const dgKey = (process.env.DEEPGRAM_API_KEY || '').trim();
  if (!dgKey || dgKey.includes('PLACEHOLDER')) {
    return res.status(503).json({ error: 'DEEPGRAM_API_KEY not configured' });
  }

  if (!hasGemini && !hasDashscope) {
    return res.status(503).json({ error: 'AI_API_KEY_MISSING - GOOGLE_GEMINI_API_KEY veya DASHSCOPE_API_KEY gerekli' });
  }

  // Safely parse host and protocol
  const rawHost = req.headers['x-forwarded-host'] || req.headers['host'] || '';
  const host = rawHost.split(',')[0].trim();
  const rawProto = req.headers['x-forwarded-proto'] || 'https';
  const protocol = rawProto.split(',')[0].trim();

  let baseUrl = `${protocol}://${host}`;
  if (!host) {
    baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://han-ai.dev';
  }
  const llmProxyUrl = `${baseUrl}/api/sifu-panda/llm-proxy`;

  const llmModel = hasGemini ? 'gemini-1.5-flash' : 'qwen-plus';

  const settings = {
    audio: {
      input: { encoding: 'linear16', sample_rate: 16000 },
      output: { encoding: 'linear16', sample_rate: 24000, container: 'none' },
    },
    agent: {
      language: 'en',
      listen: {
        provider: { type: 'deepgram', model: 'nova-3' },
      },
      think: {
        provider: { type: 'open_ai', model: llmModel, temperature: 0.7 },
        endpoint: {
          url: llmProxyUrl,
        },
        prompt: 'You are Sifu Panda, a wise and warm kung fu master panda. Respond in 1-2 short sentences only. Be encouraging and wise. Never mention being an AI.',
      },
      speak: {
        provider: { type: 'deepgram', model: 'aura-orion-en' },
      },
    },
  };

  res.json({
    wsUrl: 'wss://agent.deepgram.com/v1/agent/converse',
    token: dgKey,
    settings,
  });
}
