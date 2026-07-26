export const config = {
  api: { bodyParser: true },
};

const PROVIDERS = [];

const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
if (geminiKey && !geminiKey.includes('PLACEHOLDER')) {
  PROVIDERS.push({
    name: 'gemini',
    match: (model) => model?.toLowerCase().startsWith('gemini'),
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${geminiKey}` },
    authQuery: '',
  });
}

const dashscopeKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;
if (dashscopeKey && !dashscopeKey.includes('PLACEHOLDER')) {
  PROVIDERS.push({
    name: 'dashscope',
    match: () => true,
    url: process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${dashscopeKey}` },
    authQuery: '',
  });
}

export default async function handler(req, res) {
  if (PROVIDERS.length === 0) {
    return res.status(500).json({ error: 'No LLM provider configured (set GOOGLE_GEMINI_API_KEY or DASHSCOPE_API_KEY)' });
  }

  let body;
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
  } catch {
    body = {};
  }

  const provider = PROVIDERS.find(p => p.match(body.model)) || PROVIDERS[0];
  const model = body.model || (provider.name === 'gemini' ? 'gemini-2.0-flash' : 'qwen-plus');

  body.model = model;
  if (body.max_tokens === undefined) body.max_tokens = 150;
  if (body.temperature === undefined) body.temperature = 0.8;

  const targetUrl = provider.authQuery
    ? provider.url + '?' + provider.authQuery
    : provider.url;

  const logId = Date.now().toString(36);
  console.log(`[llm-proxy/${logId}] provider=${provider.name} model=${model} stream=${!!body.stream}`);

  try {
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: provider.headers,
      body: JSON.stringify(body),
    });

    console.log(`[llm-proxy/${logId}] response status=${resp.status} contentType=${resp.headers.get('content-type')}`);

    const contentType = resp.headers.get('content-type') || '';

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error(`[llm-proxy/${logId}] error:`, errText.slice(0, 800));
      let errDetail = errText;
      try { errDetail = JSON.stringify(JSON.parse(errText), null, 2).slice(0, 500); } catch {}
      return res.status(resp.status).json({ error: `LLM API returned ${resp.status}`, detail: errDetail });
    }

    if (contentType.includes('text/event-stream')) {
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      res.setHeader('Content-Type', 'text/event-stream');
      let chunkCount = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunkCount++;
        res.write(decoder.decode(value, { stream: true }));
      }
      console.log(`[llm-proxy/${logId}] stream complete, ${chunkCount} chunks`);
      res.end();
    } else {
      const data = await resp.json();
      console.log(`[llm-proxy/${logId}] json response, choices=${data?.choices?.length || 0}`);
      res.status(resp.status).json(data);
    }
  } catch (err) {
    console.error(`[llm-proxy/${logId}] fetch error:`, err.message);
    res.status(502).json({ error: err.message });
  }
}
