/**
 * TTS API — Text-to-Speech with ElevenLabs only.
 * Requires ELEVENLABS_API_KEY in environment.
 * Voice: Thomas (deep, calm, male) — Sifu Panda'ya yakışır.
 */

async function elevenLabsTTS(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || apiKey.includes('PLACEHOLDER')) return null;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/yoZ06aMxZJJ28mfd3POQ`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text.slice(0, 500),
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.4, similarity_boost: 0.6 },
        }),
      }
    );

    if (!res.ok) return null;
    const audioBuffer = Buffer.from(await res.arrayBuffer());
    return audioBuffer;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method === 'HEAD') {
    const hasKey = !!(process.env.ELEVENLABS_API_KEY && !process.env.ELEVENLABS_API_KEY.includes('PLACEHOLDER'));
    return hasKey ? res.status(200).end() : res.status(503).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const audioBuffer = await elevenLabsTTS(text);

  if (!audioBuffer) {
    return res.status(503).json({ error: 'ElevenLabs TTS kullanılamıyor. ELEVENLABS_API_KEY kontrol et.' });
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('X-TTS-Provider', 'elevenlabs');
  res.send(audioBuffer);
}
