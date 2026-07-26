export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  let body;
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
  } catch {
    body = {};
  }

  const model = body.model || 'qwen3.7-plus';
  const targetUrl = process.env.QWEN_BASE_URL
    || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'No API key configured' });
  }

  body.model = model;

  try {
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const contentType = resp.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream')) {
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      res.setHeader('Content-Type', 'text/event-stream');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } else {
      const data = await resp.json();
      res.status(resp.status).json(data);
    }
  } catch (err) {
    console.error('[llm-proxy] error:', err.message);
    res.status(502).json({ error: err.message });
  }
}
