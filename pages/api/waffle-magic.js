import { optimizeWafflePrompt } from '../../lib/waffle-hf.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { prompt, referenceImage, mode = 'image' } = req.body || {};
  if (!prompt?.trim() && !referenceImage) {
    return res.status(400).json({ error: 'Prompt gerekli.' });
  }

  try {
    const { optimizedPrompt, engine } = await optimizeWafflePrompt(prompt, { referenceImage, mode });
    res.status(200).json({ optimizedPrompt, engine });
  } catch (error) {
    console.error('Waffle Magic Error:', error);
    res.status(500).json({ error: 'Sihir yapılamadı :(' });
  }
}
