/**
 * TTS API — Text-to-Speech with Google Cloud TTS only.
 * Voice: tr-TR-Neural2-B (erkek, kalın) — Sifu Panda'ya yakışır.
 * Requires GOOGLE_TTS_API_KEY in environment.
 */

const GOOGLE_VOICES = [
  'tr-TR-Neural2-B',
  'tr-TR-Wavenet-B',
  'tr-TR-Standard-B',
];

async function googleTTS(text) {
  const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_TTS_SERVICE_ACCOUNT;
  if (!apiKey || apiKey.includes('PLACEHOLDER')) return null;

  for (const voiceName of GOOGLE_VOICES) {
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

    if (!res.ok) continue;

    const data = await res.json();
    if (data.audioContent) return Buffer.from(data.audioContent, 'base64');
  }

  console.error('[Google TTS] Tüm sesler başarısız');
  return null;
}

export default async function handler(req, res) {
  if (req.method === 'HEAD') {
    const hasKey = !!(process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_TTS_SERVICE_ACCOUNT);
    return hasKey ? res.status(200).end() : res.status(503).end();
  }

  if (req.method === 'GET') {
    const hasKey = !!(process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_TTS_SERVICE_ACCOUNT);
    const keyName = process.env.GOOGLE_TTS_API_KEY ? 'GOOGLE_TTS_API_KEY' :
                    process.env.GOOGLE_TTS_SERVICE_ACCOUNT ? 'GOOGLE_TTS_SERVICE_ACCOUNT' : 'YOK';
    return res.json({ status: hasKey ? 'ok' : 'missing', key: keyName });
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
