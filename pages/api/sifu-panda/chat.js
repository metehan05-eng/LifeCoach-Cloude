export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
  const dashscopeKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;

  if (!geminiKey && !dashscopeKey) {
    return res.status(503).json({ error: 'AI API key missing (GOOGLE_GEMINI_API_KEY)' });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const systemPrompt = "You are Sifu Panda, a wise, warm, and encouraging kung fu master panda. Respond in 1-2 short, inspiring sentences. Be encouraging and wise. Reply in the same language as the user. Never mention being an AI.";

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(Array.isArray(history) ? history.slice(-6).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.text || m.content || '')
    })) : []),
    { role: 'user', content: message }
  ];

  const useGemini = !!(geminiKey && !geminiKey.includes('PLACEHOLDER'));
  const targetUrl = useGemini
    ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
    : (process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions');

  const apiKey = useGemini ? geminiKey : dashscopeKey;
  const model = useGemini ? 'gemini-1.5-flash' : 'qwen-plus';

  try {
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error("[sifu-panda/chat] Gemini API error:", resp.status, errText);
      return res.status(resp.status).json({ error: `AI Error ${resp.status}`, detail: errText });
    }

    const data = await resp.json();
    const replyText = data?.choices?.[0]?.message?.content || "Focus your mind, young warrior. Peace begins within.";
    return res.status(200).json({ reply: replyText });
  } catch (err) {
    console.error("[sifu-panda/chat] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
