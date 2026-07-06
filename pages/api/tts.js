/**
 * TTS API — Text-to-Speech with multiple providers.
 * 
 * Provider priority:
 * 1. Google Cloud TTS (free: 1M chars/month) — requires GOOGLE_TTS_API_KEY
 * 2. Edge TTS (completely free, no key) — uses Microsoft Edge speech API
 * 3. ElevenLabs (paid) — requires ELEVENLABS_API_KEY
 * 
 * If none available, returns 503 → client falls back to browser SpeechSynthesis
 */

function buildSSML(text, lang) {
  const langCode = lang?.startsWith('tr') ? 'tr-TR' : (lang?.startsWith('en') ? 'en-US' : 'tr-TR');
  return `<?xml version="1.0"?><speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${langCode}"><voice name="${langCode === 'tr-TR' ? 'tr-TR-Standard-A' : 'en-US-Standard-J'}">${text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])}</voice></speak>`;
}

async function googleTTS(text, lang) {
  const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_TTS_SERVICE_ACCOUNT;
  if (!apiKey || apiKey.includes('PLACEHOLDER')) return null;

  const langCode = lang?.startsWith('tr') ? 'tr-TR' : (lang?.startsWith('en') ? 'en-US' : 'tr-TR');
  const voiceName = langCode === 'tr-TR' ? 'tr-TR-Standard-A' : 'en-US-Standard-J';

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: text.slice(0, 500) },
        voice: { languageCode: langCode, name: voiceName },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
      }),
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.audioContent) return null;

  const audioBuffer = Buffer.from(data.audioContent, 'base64');
  return audioBuffer;
}

async function edgeTTS(text, lang) {
  try {
    // Edge TTS uses Microsoft's speech API — completely free, no API key
    const langCode = lang?.startsWith('tr') ? 'tr-TR' : (lang?.startsWith('en') ? 'en-US' : 'tr-TR');
    const voiceName = langCode === 'tr-TR' ? 'Microsoft Server Speech Text to Speech Voice (tr-TR, Ahmet)' : 'Microsoft Server Speech Text to Speech Voice (en-US, ChristopherNeural)';

    // Get auth token from Microsoft
    const tokenRes = await fetch('https://edge.microsoft.com/translate/auth', {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!tokenRes.ok) return null;
    const token = await tokenRes.text();
    if (!token) return null;

    const ssml = buildSSML(text, lang);

    const ttsRes = await fetch(
      `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?trustedclienttoken=6A5B5F55-6E5F-4D0A-BB4D-0B07F5F5C5B5`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/ssml+xml',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0',
        },
        body: ssml,
      }
    );

    if (!ttsRes.ok) return null;

    const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
    return audioBuffer;
  } catch {
    return null;
  }
}

async function elevenLabsTTS(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || apiKey.includes('PLACEHOLDER')) return null;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`,
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
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
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
    // Client checks if any TTS provider is available
    const hasGoogle = !!(process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_TTS_SERVICE_ACCOUNT);
    const hasElevenLabs = !!(process.env.ELEVENLABS_API_KEY && !process.env.ELEVENLABS_API_KEY.includes('PLACEHOLDER'));
    if (hasGoogle || hasElevenLabs) return res.status(200).end();
    // Edge TTS is always available (no key needed)
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, language } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }

  // Try providers in order
  let audioBuffer = await googleTTS(text, language);
  let provider = 'google';

  if (!audioBuffer) {
    audioBuffer = await edgeTTS(text, language);
    provider = 'edge';
  }

  if (!audioBuffer) {
    audioBuffer = await elevenLabsTTS(text);
    provider = 'elevenlabs';
  }

  if (!audioBuffer) {
    return res.status(503).json({ error: 'No TTS provider available' });
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('X-TTS-Provider', provider);
  res.send(audioBuffer);
}
