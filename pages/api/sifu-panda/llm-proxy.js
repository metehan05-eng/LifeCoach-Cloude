export default async function handler(req, res) {
  let body;
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
  } catch {
    body = {};
  }

  console.log('[llm-proxy] method=', req.method, 'headers=', JSON.stringify(req.headers));
  console.log('[llm-proxy] body=', JSON.stringify(body).slice(0, 500));

  const model = body.model || 'qwen3.7-plus';
  const targetUrl = process.env.QWEN_BASE_URL
    || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'No API key configured' });
  }

  body.model = model;

  console.log('[llm-proxy] forwarding to', targetUrl, 'model=', model);

  try {
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    console.log('[llm-proxy] response status=', resp.status);
    if (!resp.ok) {
      console.log('[llm-proxy] error=', JSON.stringify(data).slice(0, 300));
    }
    res.status(resp.status).json(data);
  } catch (err) {
    console.error('[llm-proxy] fetch error:', err.message);
    res.status(502).json({ error: err.message });
  }
}
