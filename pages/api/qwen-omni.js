import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audio, text, language = 'tr' } = req.body;

    const apiKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;
    if (!apiKey || apiKey.includes('PLACEHOLDER') || apiKey.trim() === '') {
      return res.status(400).json({ error: 'DASHSCOPE_API_KEY ayarlanmamış' });
    }

    const client = new OpenAI({
      apiKey: apiKey.trim(),
      baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    });

    const messages = [
      {
        role: 'system',
        content: `Sen HAN AI'nin sesli asistanı Sifu Panda'sın. Kullanıcıyla Türkçe konuş, samimi ve motive edici ol. Kısa ve net cevaplar ver.`,
      },
    ];

    if (audio) {
      messages.push({
        role: 'user',
        content: [
          { type: 'audio_url', audio_url: { url: audio } },
          ...(text ? [{ type: 'text', text }] : []),
        ],
      });
    } else if (text) {
      messages.push({ role: 'user', content: text });
    } else {
      return res.status(400).json({ error: 'audio veya text gerekli' });
    }

    const completion = await client.chat.completions.create({
      model: process.env.QWEN_OMNI_MODEL || 'qwen3-omni-flash',
      messages,
      modalities: ['text'],
      max_tokens: 512,
    });

    const responseText = completion.choices?.[0]?.message?.content || '';

    return res.status(200).json({
      success: true,
      text: responseText,
      model: completion.model,
    });
  } catch (err) {
    console.error('[Qwen Omni] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
