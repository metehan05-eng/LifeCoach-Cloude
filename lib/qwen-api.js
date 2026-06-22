import OpenAI from "openai";

/**
 * Returns Qwen client configuration based on available environment variables.
 * Prioritizes: QWEN_API_KEY -> DASHSCOPE_API_KEY -> OPENROUTER_API_KEY
 */
export function getQwenConfig() {
  const qwenKey = process.env.QWEN_API_KEY;
  const qwenBaseUrl = process.env.QWEN_BASE_URL;
  const qwenModel = process.env.QWEN_MODEL;

  const dashscopeKey = process.env.DASHSCOPE_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  // 1. Explicit generic Qwen settings
  if (qwenKey && qwenKey.trim() !== "" && !qwenKey.includes("PLACEHOLDER")) {
    return {
      apiKey: qwenKey.trim(),
      baseURL: qwenBaseUrl?.trim() || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      model: qwenModel?.trim() || "qwen-plus",
      provider: "qwen-generic"
    };
  }

  // 2. DashScope API settings
  if (dashscopeKey && dashscopeKey.trim() !== "" && !dashscopeKey.includes("PLACEHOLDER")) {
    return {
      apiKey: dashscopeKey.trim(),
      baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      model: qwenModel?.trim() || "qwen-plus",
      provider: "dashscope"
    };
  }

  // 3. OpenRouter API settings
  if (openrouterKey && openrouterKey.trim() !== "" && !openrouterKey.includes("YourOpenRouterKeyHere")) {
    return {
      apiKey: openrouterKey.trim(),
      baseURL: "https://openrouter.ai/api/v1",
      model: qwenModel?.trim() || "qwen/qwen-2.5-72b-instruct",
      provider: "openrouter"
    };
  }

  // Fallback / Mock mode when no keys are found
  return {
    apiKey: "mock-key",
    baseURL: "http://localhost/mock",
    model: "qwen-plus",
    provider: "mock"
  };
}

/**
 * Calls the Qwen model using OpenAI compatible SDK.
 */
export async function callQwen(messages, options = {}) {
  const config = getQwenConfig();

  if (config.provider === "mock") {
    // If no keys configured, throw a clear instruction error.
    throw new Error(
      "Qwen API anahtarı ayarlanmamış. Lütfen .env.local dosyasında DASHSCOPE_API_KEY, QWEN_API_KEY veya OPENROUTER_API_KEY tanımlayın."
    );
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    defaultHeaders: config.provider === "openrouter" ? {
      "HTTP-Referer": "https://han-ai.dev/",
      "X-Title": "Life Coach AI"
    } : {}
  });

  const model = options.model || config.model;

  const requestParams = {
    model: model,
    messages: messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 2000,
  };

  if (options.response_format) {
    requestParams.response_format = options.response_format;
  }

  const completion = await client.chat.completions.create(requestParams);
  return completion.choices?.[0]?.message?.content || "";
}
