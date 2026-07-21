/**
 * TTS API — Text-to-Speech with Google Cloud TTS only.
 * Voice: tr-TR-Neural2-B / tr-TR-Standard-B (erkek, kalın) — Sifu Panda'ya yakışır.
 * Requires GOOGLE_TTS_API_KEY in environment.
 */

async function googleTTS(text) {
  const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_TTS_SERVICE_ACCOUNT;
  if (!apiKey || apiKey.includes('PLACEHOLDER')) return null;

  const voiceName = 'tr-TR-Neural2-B';

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: text.slice(0, 500) },
        voice: { languageCode: 'tr-TR', name: voiceName },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
      }),
    }
  );

  if (!res.ok) {
    console.error(`[Google TTS] HTTP ${res.status}:`, await res.text().catch(() => ''));
    return null;
  }

  const data = await res.json();
  if (!data.audioContent) {
    console.error('[Google TTS] Yanıtta audioContent yok');
    return null;
  }

  return Buffer.from(data.audioContent, 'base64');
}

export default async function handler(req, res) {
  if (req.method === 'HEAD') {
    const hasKey = !!(process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_TTS_SERVICE_ACCOUNT);
    return hasKey ? res.status(200).end() : res.status(503).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const audioBuffer = await googleTTS(text);

  if (!audioBuffer) {
    return res.status(503).json({ error: 'Google TTS kullanılamıyor.' });
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('X-TTS-Provider', 'google');
  res.send(audioBuffer);
}
