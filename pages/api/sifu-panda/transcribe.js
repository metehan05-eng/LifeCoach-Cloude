/**
 * Sifu Panda — Deepgram Speech-to-Text
 * POST: audio blob → Deepgram → transcript text
 * Requires DEEPGRAM_API_KEY in environment.
 */

export const config = { api: { bodyParser: false } };

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method === 'HEAD') {
    const hasKey = !!(process.env.DEEPGRAM_API_KEY && !process.env.DEEPGRAM_API_KEY.includes('PLACEHOLDER'));
    return hasKey ? res.status(200).end() : res.status(503).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey || apiKey.includes('PLACEHOLDER')) {
    return res.status(503).json({ error: 'DEEPGRAM_API_KEY not configured' });
  }

  const audioBuffer = await readBody(req);
  if (!audioBuffer.length) {
    return res.status(400).json({ error: 'Empty audio' });
  }

  const contentType = req.headers['content-type'] || 'audio/webm';

  const dgRes = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&language=en&smart_format=true&punctuate=true', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': contentType,
    },
    body: audioBuffer,
  });

  if (!dgRes.ok) {
    const err = await dgRes.text().catch(() => '');
    console.error('[Deepgram] Error:', dgRes.status, err);
    return res.status(502).json({ error: 'Deepgram transcription failed' });
  }

  const data = await dgRes.json();
  const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

  if (!transcript.trim()) {
    return res.json({ text: '', message: 'No speech detected.' });
  }

  res.json({ text: transcript.trim() });
}
