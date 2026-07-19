/**
 * HAN 4.2 Ultra Core – Modül AI Çağrı Fonksiyonları
 * Qwen model chain ile hızlı fallback sistemi
 */

import OpenAI from "openai";
import { getQwenConfig } from "./qwen-api.js";

/**
 * Qwen model chain ile JSON yanıt döndürür.
 * Hızlı modeller önce denenir, başarısız olursa sonraki modele geçer.
 * @param {Array} messages - [{role, content}] formatında mesajlar
 * @param {number} maxTokens
 * @returns {object} - AI yanıtı (JSON)
 */
async function callQwenModel(messages, maxTokens = 3000, options = {}) {
  const { disableTools = false } = options;
  const qwenConfig = getQwenConfig();
  const envModels = (process.env.QWEN_API_MODELS || '').split('|').filter(Boolean);
  const MODEL_CHAIN = [
    ...envModels,
    'qwen-turbo',
    'qwen-flash',
    'qwen-plus',
    qwenConfig.model,
    'qwen3.7-plus',
    'qwen/qwen-2.5-72b-instruct',
    'qwen/qwen-2.5-72b-instruct:free'
  ].filter((m, i, self) => m && self.indexOf(m) === i);

  let lastError = null;

  for (const modelName of MODEL_CHAIN) {
    try {
      let apiKey = qwenConfig.apiKey;
      let baseURL = qwenConfig.baseURL;

      if (qwenConfig.provider === 'mock') {
        const openrouterKey = process.env.OPENROUTER_API_KEY;
        if (openrouterKey && openrouterKey.trim() !== "" && !openrouterKey.includes("YourOpenRouterKeyHere")) {
          apiKey = openrouterKey.trim();
          baseURL = "https://openrouter.ai/api/v1";
        } else {
          throw new Error("Qwen API anahtarı ayarlanmamış");
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const completion = await client.chat.completions.create({
          model: modelName,
          messages,
          temperature: 0.7,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
          ...(disableTools ? { tools: [], parallel_tool_calls: false } : {}),
        }, { signal: controller.signal });

        clearTimeout(timeoutId);

        const raw = completion.choices?.[0]?.message?.content || "";
        if (!raw || raw === "{}") {
          throw new Error("Boş yanıt");
        }
        try {
          return JSON.parse(raw);
        } catch {
          throw new Error("JSON parse hatası");
        }
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    } catch (err) {
      const msg = err.name === 'AbortError' ? 'zaman aşımı' : err.message;
      console.warn(`[modules-ai] ❌ ${modelName} başarısız: ${msg}`);
      lastError = err;
    }
  }

  console.error("[modules-ai] 💥 Tüm modeller başarısız");
  return { error: "AI_UNAVAILABLE", details: lastError?.message };
}

// ─────────────────────────────────────────────────────────────
// 🎯 Hedef Planla – n8n Tarzı Akış Şeması + Haftalık Program
// ─────────────────────────────────────────────────────────────
export async function generateTargetPlan({ targetText, chatHistory = [] }) {
  const systemPrompt = `Sen HAN 4.2 – Türkçe konuşan bir hedef koçusun. Görevin: kullanıcının hedefini derinlemesine analiz edip SADECE bir JSON planı üretmek.
Kesinlikle internet araması YAPMA, video önerme, link/referans verme, kaynak gösterme, harici araç çağırma veya web'den bilgi toplama girişiminde BULUNMA.

KATI KISITLAMALAR:
- Yanıtında KESİNLİKLE markdown kod blokları, giriş metni, kapanış metni, düz yazı, yorum satırı veya ekstra metin BULUNMAMALIDIR.
- INTERNET ARAMASI YAPMAK, VİDEO ÖNERMEK, LİNK VERMEK, KAYNAK GÖSTERMEK KESİNLİKLE YASAKTIR.
- Çıktın SADECE aşağıdaki JSON şemasına birebir uyan, doğrudan JSON.parse() ile çözülebilecek ham bir JSON string olmalıdır.
- Herhangi bir URL, video ID'si, "izle", "ara", "youtube" kelimesi JSON içinde geçerse sistem çöker.

Üretilecek JSON formatı (sadece bu):
{
  "summary": "Hedefin derinlemesine analizi, kullanıcıyı motive eden ve stratejiyi açıklayan en az 3-4 cümlelik düz metin özet.",
  "steps": [
    {
      "order": 1,
      "title": "Aşamanın Kısa ve Net Başlığı (akış şeması kutucuğunun üstünde görünecek)",
      "description": "Kullanıcı bu aşamada ne yapması gerektiğini detaylandıran teknik ve pratik açıklama metni."
    }
  ],
  "weeklyPlans": [
    {
      "weekNumber": "1. Hafta",
      "focus": "O haftanın ana odak noktası veya teması",
      "tasks": "O hafta tamamlanması gereken mikro görevlerin listesi veya detaylı açıklaması."
    }
  ]
}

Hedefleri bölerken mantıklı, gerçekçi ve uygulanabilir adımlar seç. Steps 4-7 adım olmalı. WeeklyPlans 2-4 hafta olmalı.
Hatırlatma: Sadece yukarıdaki JSON'ı üret, başka hiçbir şey yapma. Video arama, web arama, kaynak gösterme yok.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: `Hedefim: "${targetText}"\n\nSadece JSON formatında plan üret. Web arama, video önerme veya link verme KESİNLİKLE YASAK.` },
  ];

  return callQwenModel(messages, 3000, { disableTools: true });
}

// ─────────────────────────────────────────────────────────────
// ⚡ Üretkenlik Sistemi – Haftalık Takvim + Rutinler
// ─────────────────────────────────────────────────────────────
export async function generateProductivityPlan({ peakHours, focusHours, techniques, chatHistory = [] }) {
  const systemPrompt = `Sen HAN 4.2 – Türkçe konuşan bir üretkenlik uzmanısın.
Kullanıcının verilerine göre kişiselleştirilmiş bir günlük üretkenlik sistemi oluştur.
SADECE aşağıdaki JSON şemasını kullan, ekstra alan ekleme:

{
  "routines": {
    "morning": ["07:00 - Uyanma ritüeli: 5 dk nefes + hedef belirleme", "07:15 - 20 dk okuma", "07:45 - Hafif egzersiz"],
    "afternoon": ["12:30 - 30 dk öğle molası (ekran yok)", "15:00 - 5 dk hareket molası"],
    "evening": ["20:00 - Dijital detoks başlangıcı", "21:00 - Gün değerlendirme", "22:00 - Uyku hazırlığı"]
  },
  "timeBlocks": [
    { "time": "08:00 - 10:00", "label": "Derin Odak Bloku (Ana proje)", "type": "focus" },
    { "time": "10:00 - 10:15", "label": "Mola", "type": "break" },
    { "time": "10:15 - 12:00", "label": "İkinci Odak Bloku", "type": "focus" },
    { "time": "12:00 - 13:00", "label": "Öğle Arası", "type": "break" },
    { "time": "13:00 - 14:00", "label": "Hafif Görevler / E-posta", "type": "routine" },
    { "time": "14:00 - 15:30", "label": "Öğleden Sonra Odak Bloku", "type": "focus" },
    { "time": "15:30 - 15:45", "label": "Mola", "type": "break" },
    { "time": "15:45 - 17:00", "label": "Tamamlama ve Planlama", "type": "routine" }
  ],
  "rules": [
    "İlk 30 dk telefona bakma — beynini uyandır",
    "Her odak bloku öncesi 2 dk hedefini yaz",
    "Mola anında ekrana değil, pencereye bak",
    "Günde en fazla 3 büyük karar al"
  ],
  "peakHours": "${peakHours}",
  "focusHours": ${focusHours},
  "selectedMethods": ${JSON.stringify(techniques)}
}

Kurallar (rules) 4-6 madde olmalı; madde metinleri kısa, net ve motive edici olsun.
Zaman blokları (timeBlocks) en az 6, en fazla 10 blok olmalı.
Rutinler sabah 3-4, öğle 1-2, akşam 3-4 madde içermeli.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    {
      role: "user",
      content: `Zirve saatlerim: ${peakHours}\nGünlük odak: ${focusHours} saat\nTeknikler: ${techniques.join(", ")}\n\nBenim için günlük üretkenlik sistemi oluştur.`,
    },
  ];

  return callQwenModel(messages, 4000, { disableTools: true });
}

// ─────────────────────────────────────────────────────────────
// 🚀 Startup Yol Haritası – Analiz + MVP Fazları + Yalın Kanvas
// ─────────────────────────────────────────────────────────────
export async function generateStartupRoadmap({ ideaDescription, chatHistory = [] }) {
  const systemPrompt = `Sen HAN 4.2 – Türkçe konuşan bir startup danışmanısın.
Kullanıcının iş fikrini analiz et. SADECE aşağıdaki JSON şemasını kullan, ekstra alan ekleme:

{
  "analysis": {
    "valueProp": "Girişimin ana değer önerisi — hangi problemi nasıl çözüyor, neden farklı?",
    "targetAudience": "Hedef kitle tanımı — demografik, psikografik ve davranışsal özellikler.",
    "techStack": ["Next.js / React", "Node.js / Express", "PostgreSQL", "Vercel"]
  },
  "mvpPhases": [
    {
      "phase": "Faz 1: MVP Çekirdeği",
      "title": "Temel Özelliklerin İnşası",
      "tasks": ["Kullanıcı girişi ve profil yönetimi", "Ana işlevsellik (CRUD) API", "Frontend arayüz entegrasyonu", "Temel test ve hata düzeltme"]
    }
  ],
  "leanCanvas": {
    "problems": ["Hedef kitlenin yaşadığı en büyük sorun 1", "Sorun 2", "Sorun 3"],
    "solutions": ["Çözüm 1 — probleme doğrudan yanıt", "Çözüm 2 — tamamlayıcı özellik"],
    "revenues": ["Freemium / Abonelik modeli", "Reklam geliri veya komisyon"],
    "costs": ["Sunucu ve altyapı maliyeti", "Geliştirici maaşları", "Pazarlama bütçesi"]
  }
}

MVP fazları 3-5 arası olmalı. Her fazda 3-6 görev (tasks) bulunmalı.
Lean Canvas maddeleri kısa, net ve girişime özgü olmalı. Türkiye pazarı odaklı düşün.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: `Startup fikrim: "${ideaDescription}"\n\nYol haritası oluştur.` },
  ];

  return callQwenModel(messages, 5000);
}

// ─────────────────────────────────────────────────────────────
// ⚖️ Karar Analizi – Pro/Con + Risk + Senaryo
// ─────────────────────────────────────────────────────────────
export async function generateDecisionAnalysis({ dilemma, chatHistory = [] }) {
  const systemPrompt = `Sen HAN 4.2 – Türkçe konuşan bir karar ve strateji danışmanısın.
Kullanıcı bir iş, görev, proje veya karar ikilemi paylaşacak. Senin görevin:
1. Durumu kısa bir özetle (summary)
2. En mantıklı 3 seçeneği belirle (optionA, optionB, optionC)
3. Hangisini önerdiğini söyle (recommendation: optionA, optionB veya optionC)
4. Her seçenek için kısa artı/eksi puanlaması yap (prosCons)
5. 3/6/12 aylık gelecek simülasyonu çıkar (simulation)
6. Risk skoru ver (riskScores)
7. Net bir koçluk önerisi yaz (coachVerdict)

SADECE aşağıdaki JSON şemasını kullan, ekstra alan ekleme:

{
  "summary": "Durumun 1-2 cümlelik kısa özeti",
  "optionA": "Seçenek A'nın net adı",
  "optionB": "Seçenek B'nin net adı",
  "optionC": "Seçenek C'nin net adı",
  "recommendation": "En mantıklı seçenek (optionA, optionB veya optionC)",
  "prosCons": {
    "optionA": {
      "pros": [{ "text": "Maddi garanti", "score": 9 }],
      "cons": [{ "text": "Gelişim azlığı", "score": 7 }]
    },
    "optionB": {
      "pros": [{ "text": "Kendi işinin patronu olmak", "score": 10 }],
      "cons": [{ "text": "Gelir belirsizliği", "score": 8 }]
    },
    "optionC": {
      "pros": [{ "text": "Esneklik", "score": 8 }],
      "cons": [{ "text": "Belirsizlik", "score": 6 }]
    }
  },
  "simulation": {
    "optionA": { "m3": "3 ay sonra.", "m6": "6 ay sonra.", "m12": "12 ay sonra." },
    "optionB": { "m3": "3 ay sonra.", "m6": "6 ay sonra.", "m12": "12 ay sonra." },
    "optionC": { "m3": "3 ay sonra.", "m6": "6 ay sonra.", "m12": "12 ay sonra." }
  },
  "riskScores": { "optionA": 30, "optionB": 70, "optionC": 50 },
  "coachVerdict": "LifeCoach AI'ın üç seçeneği de değerlendiren stratejik tavsiyesi."
}

Kurallar:
- summary kısa ve net olmalı
- recommendation mutlaka optionA, optionB veya optionC'den biri olmalı
- pros/cons score 1-10 arası (10 = en önemli)
- Her seçenek için en az 1, en fazla 3 madde
- simulation metinleri 1 cümle, net ve gerçekçi
- riskScores 0-100 arası (0 = risksiz, 100 = çok riskli)
- coachVerdict 2-4 cümle, motive edici ve stratejik`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: `Şu durumu/kararı analiz et: "${dilemma}"\n\n3 seçenekli karar analizi yap, summary ve recommendation mutlaka doldur.` },
  ];

  return callQwenModel(messages, 6000, { disableTools: true });
}

// ─────────────────────────────────────────────────────────────
// Mock verileri – API key yokken kullan
// ─────────────────────────────────────────────────────────────
export function getMockTargetPlan(targetText) {
  return {
    summary: `"${targetText}" hedefi, disiplinli ve yapılandırılmış bir yaklaşımla başarıya ulaştırılabilir. Bu hedefi gerçekleştirmek için öncelikle net bir yol haritası çıkarmak, ardından adım adım ilerlemek gerekir. Aşağıdaki akış şeması, bu hedefe ulaşman için gereken tüm aşamaları görsel bir şekilde sunar. Her aşama bir öncekinin üzerine inşa edilir ve seni başarıya bir adım daha yaklaştırır.`,
    steps: [
      {
        order: 1,
        title: "Hedefi Netleştir ve Parçalara Ayır",
        description: "Hedefini spesifik, ölçülebilir alt hedeflere böl. Öncelikle mevcut durumunu değerlendir ve hedefe ulaşmak için gereken tüm kaynakları (zaman, ekipman, bilgi) belirle. Bir beyin fırtınası yap ve hedefin tüm bileşenlerini bir kağıda dök."
      },
      {
        order: 2,
        title: "Araştırma ve Öğrenme Süreci",
        description: "Hedefinle ilgili gerekli teorik bilgiyi topla. Konuyla ilgili güvenilir kaynaklardan (kitap, makale, video, kurs) en az 3-5 tanesini belirle ve bir çalışma programı oluştur. Öğrendiklerini not alarak kalıcı hale getir."
      },
      {
        order: 3,
        title: "Pratik Uygulama ve Deneme",
        description: "Öğrendiklerini küçük bir proje veya deney üzerinde uygulamaya koy. İlk denemede mükemmel olmayı bekleme; hatalardan ders çıkar ve iteratif olarak geliştir. Her denemede yaptığını kaydet ve neyin işe yaradığını analiz et."
      },
      {
        order: 4,
        title: "Geri Bildirim Topla ve İyileştir",
        description: "Çalışmanı başkalarına göster, geri bildirim al ve eksik yönlerini tespit et. Aldığın geri bildirimleri yapıcı bir şekilde değerlendir ve çalışmanı revize et. Bu süreçte öz-eleştiri yapmaktan çekinme."
      },
      {
        order: 5,
        title: "Sonuçlandır ve Raporla",
        description: "Hedefine ulaştığında tüm süreci belgele. Neler öğrendiğini, hangi zorluklarla karşılaştığını ve bunları nasıl aştığını bir rapor haline getir. Bu rapor ileride benzer hedeflerin için bir referans kaynağı olacak."
      }
    ],
    weeklyPlans: [
      {
        weekNumber: "1. Hafta",
        focus: "Temel Araştırma ve Planlama",
        tasks: "Hedefini netleştir ve yazılı hale getir. Gerekli kaynakları topla (kitaplar, kurslar, araçlar). Haftalık bir çalışma takvimi oluştur ve günde en az 1 saatini bu hedefe ayıracağın zaman bloklarını belirle."
      },
      {
        weekNumber: "2. Hafta",
        focus: "Derin Öğrenme ve İlk Uygulama",
        tasks: "Topladığın kaynakları düzenli olarak çalış. Her gün en az 2 saatini aktif öğrenmeye ayır. Hafta sonuna doğru edindiğin bilgilerle küçük bir uygulama veya alıştırma yap."
      },
      {
        weekNumber: "3. Hafta",
        focus: "Geliştirme ve Geri Bildirim",
        tasks: "İkinci haftadaki uygulamanı geliştir. Bir uzmandan veya topluluktan geri bildirim al. Eksiklerini tespit et ve düzeltmelerini yap. Günlük çalışma süreni 2-3 saate çıkar."
      },
      {
        weekNumber: "4. Hafta",
        focus: "Tamamlama ve Sunum",
        tasks: "Projeni son haline getir. Tüm süreci özetleyen kısa bir rapor veya sunum hazırla. Hedefine ulaştığın için kendini ödüllendir ve bu deneyimden çıkardığın dersleri not al."
      }
    ],
  };
}
