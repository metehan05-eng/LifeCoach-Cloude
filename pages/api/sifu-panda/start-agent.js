export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.json({
      dgKey: !!(process.env.DEEPGRAM_API_KEY && !process.env.DEEPGRAM_API_KEY.includes('PLACEHOLDER')),
      llmKey: !!(process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const dgKey = process.env.DEEPGRAM_API_KEY;
  if (!dgKey || dgKey.includes('PLACEHOLDER')) {
    return res.status(503).json({ error: 'DEEPGRAM_API_KEY not configured' });
  }

  if (!process.env.DASHSCOPE_API_KEY && !process.env.QWEN_API_KEY) {
    return res.status(503).json({ error: 'LLM_API_KEY_MISSING - DASHSCOPE_API_KEY veya QWEN_API_KEY gerekli' });
  }

  const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'han-ai.dev';
  const protocol = req.headers['x-forwarded-proto'] || 'https';

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
        provider: { type: 'open_ai', model: 'qwen3.7-plus', temperature: 0.8 },
        endpoint: {
          url: `${protocol}://${host}/api/sifu-panda/llm-proxy`,
          headers: {},
        },
        prompt: 'You are Sifu Panda, a wise kung fu master. Speak English in 1-2 short sentences. Warm, encouraging, never mention being AI.',
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
