const DASHSCOPE_BASE = 'https://dashscope-intl.aliyuncs.com';
const MULTIMODAL_ENDPOINT = `${DASHSCOPE_BASE}/api/v1/services/aigc/multimodal-generation/generation`;
const TTS_ENDPOINT = `${DASHSCOPE_BASE}/api/v1/services/tts/text-to-speech/text-to-speech`;

function getApiKey() {
  const key = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;
  if (!key || key.includes('PLACEHOLDER') || key.trim() === '') {
    throw new Error('DashScope API anahtarı ayarlanmamış. Qwen Audio için DASHSCOPE_API_KEY gerekli.');
  }
  return key.trim();
}

function convertToMultimodalMessages(messages, audioBase64, userText) {
  const multimodal = [];

  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'assistant' : 'user';
    const text = typeof msg.content === 'string' ? msg.content : '';
    if (text.trim()) {
      multimodal.push({
        role,
        content: [{ text }]
      });
    }
  }

  // Add the current audio message
  const audioContent = [{ audio: `data:audio/wav;base64,${audioBase64}` }];
  if (userText && userText.trim()) {
    audioContent.push({ text: userText });
  }
  multimodal.push({ role: 'user', content: audioContent });

  return multimodal;
}

export async function processAudioWithQwen(audioBase64, messages = [], options = {}) {
  const apiKey = getApiKey();
  const modelName = options.model || 'qwen2-audio';

  const multimodalMessages = convertToMultimodalMessages(messages, audioBase64, options.userText || '');

  const body = {
    model: modelName,
    input: {
      messages: multimodalMessages
    },
    parameters: {
      ...(options.parameters || {})
    }
  };

  const res = await fetch(MULTIMODAL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Qwen Audio hatası: ${data.message || data.code || res.status}`);
  }

  const choices = data.output?.choices;
  if (!choices || choices.length === 0) {
    throw new Error('Qwen Audio yanıt vermedi');
  }

  const content = choices[0]?.message?.content || [];
  const textContent = content.find(c => c.text);
  return textContent?.text || '';
}

export async function qwenTTS(text, options = {}) {
  const apiKey = getApiKey();
  const modelName = options.model || 'qwen-audio-3.0-tts-plus';

  const body = {
    model: modelName,
    input: { text: text.slice(0, 1000) },
    parameters: {
      voice: options.voice || 'longxiaochun',
      format: options.format || 'wav',
      sample_rate: options.sampleRate || 24000,
      rate: options.rate ?? 1.0,
      pitch: options.pitch ?? 1.0,
    },
  };

  const res = await fetch(TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Qwen TTS hatası: ${err.message || err.code || res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await res.json();
    const audioBase64 = data?.output?.audio || data?.data?.audio || data?.audio;
    if (audioBase64) {
      return Buffer.from(audioBase64, 'base64');
    }
    throw new Error('Qwen TTS: JSON yanıtında ses verisi bulunamadı');
  }

  return Buffer.from(await res.arrayBuffer());
}
