/**
 * HAN 4.2 Ultra Core – Modül AI Çağrı Fonksiyonları
 * DeepSeek API kullanarak 4 modülün içeriklerini üretir
 */

import OpenAI from "openai";
import { getQwenConfig } from "./qwen-api.js";

/**
 * Verilen sohbet geçmişiyle birlikte Qwen'e istek atar
 * @param {Array} messages - [{role, content}] formatında mesajlar
 * @param {number} maxTokens
 * @returns {object} - AI yanıtı (JSON)
 */
async function callQwenModel(messages, maxTokens = 3000) {
  const qwenConfig = getQwenConfig();
  let apiKey = qwenConfig.apiKey;
  let baseURL = qwenConfig.baseURL;
  let model = qwenConfig.model;

  // Fallback to OpenRouter free models if mock
  if (qwenConfig.provider === 'mock') {
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey && openrouterKey.trim() !== "" && !openrouterKey.includes("YourOpenRouterKeyHere")) {
      apiKey = openrouterKey.trim();
      baseURL = "https://openrouter.ai/api/v1";
      model = "qwen/qwen-2.5-72b-instruct";
    } else {
      throw new Error("Qwen API anahtarı ayarlanmamış. Lütfen .env.local dosyasında DASHSCOPE_API_KEY veya OPENROUTER_API_KEY tanımlayın.");
    }
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
    defaultHeaders: baseURL.includes("openrouter.ai") ? {
      "HTTP-Referer": "https://han-ai.dev/",
      "X-Title": "Life Coach AI"
    } : {}
  });

  const completion = await client.chat.completions.create({
    model: model,
    messages,
    temperature: 0.7,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });
  const raw = completion.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    return { error: "JSON parse hatası", raw };
  }
}

// ─────────────────────────────────────────────────────────────
// 🎯 Hedef Planla – Mikro Adımlar + YouTube Önerileri
// ─────────────────────────────────────────────────────────────
export async function generateTargetPlan({ targetText, chatHistory = [] }) {
  const systemPrompt = `Sen HAN 4.2 – Türkçe konuşan bir hedef koçusun.
Kullanıcının hedefini analiz et ve JSON formatında şunu döndür:
{
  "microSteps": [
    { "id": "1", "text": "adım metni", "completed": false, "xpReward": 25, "estimatedMinutes": 30 }
  ],
  "motivation": "kısa motivasyon cümlesi",
  "youtubeSearchQuery": "İngilizce YouTube arama terimi"
}
Mikro adımlar 4-7 adet olmalı. Her adım somut ve yapılabilir olmalı. XP ödülleri 15-50 arası olmalı.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: `Hedefim: "${targetText}"\n\nBu hedef için mikro adımlar oluştur.` },
  ];

  return callQwenModel(messages, 2000);
}

// ─────────────────────────────────────────────────────────────
// ⚡ Üretkenlik Sistemi – Haftalık Takvim + Rutinler
// ─────────────────────────────────────────────────────────────
export async function generateProductivityPlan({ peakHours, focusHours, techniques, chatHistory = [] }) {
  const systemPrompt = `Sen HAN 4.2 – Türkçe konuşan bir üretkenlik uzmanısın.
Kullanıcının verilerine göre kişiselleştirilmiş bir haftalık takvim oluştur.
JSON formatında döndür:
{
  "weeklySchedule": [
    {
      "day": "Pazartesi",
      "blocks": [
        { "start": "09:00", "end": "11:30", "task": "Derin Çalışma Bloku", "type": "deep_work", "color": "#8a2be2" },
        { "start": "12:00", "end": "13:00", "task": "Öğle Molası", "type": "break", "color": "#10b981" }
      ]
    }
  ],
  "routines": [
    { "title": "Sabah Ritüeli", "time": "07:00", "description": "5 dk meditasyon + hedef belirleme", "icon": "🌅" }
  ],
  "tips": ["ipucu 1", "ipucu 2"],
  "weeklyGoalHours": 40
}
Her gün için 4-6 zaman bloğu oluştur. Türkçe gün isimleri kullan.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    {
      role: "user",
      content: `Zirve saatlerim: ${peakHours}\nGünlük odak: ${focusHours} saat\nTeknikler: ${techniques.join(", ")}\n\nBenim için haftalık program oluştur.`,
    },
  ];

  return callQwenModel(messages, 3000);
}

// ─────────────────────────────────────────────────────────────
// 🚀 Startup Yol Haritası – MVP + Pazar Analizi
// ─────────────────────────────────────────────────────────────
export async function generateStartupRoadmap({ ideaDescription, chatHistory = [] }) {
  const systemPrompt = `Sen HAN 4.2 – Türkçe konuşan bir startup danışmanısın.
Kullanıcının iş fikrini analiz et. JSON formatında döndür:
{
  "mvpSteps": [
    {
      "phase": 1,
      "title": "Aşama Adı",
      "duration": "2 Hafta",
      "tasks": ["görev 1", "görev 2"],
      "tools": ["araç 1", "araç 2"],
      "milestone": "tamamlanınca ne olur"
    }
  ],
  "techStack": {
    "frontend": "Next.js / React",
    "backend": "Node.js / Express",
    "database": "PostgreSQL",
    "deployment": "Vercel + Railway",
    "extras": ["Stripe", "Supabase"]
  },
  "marketAnalysis": {
    "tam": "Toplam Pazar (milyar TL)",
    "sam": "Hizmet Edilebilir Pazar",
    "som": "Ulaşılabilir Pazar",
    "competitors": [{"name": "rakip", "strength": "güçlü yan", "weakness": "zayıf yan"}],
    "advantages": ["avantaj 1", "avantaj 2"],
    "targetAudience": "hedef kitle"
  },
  "summary": "kısa özet"
}
MVP aşamaları 4-6 olmalı. Pazar analizi Türkiye odaklı olsun.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: `Startup fikrim: "${ideaDescription}"\n\nYol haritası oluştur.` },
  ];

  return callQwenModel(messages, 4000);
}

// ─────────────────────────────────────────────────────────────
// ⚖️ Karar Analizi – Pro/Con + Risk + Senaryo
// ─────────────────────────────────────────────────────────────
export async function generateDecisionAnalysis({ dilemma, chatHistory = [] }) {
  const systemPrompt = `Sen HAN 4.2 – Türkçe konuşan bir karar analizi uzmanısın.
Kullanıcının ikilemi için kapsamlı analiz yap. JSON formatında döndür:
{
  "proConAnalysis": {
    "optionA": {
      "label": "Seçenek A'nın adı",
      "pros": [{"text": "artı madde", "weight": 8}],
      "cons": [{"text": "eksi madde", "weight": 5}],
      "totalScore": 75
    },
    "optionB": {
      "label": "Seçenek B'nin adı",
      "pros": [{"text": "artı madde", "weight": 9}],
      "cons": [{"text": "eksi madde", "weight": 3}],
      "totalScore": 82
    }
  },
  "riskMatrix": [
    { "risk": "Risk adı", "probability": "Yüksek", "impact": "Orta", "mitigation": "Azaltma stratejisi", "level": "high" }
  ],
  "timelineScenarios": {
    "threeMonth": { "optionA": "3 ay sonra A seçilirse...", "optionB": "3 ay sonra B seçilirse..." },
    "sixMonth": { "optionA": "6 ay senaryosu A", "optionB": "6 ay senaryosu B" },
    "twelveMonth": { "optionA": "12 ay senaryosu A", "optionB": "12 ay senaryosu B" }
  },
  "recommendation": "HAN'ın önerisi",
  "recommendedOption": "A veya B"
}
Weight değerleri 1-10 arası, totalScore 0-100 arası. Risk level: low|medium|high|critical.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: `İkilemim: "${dilemma}"\n\nKarar analizi yap.` },
  ];

  return callQwenModel(messages, 4000);
}

// ─────────────────────────────────────────────────────────────
// Mock verileri – API key yokken kullan
// ─────────────────────────────────────────────────────────────
export function getMockTargetPlan(targetText) {
  return {
    microSteps: [
      { id: "1", text: `${targetText} için gerekli kaynakları topla`, completed: false, xpReward: 20, estimatedMinutes: 15 },
      { id: "2", text: "Çalışma ortamını hazırla ve dikkat dağıtıcıları kapat", completed: false, xpReward: 15, estimatedMinutes: 10 },
      { id: "3", text: "İlk 25 dakikalık Pomodoro seansını başlat", completed: false, xpReward: 30, estimatedMinutes: 25 },
      { id: "4", text: "Öğrendiklerini not al ve özetle", completed: false, xpReward: 25, estimatedMinutes: 10 },
      { id: "5", text: "Pratik uygulama yap ve test et", completed: false, xpReward: 40, estimatedMinutes: 30 },
      { id: "6", text: "Günün sonunda ilerlemeyi değerlendir", completed: false, xpReward: 20, estimatedMinutes: 10 },
    ],
    motivation: "Her büyük başarı, küçük adımların birikimidir. Bugün atılacak her adım seni bir adım öne taşır! 🚀",
    youtubeSearchQuery: "productivity deep work tutorial",
  };
}
