export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawGeminiKey = process.env.GOOGLE_GEMINI_API_KEY || '';
  const rawDashscopeKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || '';

  const geminiKey = rawGeminiKey.includes('PLACEHOLDER') ? '' : rawGeminiKey.trim();
  const dashscopeKey = rawDashscopeKey.includes('PLACEHOLDER') ? '' : rawDashscopeKey.trim();

  if (!geminiKey && !dashscopeKey) {
    return res.status(503).json({ error: 'GOOGLE_GEMINI_API_KEY veya DASHSCOPE_API_KEY tanımlı değil.' });
  }

  const { message, history } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message parameter is required' });
  }

  const systemInstructionText = "You are Sifu Panda, a wise, warm, and encouraging kung fu master panda. Respond in 1-2 short, inspiring sentences. Be encouraging and wise. Reply in the same language as the user (Turkish or English). Never mention being an AI.";

  // 1. Primary: Native Google Gemini API (generateContent)
  if (geminiKey) {
    const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    
    // Format conversation history for Native Gemini API
    const contents = [];
    if (Array.isArray(history)) {
      history.slice(-6).forEach(m => {
        const text = String(m.text || m.content || '').trim();
        if (text) {
          contents.push({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text }],
          });
        }
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message.trim() }],
    });

    for (const model of modelsToTry) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstructionText }]
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 150,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            return res.status(200).json({ reply: replyText.trim() });
          }
        } else {
          const errText = await response.text().catch(() => '');
          console.warn(`[sifu-panda/chat] Gemini model ${model} returned ${response.status}:`, errText.slice(0, 300));
        }
      } catch (err) {
        console.warn(`[sifu-panda/chat] Gemini model ${model} fetch exception:`, err.message);
      }
    }
  }

  // 2. Fallback: Qwen/Dashscope if Gemini key failed or not set
  if (dashscopeKey) {
    try {
      const qwenUrl = process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
      const messages = [
        { role: 'system', content: systemInstructionText },
        ...(Array.isArray(history) ? history.slice(-6).map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.text || m.content || '')
        })) : []),
        { role: 'user', content: message }
      ];

      const resp = await fetch(qwenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dashscopeKey}`,
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          messages,
          temperature: 0.7,
          max_tokens: 150,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const replyText = data?.choices?.[0]?.message?.content;
        if (replyText) {
          return res.status(200).json({ reply: replyText.trim() });
        }
      }
    } catch (err) {
      console.error("[sifu-panda/chat] Qwen fallback error:", err.message);
    }
  }

  // Final fallback text if all AI calls fail
  return res.status(200).json({
    reply: "Focus your mind, young warrior. Peace and wisdom begin within."
  });
}
