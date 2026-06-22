import { HfInference } from '@huggingface/inference';
import OpenAI from 'openai';

const HF_TOKEN = process.env.HF_TOKEN;
const HF_PROVIDER = process.env.HF_WAFFLE_PROVIDER || process.env.HF_PROVIDER || 'auto';

export const WAFFLE_MODELS = {
  prompt: process.env.HF_WAFFLE_PROMPT_MODEL || 'Qwen/Qwen2.5-72B-Instruct',
  promptVision: process.env.HF_WAFFLE_VISION_PROMPT_MODEL || 'Qwen/Qwen2-VL-7B-Instruct',
  textToImage: process.env.HF_WAFFLE_IMAGE_MODEL || 'black-forest-labs/FLUX.1-dev',
  imageTextToImage: process.env.HF_WAFFLE_IMAGE_REF_MODEL || 'black-forest-labs/FLUX.2-dev',
  textToVideo: process.env.HF_WAFFLE_TEXT_VIDEO_MODEL || 'Lightricks/LTX-Video',
  imageTextToVideo: process.env.HF_WAFFLE_VIDEO_MODEL || 'Lightricks/LTX-Video',
  imageToVideo: process.env.HF_WAFFLE_I2V_MODEL || 'Wan-AI/Wan2.1-I2V-14B-720P',
};

const PROMPT_SYSTEM = `You are an elite AI art director and prompt engineer for FLUX, SDXL, and cinematic video models.
Your job: translate the user's idea (any language) into ONE highly detailed English generation prompt.

Rules:
- Preserve the user's core subject, mood, and intent exactly — never swap concepts (forest stays forest, not city).
- Add professional quality tags: masterpiece, ultra detailed, cinematic lighting, sharp focus, coherent composition.
- For photos: photorealistic, 8k, natural colors. For art: name the style clearly (surreal, anime, oil painting, etc.).
- For video prompts: mention motion, camera movement, atmosphere, and temporal flow.
- Output ONLY the final English prompt. No quotes, no labels, no explanation.`;

const hf = HF_TOKEN ? new HfInference(HF_TOKEN) : null;

function withProvider(args) {
  if (HF_PROVIDER && HF_PROVIDER !== 'auto') {
    args.provider = HF_PROVIDER;
  }
  return args;
}

export function getAspectDimensions(aspect = '1:1') {
  if (aspect === '16:9') return { width: 1280, height: 720 };
  if (aspect === '9:16') return { width: 720, height: 1280 };
  return { width: 1024, height: 1024 };
}

export function parseBase64Image(imageData) {
  if (!imageData || typeof imageData !== 'string') return null;
  const match = imageData.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  const mime = match ? match[1] : 'image/jpeg';
  const base64 = match ? match[2] : imageData.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  const blob = new Blob([buffer], { type: mime });
  return { buffer, mime, blob, base64 };
}

export async function blobToDataUrl(blob, fallbackMime = 'application/octet-stream') {
  const buffer = Buffer.from(await blob.arrayBuffer());
  const mime = blob.type || fallbackMime;
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function cleanPromptText(text) {
  return (text || '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^(prompt|recipe|görsel tarifi|optimized prompt)\s*:\s*/gi, '')
    .trim();
}

async function optimizeWithGroq(prompt, mode = 'image') {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY ayarlı değil.');

  const groq = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' });
  const completion = await groq.chat.completions.create({
    model: 'qwen-2.5-coder-32b',
    messages: [
      { role: 'system', content: PROMPT_SYSTEM },
      {
        role: 'user',
        content: `Mode: ${mode}\nUser request: ${prompt}\n\nPerfect generation prompt:`,
      },
    ],
    temperature: 0.6,
    max_tokens: 600,
  });
  return cleanPromptText(completion.choices?.[0]?.message?.content);
}

async function optimizeWithHF(prompt, { referenceImage, mode = 'image' } = {}) {
  if (!hf) throw new Error('HF_TOKEN ayarlı değil.');

  const ref = referenceImage ? parseBase64Image(referenceImage) : null;
  const userContent = ref
    ? [
        {
          type: 'text',
          text: `Mode: ${mode}\nUser creative request: ${prompt}\n\nAnalyze the reference image (style, palette, subject, lighting) and write the perfect English generation prompt:`,
        },
        { type: 'image_url', image_url: { url: `data:${ref.mime};base64,${ref.base64}` } },
      ]
    : `Mode: ${mode}\nUser request: ${prompt}\n\nPerfect generation prompt:`;

  const completion = await hf.chatCompletion(withProvider({
    model: ref ? WAFFLE_MODELS.promptVision : WAFFLE_MODELS.prompt,
    messages: [
      { role: 'system', content: PROMPT_SYSTEM },
      { role: 'user', content: userContent },
    ],
    max_tokens: 600,
    temperature: 0.6,
  }));

  const content = completion?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('HF prompt optimizer boş yanıt döndürdü.');
  return cleanPromptText(content);
}

export async function optimizeWafflePrompt(prompt, options = {}) {
  const { referenceImage = null, mode = 'image' } = options;
  const basePrompt = (prompt || '').trim();
  if (!basePrompt && !referenceImage) {
    throw new Error('Prompt veya referans görsel gerekli.');
  }

  try {
    const optimized = await optimizeWithHF(basePrompt || 'Reimagine this reference beautifully', { referenceImage, mode });
    if (optimized) return { optimizedPrompt: optimized.slice(0, 1200), engine: 'huggingface' };
  } catch (hfErr) {
    console.warn('[Waffle HF] Prompt optimize failed, trying Groq:', hfErr.message);
  }

  try {
    const optimized = await optimizeWithGroq(
      referenceImage
        ? `${basePrompt || 'Reimagine this reference image beautifully'} (preserve reference style, composition and palette)`
        : basePrompt,
      mode
    );
    if (optimized) return { optimizedPrompt: optimized.slice(0, 1200), engine: 'groq' };
  } catch (groqErr) {
    console.warn('[Waffle Groq] Prompt optimize failed:', groqErr.message);
  }

  try {
    const { callQwen } = await import('./qwen-api.js');
    const systemPrompt = `You are an elite AI art director and prompt engineer. Translate user idea to ONE highly detailed English generation prompt. Output ONLY the prompt.`;
    const userPrompt = `Mode: ${mode}\nUser request: ${basePrompt}\n\nPerfect generation prompt:`;
    const optimized = await callQwen([{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], { max_tokens: 600 });
    if (optimized) return { optimizedPrompt: optimized.slice(0, 1200), engine: 'qwen' };
  } catch (qwenErr) {
    console.warn('[Waffle Qwen API] Prompt optimize failed:', qwenErr.message);
  }

  const fallback = `${basePrompt || 'artistic scene'}, masterpiece, ultra detailed, cinematic lighting, 8k, sharp focus`;
  return { optimizedPrompt: fallback.slice(0, 1200), engine: 'fallback' };
}

export function getPollinationsImageUrl(prompt, { width = 1024, height = 1024, seed = Math.floor(Math.random() * 1e6) } = {}) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;
}

export async function generateWaffleImage(optimizedPrompt, options = {}) {
  const { width = 1024, height = 1024, referenceImage = null, seed = Math.floor(Math.random() * 1e6) } = options;
  const prompt = (optimizedPrompt || '').trim();
  if (!prompt) throw new Error('Optimized prompt boş.');

  if (hf) {
    try {
      const ref = referenceImage ? parseBase64Image(referenceImage) : null;
      let blob;

      if (ref) {
        blob = await hf.imageTextToImage(withProvider({
          model: WAFFLE_MODELS.imageTextToImage,
          inputs: ref.blob,
          parameters: {
            prompt,
            num_inference_steps: 28,
            guidance_scale: 3.5,
            seed,
            target_size: { width, height },
          },
        }));
      } else {
        blob = await hf.textToImage(withProvider({
          model: WAFFLE_MODELS.textToImage,
          inputs: prompt,
          parameters: {
            width,
            height,
            num_inference_steps: 28,
            guidance_scale: 3.5,
            seed,
          },
        }), { outputType: 'blob' });
      }

      const dataUrl = await blobToDataUrl(blob, 'image/png');
      return {
        url: dataUrl,
        mediaType: 'image',
        model: ref ? WAFFLE_MODELS.imageTextToImage : WAFFLE_MODELS.textToImage,
        provider: 'huggingface',
      };
    } catch (hfErr) {
      console.warn('[Waffle HF] Image generation failed, Pollinations fallback:', hfErr.message);
    }
  }

  const pollUrl = getPollinationsImageUrl(prompt, { width, height, seed });
  return {
    url: pollUrl,
    mediaType: 'image',
    model: 'pollinations/flux',
    provider: 'pollinations',
  };
}

export async function generateWaffleVideo(optimizedPrompt, options = {}) {
  const { referenceImage = null, width = 1280, height = 720, seed = Math.floor(Math.random() * 1e6) } = options;
  const prompt = (optimizedPrompt || '').trim();
  if (!hf) throw new Error('Video üretimi için HF_TOKEN gerekli.');

  const ref = referenceImage ? parseBase64Image(referenceImage) : null;
  let videoBlob;

  if (ref && prompt) {
    videoBlob = await hf.imageTextToVideo(withProvider({
      model: WAFFLE_MODELS.imageTextToVideo,
      inputs: ref.blob,
      parameters: {
        prompt,
        num_inference_steps: 30,
        guidance_scale: 3.5,
        num_frames: 49,
        seed,
        target_size: { width, height },
      },
    }));
  } else if (ref) {
    videoBlob = await hf.imageToVideo(withProvider({
      model: WAFFLE_MODELS.imageToVideo,
      inputs: ref.blob,
      parameters: { seed },
    }));
  } else if (prompt) {
    videoBlob = await hf.textToVideo(withProvider({
      model: WAFFLE_MODELS.textToVideo,
      inputs: prompt,
      parameters: {
        num_inference_steps: 30,
        guidance_scale: 3.5,
        num_frames: 49,
        seed,
      },
    }));
  } else {
    throw new Error('Video için prompt veya referans görsel gerekli.');
  }

  const dataUrl = await blobToDataUrl(videoBlob, 'video/mp4');
  return {
    url: dataUrl,
    mediaType: 'video',
    model: ref ? WAFFLE_MODELS.imageTextToVideo : WAFFLE_MODELS.textToVideo,
    provider: 'huggingface',
  };
}
