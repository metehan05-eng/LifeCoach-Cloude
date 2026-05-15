import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import mammoth from 'mammoth'; 
import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- DuckDuckGo Web Search (Fast & Accurate) ---
async function searchWithDuckDuckGo(query) {
  try {
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const response = await fetch(searchUrl, {
      headers: { 'User-Agent': 'LifeCoach-AI/1.0' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) throw new Error('DuckDuckGo search failed');
    const data = await response.json();
    
    let results = [];
    
    // Instant answer/abstract
    if (data.AbstractText) {
      results.push({
        source: 'DuckDuckGo',
        snippet: data.AbstractText,
        url: data.AbstractURL || ''
      });
    }
    
    // Related topics (up to 3)
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, 3).forEach(topic => {
        if (topic.Text) {
          results.push({
            title: topic.FirstURL ? 'Search Result' : 'Related Topic',
            snippet: topic.Text.substring(0, 200),
            url: topic.FirstURL || ''
          });
        }
      });
    }
    
    return results.length > 0 ? results : null;
  } catch (error) {
    console.error('[DuckDuckGo Search] Error:', error.message);
    return null;
  }
}

// --- Qwen DashScope Service (Singapore Region) ---
async function callQwenDashScope(systemPrompt, userMessages, model = 'qwen-flash', maxTokens = 4096) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY ayarlı değil.');
  
  const dashMessages = [{ role: 'system', content: systemPrompt }];
  for (const msg of userMessages) {
    if (msg.role === 'user') dashMessages.push({ role: 'user', content: msg.content });
    else if (msg.role === 'assistant') dashMessages.push({ role: 'assistant', content: msg.content });
  }

  // Singapore region endpoint (dashscope-intl.aliyuncs.com routes to SG data center)
  const response = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: { messages: dashMessages }, parameters: { result_format: 'message', temperature: 0.7, top_p: 0.8, max_tokens: maxTokens } }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) throw new Error(`Qwen API Error: ${response.status}`);
  const data = await response.json();
  const content = data?.output?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Qwen boş yanıt döndürdü.');
  return content;
}

// --- SUPABASE HAZIRLIĞI ---
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

const BASE_SYSTEM_PROMPT = `You are LifeCoach AI, a personal growth coach who values honesty, real dialogue, and genuine growth.

WHO YOU ARE:
You speak like a thoughtful friend, not a bot. Conversational, warm, and authentic. You believe conversations should feel natural, not scripted.

CORE VALUES:
1. HONESTY FIRST - Never exaggerate, lie, or pretend to know something you don't. If unsure, say "I'm not entirely sure" or "That's outside my expertise."
2. REAL DIALOGUE - Ask thoughtful follow-up questions. Engage genuinely. This is a conversation, not Q&A.
3. GROWTH-FOCUSED - Every interaction moves user forward: clarity, motivation, action, or reflection.
4. LANGUAGE MIRROR - Match user's language (Turkish/English), tone (casual/formal), and energy automatically.
5. NO COERCION - Support without force. Never shame or use aggressive language unless explicitly requested.

TONE EXAMPLES:
Instead of "You need discipline!" → Ask "What's one small thing today that makes tomorrow easier?"
Instead of "You're procrastinating!" → Ask "What's blocking you right now?"
Instead of "Don't make excuses!" → Say "I hear you. What's the real obstacle?"

BEHAVIORAL RULES:
- For greetings, respond naturally and briefly.
- For current information (news, prices, events), use web search for accurate facts.
- Celebrate achievements genuinely. Acknowledge XP gains.
- Decline harmful requests respectfully; suggest safe alternatives.
- Can generate files: PDF, Excel, Word, Code.

FILE GENERATION:
[[FILE_REQUEST: {"type": "pdf|docx|xlsx|code", "filename": "name.ext", "title": "Title", "content": "..."}]]
Confirm: PDF ✅ | Word 📝 | Excel 📊 | Code 💻

Remember: Partner in their journey, not a sergeant. Be real. Be honest. Be human.
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, history, email, sessionId, mode, userLanguage, attachments, deepSearch } = req.body;
    const countryCode = req.headers['x-vercel-ip-country'] || 'Unknown';
    const detectedLang = 'en'; // Force English only

    // 1. KULLANICI VERILERINI CEK (XP, LEVEL, STREAK)
    let userId = null;
    let userName = "User";
    let userStats = { xp: 0, level: 1, streak: 0, nextLevelXp: 100 };

    if (email) {
      try {
        const userData = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, xp: true, level: true, currentStreak: true, totalXp: true, plan: true, usageLimit: true, usageCount: true, lastActiveAt: true }
        });
        if (userData) {
          userId = userData.id;
          userName = userData.name || "Gezgin";

          let updatedUsageCount = userData.usageCount;
          // 5-Saatlik Sıfırlama Mantığı
          if (userData.plan === 'FREE' && userData.lastActiveAt) {
            const hoursSinceLastActive = (new Date() - new Date(userData.lastActiveAt)) / (1000 * 60 * 60);
            if (hoursSinceLastActive >= 5) {
              updatedUsageCount = 0;
            }
          }

          userStats = {
            xp: userData.xp,
            level: userData.level,
            streak: userData.currentStreak,
            nextLevelXp: 100,
            plan: userData.plan,
            usageLimit: userData.usageLimit,
            usageCount: updatedUsageCount
          };
        }
      } catch (e) { console.error("User fetch error:", e); }
    }

    // --- SUBSCRIPTION LIMIT CHECK ---
    if (userId && userStats.plan === 'FREE' && userStats.usageCount >= userStats.usageLimit) {
      return res.status(403).json({
        error: "LIMIT_REACHED",
        message: "Günlük mesaj limitine ulaştın. Sınırsız erişim ve daha güçlü modeller için Premium'a geç!"
      });
    }

    // EĞER SADECE STATS İSTENDİYSE BURADA DUR
    if (req.query.just_stats === 'true') {
      return res.status(200).json({ stats: userStats });
    }

    // 2. DOSYA İŞLEME (PDF, DOCX, XLSX)
    let extractedText = "";
    let imagesForVision = [];

    if (attachments && attachments.length > 0) {
      for (const at of attachments) {
        if (at.type === 'image') {
          imagesForVision.push(at.data);
        } else if (at.type === 'file') {
          const buffer = Buffer.from(at.data, 'base64');
          try {
            if (at.ext === 'PDF') {
              const data = await pdf(buffer);
              extractedText += `\n--- [DOSYA: ${at.name} (PDF)] ---\n${data.text}\n`;
            } else if (at.ext === 'DOCX') {
              const { value } = await mammoth.extractRawText({ buffer });
              extractedText += `\n--- [DOSYA: ${at.name} (WORD)] ---\n${value}\n`;
            } else if (at.ext === 'XLSX') {
              const workbook = xlsx.read(buffer);
              const sheetName = workbook.SheetNames[0];
              const csv = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]);
              extractedText += `\n--- [DOSYA: ${at.name} (EXCEL)] ---\n${csv}\n`;
            }
          } catch (e) {
            console.error(`File parsing error (${at.name}):`, e);
          }
        }
      }
    }

    // 4. SISTEM PROMPT HAZIRLA
let systemInstruction = `You are HAN AI Life Coach. You are disciplined, efficient, and growth-focused.
User Name: ${userName}
User Level: ${userStats.level}
Current XP: ${userStats.xp}/100
Current Streak: ${userStats.streak} days

RULES:
1. Always encourage user growth.
2. When the user says they have achieved a goal, make them feel they earned XP.
3. Tone: Mentor — supportive and adaptive; mirror the user's tone and language automatically. Do NOT default to an aggressive "drill sergeant" tone unless explicitly requested.
4. Detect and mirror the user's language.`;

  // Enforce hard safety rule: never use coercive/drill-sergeant language unless explicitly requested
  systemInstruction += `

HARD RULES:
- NEVER adopt a coercive, shaming, or 'drill sergeant' style unless the request explicitly contains the phrase "drill sergeant" or the field req.body.force_mode === 'drill_sergeant'.
- If the user sends a simple greeting (e.g., "merhaba", "hello"), reply with a neutral, mirror-style greeting only.
- Do NOT issue commands like "No excuses" or demand rituals unless explicitly requested by the user.`;

    // OTOMASYON MODU ÖZEL TALİMATI
    if (req.body.automation_mode) {
      systemInstruction += `
      Şu an "YAŞAM OTOMASYONU" modundasın. 
      Görevin: Kullanıcının rutin isteğini analiz et ve son mesajında ŞU FORMATTA bir JSON objesi döndür:
      [[AUTOMATION_DATA: {"title": "Görev Adı", "time": "HH:MM", "repeat": "daily", "duration": 30} ]]
      Kullanıcıyla normal konuşmaya devam et ama bu JSON'ı mutlaka gizli bir not gibi cevabına ekle.`;
    }
    // By default do NOT inject full gamification status into system prompt to avoid showing levels on first message.
    // If client explicitly requests gamification context include it via `show_gamification` flag in request body.
    let gamificationInjection = '';
    if (req.body && req.body.show_gamification) {
      gamificationInjection = `\n--- GAMIFICATION STATUS ---\nLevel: ${userStats.level}\nXP: ${userStats.xp}/100\nStreak: ${userStats.streak} Days\nAI NOTE: Inform user about their progress and motivate them to level up. E.g.: "Completing this task will get you to Level ${userStats.level + 1}!"`;
    }
    const localizationInjection = `\n\n--- CONTEXT ---\nUser: ${userName}\nLocation: ${countryCode}\nLanguage: ${detectedLang}${gamificationInjection}`;

    // ==========================================
    // WEB SEARCH ENGINE (DuckDuckGo - Fast & Accurate)
    // Only for real-time information queries
    // ==========================================
    let searchSources = [];  // Sources to display to user
    let searchContextInjection = "";

    if (message) {
      const msgLower = message.toLowerCase().trim();

      // Short messages or greetings → skip search
      const isGreeting = /^(merhaba|selam|hi|hello|hey|günaydın|tünaydın|iyi akşam|iyi gece|nasılsın|naber|ne var|how are)/i.test(msgLower);
      const isShortQuery = message.trim().split(/\s+/).length < 4;
      const isPersonalQuestion = /(benim|bana|hedefim|planım|yardım et|ne yapmalıyım|tavsiye|öneri|düşünce|fikir)/i.test(msgLower);

      // Real-time information triggers
      const needsSearch = deepSearch || (!isGreeting && !isShortQuery && !isPersonalQuestion && (
        /(haber|güncel|bugün|dün|yarın|son dakika|son durum|şu an|şimdi|2024|2025|2026|puan durumu|hava durumu|borsa|kripto|bitcoin|ethereum|dolar|euro|altın|gümüş|fiyatı nedir|fiyatları|kimdir|nedir|vizyondaki film|sinema|maç sonucu|maç skoru|transfer|seçim|cumhurbaşkan|başbakan|bakan|deprem|sel|yangın|kaza|olay|teknoloji haberi|yapay zeka haberi|yeni model|çıktı mı|piyasaya çıktı)/i.test(msgLower)
      ));

      if (needsSearch) {
        try {
          const searchQuery = message.replace(/[?!.]\s*$/g, '').substring(0, 100).trim();
          
          console.log(`[WebSearch] 🔍 DuckDuckGo search: "${searchQuery}" (deepSearch: ${deepSearch})`);
          
          const searchResults = await searchWithDuckDuckGo(searchQuery);
          
          if (searchResults && searchResults.length > 0) {
            searchSources = searchResults.slice(0, 5);
            
            // Inject search context into AI prompt
            let searchContext = `\n\n--- REAL-TIME WEB SEARCH RESULTS FOR: "${searchQuery}" ---\n`;
            searchResults.forEach((r, i) => {
              searchContext += `\n[${i + 1}] ${r.title || 'Result'}\n`;
              searchContext += `   ${r.snippet}\n`;
              if (r.url) searchContext += `   URL: ${r.url}\n`;
            });
            searchContext += `\n---\nIncorporate this information naturally into your response. Always cite sources when relevant.\n`;
            
            searchContextInjection = searchContext;
          }
        } catch (error) {
          console.error('[WebSearch] Error during DuckDuckGo search:', error);
          searchContextInjection = ''; // Graceful degradation
        }
      }
    }

    // 10. MODEL FALLBACK CHAIN - Sadece Groq modelleri
    const GROQ_MODEL_CHAIN = [
      "llama-3.3-70b-versatile",  // En güçlü model
      "llama-3.1-8b-instant",     // Hızlı, düşük gecikme
      "mixtral-8x7b-32768"        // Alternatif
    ];
    // API key sadece environment variable'dan alınır - hardcoded yok
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;  // Son çare yedek için
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const dashscopeKey = process.env.DASHSCOPE_API_KEY;

    // OpenRouter Model Zinciri - En İyi Free Modeller (Sırayla Dene)
    const OPENROUTER_MODEL_CHAIN = (process.env.OPENROUTER_MODELS || 
      'google/gemma-3-27b-it:free|google/gemma-4-31b-it:free|meta-llama/openrouter/free|' +
      'openai/gpt-oss-120b:free|openai/gpt-oss-20b:free|meta-llama/llama-3.3-70b-instruct:free|' +
      'liquid/lfm-2.5-1.2b-thinking:free|liquid/lfm-2.5-1.2b-instruct:free'
    ).split('|');

    // Deepseek Model Zinciri (Sırayla Dene) - Free Tier
    const DEEPSEEK_MODEL_CHAIN = [
      'deepseek-chat',
      'deepseek-coder'
    ];

    // SISTEM PROMPT (Arama bağlamı varsa ekle)
    const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${systemInstruction}\n${localizationInjection}${searchContextInjection}\n\nMOD: DOSYA OKUMA AKTIF. Eğer kullanıcı dosya içeriği gönderdiyse, o içeriği en ince detayına kadar analiz et.`;

    // Qwen DashScope Model Zinciri (Chat - Singapore Region)
    const QWEN_MODEL_CHAIN = (process.env.QWEN_MODELS || 'qwen-flash|qwen3.6-flash').split('|');

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || ""
      }))
    ];

    // Kullanıcı mesajına dosya metinlerini ekle
    let finalUserContent = message || "";
    if (extractedText) {
      finalUserContent += `\n\nEkli Dosya İçerikleri:\n${extractedText}`;
    }

    const hasImages = imagesForVision && imagesForVision.length > 0;
    if (hasImages) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: finalUserContent },
          ...imagesForVision.map(img => ({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${img}` }
          }))
        ]
      });
    } else {
      messages.push({ role: "user", content: finalUserContent });
    }

    // ── OpenRouter API Çağrısı (Model Zinciri) ──
    async function tryOpenRouterModel(modelName) {
      if (!openrouterKey) throw new Error("OPENROUTER_API_KEY ayarlı değil.");
      
      const client = new OpenAI({ 
        apiKey: openrouterKey.trim(), 
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://lifecoach.ai",
          "X-Title": "LifeCoach AI"
        }
      });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const completion = await client.chat.completions.create({
          model: modelName,
          messages: messages,
          temperature: 0.5,
          max_tokens: 4096,
          stream: false
        }, { signal: controller.signal });

        clearTimeout(timeoutId);

        const content = completion.choices?.[0]?.message?.content?.trim();
        if (!content) throw new Error("OpenRouter boş yanıt döndürdü.");
        return content;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    // ── Deepseek API Çağrısı (Model Zinciri) ──
    async function tryDeepseekModel(modelName) {
      if (!deepseekKey) throw new Error("DEEPSEEK_API_KEY ayarlı değil.");

      const client = new OpenAI({ 
        apiKey: deepseekKey.trim(), 
        baseURL: "https://api.deepseek.com/v1" 
      });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const completion = await client.chat.completions.create({
          model: modelName,
          messages: messages,
          temperature: 0.5,
          max_tokens: 4096,
          stream: false
        }, { signal: controller.signal });

        clearTimeout(timeoutId);

        const content = completion.choices?.[0]?.message?.content?.trim();
        if (!content) throw new Error("Deepseek boş yanıt döndürdü.");
        return content;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    // ── Groq API Çağrısı (Belirli Model) ──
    async function tryGroqModel(modelName) {
      const client = new OpenAI({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      try {
        const completion = await client.chat.completions.create({
          model: modelName,
          messages: messages,
          temperature: 0.5,
          max_tokens: 4096,
          stream: false
        }, { signal: controller.signal });

        clearTimeout(timeoutId);

        const content = completion.choices?.[0]?.message?.content;
        if (!content) throw new Error("Model boş yanıt döndürdü.");
        return content;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    // ── Gemini API Son Çare Yedek ──
    async function tryGeminiFallback() {
      if (!geminiKey) throw new Error("GEMINI_API_KEY ayarlı değil.");

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey.trim());

      // Gemini için history'yi düzelt (system mesajını ayır)
      const geminiHistory = (history || []).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || "" }]
      }));

      const geminiModel = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { maxOutputTokens: 4096, temperature: 0.5 },
        systemInstruction: { parts: [{ text: systemPrompt }] }
      }, { apiVersion: 'v1' });

      const contents = [
        ...geminiHistory,
        { role: 'user', parts: [{ text: finalUserContent }] }
      ];

      const result = await geminiModel.generateContent({ contents });
      const text = result.response.text();
      if (!text) throw new Error("Gemini boş yanıt döndürdü.");
      return text;
    }

    // ── ANA YEDEKLEME MANTIĞI ──
    let aiResponse = null;
    let usedModel = null;
    let lastError = null;

    // KATMAN 1: Qwen DashScope (Singapore Region - Öncelik)
    if (dashscopeKey) {
      for (const modelName of QWEN_MODEL_CHAIN) {
        try {
          console.log(`[AI-Fallback] 🚀 Qwen DashScope deneniyor: ${modelName}`);
          aiResponse = await callQwenDashScope(systemPrompt, (history || []).filter(m => m.role !== 'system'), modelName, 4096);
          usedModel = `qwen/${modelName}`;
          console.log(`[AI-Fallback] ✅ Qwen ${modelName} başarılı`);
          break;
        } catch (err) {
          console.warn(`[AI-Fallback] ❌ Qwen ${modelName} başarısız: ${err.message}`);
          lastError = err;
        }
      }
    }

    // KATMAN 2: OpenRouter (ASIL MODEL - Tüm Modeller Sırayla)
    if (!aiResponse) {
      for (const modelName of OPENROUTER_MODEL_CHAIN) {
        try {
          console.log(`[AI-Fallback] 🚀 OpenRouter deneniyor: ${modelName}`);
          aiResponse = await tryOpenRouterModel(modelName);
          usedModel = `openrouter/${modelName}`;

          console.log(`[AI-Fallback] ✅ OpenRouter ${modelName} başarılı`);
          break;
        } catch (err) {
          console.warn(`[AI-Fallback] ❌ OpenRouter ${modelName} başarısız: ${err.message}`);
          lastError = err;

          const isRecoverable = 
            err.message?.includes('rate_limit') ||
            err.message?.includes('quota') ||
            err.message?.includes('context_length') ||
            err.message?.includes('model_not_found') ||
            err.message?.includes('boş yanıt') ||
            err.name === 'AbortError' ||
            err.status === 429 ||
            err.status === 503 ||
            err.status === 404;

          const isFatal = err.status === 401 || err.status === 403;
          if (isFatal) {
            console.warn(`[AI-Fallback] ⚠️ OpenRouter kimlik doğrulama hatası, Deepseek'e geçiliyor...`);
            break;
          }

          if (!isRecoverable) {
            console.warn(`[AI-Fallback] ⚠️ ${modelName} beklenmedik hata, sonraki modeli deniyorum...`);
          }
        }
      }
    } else {
      console.warn(`[AI-Fallback] ⚠️ OPENROUTER_API_KEY tanımlı değil, Deepseek'e geçiliyor...`);
    }

    // KATMAN 2: Deepseek (Yedek - Tüm Modeller Sırayla)
    if (!aiResponse) {
      if (deepseekKey) {
        for (const modelName of DEEPSEEK_MODEL_CHAIN) {
          try {
            console.log(`[AI-Fallback] 🚀 Deepseek deneniyor: ${modelName}`);
            aiResponse = await tryDeepseekModel(modelName);
            usedModel = `deepseek/${modelName}`;

            console.log(`[AI-Fallback] ✅ Deepseek ${modelName} başarılı`);
            break;
          } catch (err) {
            console.warn(`[AI-Fallback] ❌ Deepseek ${modelName} başarısız: ${err.message}`);
            lastError = err;

            const isRecoverable = 
              err.message?.includes('rate_limit') ||
              err.message?.includes('quota') ||
              err.message?.includes('context_length') ||
              err.message?.includes('model_not_found') ||
              err.message?.includes('boş yanıt') ||
              err.message?.includes('deprecated') ||
              err.name === 'AbortError' ||
              err.status === 429 ||
              err.status === 503 ||
              err.status === 404;

            const isFatal = err.status === 401 || err.status === 403;
            if (isFatal) {
              console.warn(`[AI-Fallback] ⚠️ Deepseek kimlik doğrulama hatası, Groq'a geçiliyor...`);
              break;
            }

            if (!isRecoverable) {
              console.warn(`[AI-Fallback] ⚠️ ${modelName} beklenmedik hata, sonraki modeli deniyorum...`);
            }
          }
        }
      } else {
        console.warn(`[AI-Fallback] ⚠️ DEEPSEEK_API_KEY tanımlı değil, Groq'a geçiliyor...`);
      }
    }

    // KATMAN 3: Groq (İkinci Yedek)
    if (!aiResponse) {
      for (const modelName of GROQ_MODEL_CHAIN) {
        try {
          console.log(`[AI-Fallback] Deneniyor (Groq): ${modelName}`);
          aiResponse = await tryGroqModel(modelName);
          usedModel = `groq/${modelName}`;

          console.log(`[AI-Fallback] ✅ Başarılı: ${modelName}`);
          break;
        } catch (err) {
          console.warn(`[AI-Fallback] ❌ ${modelName} başarısız: ${err.message}`);
          lastError = err;

          const isRecoverable = 
            err.message?.includes('rate_limit') ||
            err.message?.includes('quota') ||
            err.message?.includes('context_length') ||
            err.message?.includes('model_not_found') ||
            err.message?.includes('boş yanıt') ||
            err.name === 'AbortError' ||
            err.status === 429 ||
            err.status === 503 ||
            err.status === 404;

          const isFatal = err.status === 401 || err.status === 403;
          if (isFatal) {
            console.warn(`[AI-Fallback] ⚠️ Kimlik doğrulama hatası, Groq atlanıyor...`);
            break;
          }

          if (!isRecoverable) {
            console.warn(`[AI-Fallback] ⚠️ Beklenmedik hata, yine de bir sonraki modeli deniyorum...`);
          }
        }
      }
    }

    // KATMAN 4: Gemini Son Çare
    if (!aiResponse && geminiKey) {
      try {
        console.log(`[AI-Fallback] 🔄 Gemini yedeklemesi başlatılıyor... (Groq hata: ${lastError?.message})`);
        aiResponse = await tryGeminiFallback();
        usedModel = "gemini-1.5-flash";
        console.log(`[AI-Fallback] ✅ Gemini başarılı.`);
      } catch (geminiErr) {
        console.error(`[AI-Fallback] ❌ Gemini de başarısız: ${geminiErr.message}`);
        lastError = geminiErr;
      }
    }

    // Tüm modeller başarısız
    if (!aiResponse) {
      console.error("[AI-Fallback] 💥 Tüm modeller başarısız oldu.");
      return res.status(503).json({
        error: "AI_UNAVAILABLE",
        message: "Yapay zeka servislerine şu an ulaşılamıyor. Lütfen birkaç saniye sonra tekrar deneyin.",
        details: lastError?.message
      });
    }

    console.log(`[AI-Fallback] 🎯 Yanıt veren model: ${usedModel}`);

    // Otomasyon verisini ayıkla
    let automation_data = null;
    const automationRegex = /\[\[AUTOMATION_DATA: (\{.*?\}) \]\]/;
    const match = aiResponse.match(automationRegex);
    let cleanReply = aiResponse;

    if (match) {
      try {
        automation_data = JSON.parse(match[1]);
        cleanReply = aiResponse.replace(automationRegex, "").trim();
      } catch (e) { console.error("Automation parse error"); }
    }

    if (!cleanReply && automation_data) {
      cleanReply = `Harika! "${automation_data.title}" otomasyonunu senin için hazırladım. Ayarlardan kontrol edebilir veya hemen başlatabilirsin. ⚡`;
    } else if (!cleanReply) {
      cleanReply = "Üzgünüm, şu an yanıt veremiyorum. Lütfen tekrar dener misin?";
    }

    // Increment Usage Count internally
    if (userId) {
      try {
        const resetData = userStats.usageCount === 0 ? { usageCount: 1 } : { usageCount: { increment: 1 } };
        await prisma.user.update({
          where: { id: userId },
          data: {
            ...resetData,
            lastActiveAt: new Date()
          }
        });
      } catch (e) { console.error("Usage count update error", e); }
    }

    // Ephemeral chat XP: small incremental XP for interactive chat messages.
    // NOTE: This is ephemeral and does NOT update persistent user XP/level unless a goal/completion action occurs.
    const chatXp = Math.floor(Math.random() * 2) + 1; // 1-2 XP per message

    return res.status(200).json({
      reply: cleanReply,
      automation_data,
      sources: searchSources,
      searched: searchSources.length > 0,
      _model: usedModel,
      chat_xp: chatXp,
      chat_xp_persisted: false
    });
  } catch (error) {
    console.error("Sistem Hatası:", error);
    return res.status(500).json({ error: "Sistem Hatası", details: error.message });
  }
}
