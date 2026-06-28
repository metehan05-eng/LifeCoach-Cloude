import {
  optimizeWafflePrompt,
  generateWaffleImage,
  getAspectDimensions,
} from '../../lib/waffle-hf.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '24mb',
    },
  },
  maxDuration: 120,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { images = [], instruction = '', aspect = '1:1' } = req.body || {};

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'En az bir referans görsel gerekli.' });
  }
  if (!instruction?.trim()) {
    return res.status(400).json({ error: 'Birleştirme talimatı gerekli.' });
  }

  try {
    // The HF pipeline conditions on a single reference image; use the first as
    // the visual anchor and fold the remaining count + the user instruction into
    // the optimization prompt so the result reflects the requested blend.
    const primaryReference = images[0];
    const blendPrompt = images.length > 1
      ? `Combine ${images.length} reference images into one cohesive scene. ${instruction.trim()}`
      : instruction.trim();

    const { optimizedPrompt, engine: promptEngine } = await optimizeWafflePrompt(blendPrompt, {
      referenceImage: primaryReference,
      mode: 'image',
    });

    const { width, height } = getAspectDimensions(aspect);

    const image = await generateWaffleImage(optimizedPrompt, {
      width,
      height,
      referenceImage: primaryReference,
    });

    return res.status(200).json({
      success: true,
      mode: 'image',
      optimizedPrompt,
      promptEngine,
      ...image,
    });
  } catch (error) {
    console.error('[Waffle Combine] Error:', error);
    return res.status(500).json({
      error: 'COMBINE_FAILED',
      message: error.message || 'Görseller birleştirilemedi.',
    });
  }
}
