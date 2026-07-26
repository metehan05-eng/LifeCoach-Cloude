export const config = {
  api: { bodyParser: true },
};

const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
const dashscopeKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;

export default async function handler(req, res) {
  let body;
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
  } catch {
    body = {};
  }

  const hasGemini = geminiKey && !geminiKey.includes('PLACEHOLDER');
  const hasDashscope = dashscopeKey && !dashscopeKey.includes('PLACEHOLDER');

  if (!hasGemini && !hasDashscope) {
    console.error("[llm-proxy] No valid LLM key found");
    return res.status(500).json({ error: 'No valid LLM provider configured' });
  }

  // Determine provider
  const useGemini = hasGemini && (body.model?.toLowerCase().startsWith('gemini') || !hasDashscope);
  const targetUrl = useGemini
    ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
    : (process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions');

  const apiKey = useGemini ? geminiKey : dashscopeKey;
  const requestedModel = body.model || (useGemini ? 'gemini-1.5-flash' : 'qwen-plus');

  // Sanitize payload to strict OpenAI Chat Completions format (removes Deepgram metadata that causes 400 errors)
  const cleanBody = {
    model: requestedModel,
    messages: Array.isArray(body.messages)
      ? body.messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
          content: typeof m.content === 'string' ? m.content : String(m.content || ''),
        }))
      : [{ role: 'user', content: 'Hello' }],
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
    max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 150,
    stream: body.stream !== false,
  };

  const logId = Date.now().toString(36);
  console.log(`[llm-proxy/${logId}] provider=${useGemini ? 'gemini' : 'dashscope'} model=${cleanBody.model} stream=${cleanBody.stream}`);

  try {
    let resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(cleanBody),
    });

    // Fallback model retry for Gemini if 400/404
    if (!resp.ok && useGemini && cleanBody.model !== 'gemini-1.5-flash') {
      console.warn(`[llm-proxy/${logId}] ${cleanBody.model} failed (${resp.status}), retrying with gemini-1.5-flash...`);
      cleanBody.model = 'gemini-1.5-flash';
      resp = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(cleanBody),
      });
    }

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error(`[llm-proxy/${logId}] LLM Error (${resp.status}):`, errText.slice(0, 500));
      return res.status(resp.status).json({ error: `LLM API Error ${resp.status}`, detail: errText });
    }

    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let chunkCount = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunkCount++;
        res.write(decoder.decode(value, { stream: true }));
      }
      console.log(`[llm-proxy/${logId}] Stream complete (${chunkCount} chunks)`);
      res.end();
    } else {
      const data = await resp.json();
      res.status(200).json(data);
    }
  } catch (err) {
    console.error(`[llm-proxy/${logId}] Fetch Exception:`, err.message);
    res.status(502).json({ error: err.message });
  }
}
