import {
  optimizeWafflePrompt,
  generateWaffleImage,
  generateWaffleVideo,
  getAspectDimensions,
} from '../../lib/waffle-hf.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
  maxDuration: 120,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    prompt,
    mode = 'image',
    referenceImage = null,
    referenceImages = null,
    aspect = '1:1',
    optimizeOnly = false,
  } = req.body || {};

  // Frontend sends `referenceImages` (array); the HF pipeline consumes a single
  // reference. Accept both shapes and fall back to the first uploaded image.
  const refImage = referenceImage
    || (Array.isArray(referenceImages) && referenceImages.length > 0 ? referenceImages[0] : null);

  if (!prompt?.trim() && !refImage) {
    return res.status(400).json({ error: 'Prompt veya referans görsel gerekli.' });
  }

  try {
    const { optimizedPrompt, engine: promptEngine } = await optimizeWafflePrompt(prompt, {
      referenceImage: refImage,
      mode,
    });

    if (optimizeOnly) {
      return res.status(200).json({
        success: true,
        optimizedPrompt,
        promptEngine,
      });
    }

    const { width, height } = getAspectDimensions(aspect);

    if (mode === 'video') {
      const video = await generateWaffleVideo(optimizedPrompt, {
        referenceImage: refImage,
        width,
        height,
      });
      return res.status(200).json({
        success: true,
        mode: 'video',
        optimizedPrompt,
        promptEngine,
        ...video,
      });
    }

    const image = await generateWaffleImage(optimizedPrompt, {
      width,
      height,
      referenceImage: refImage,
    });

    return res.status(200).json({
      success: true,
      mode: 'image',
      optimizedPrompt,
      promptEngine,
      ...image,
    });
  } catch (error) {
    console.error('[Waffle Generate] Error:', error);
    return res.status(500).json({
      error: 'GENERATION_FAILED',
      message: error.message || 'Görsel/video üretilemedi.',
    });
  }
}
