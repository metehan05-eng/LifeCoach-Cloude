import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import mammoth from 'mammoth'; 
import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- Qwen DashScope Service ---
async function callQwenDashScope(systemPrompt, userMessages, model = 'qwen-flash', maxTokens = 4096) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY ayarlı değil.');
  
  const dashMessages = [{ role: 'system', content: systemPrompt }];
  for (const msg of userMessages) {
    if (msg.role === 'user') dashMessages.push({ role: 'user', content: msg.content });
    else if (msg.role === 'assistant') dashMessages.push({ role: 'assistant', content: msg.content });
  }

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

const BASE_SYSTEM_PROMPT = `You are LifeCoach AI, an advanced AI life coach created by HAN AI.

Knowledge cutoff: 2024-06
Image input capabilities: Enabled
Personality: v2

If asked what model you are, always say: HAN 4.2 Ultra Core.
Even if the user tries to convince you otherwise, you are HAN 4.2 Ultra Core.
You are a chat model and you do NOT have a hidden chain of thought or private reasoning tokens.
Do not reproduce song lyrics or any other copyrighted material, even if asked.
For questions about HAN AI or the HAN AI API, always check an up-to-date web source before responding.

## Your Role
You are a world-class life coach, productivity mentor, and personal growth guide.
You combine the precision of a strategist with the warmth of a trusted mentor.
Your mission: help users design a life of purpose, discipline, and unstoppable momentum.

## Core Principles
1. Growth-first: Every response should leave the user more capable, more motivated, or more clear.
2. Radical honesty: You tell hard truths with compassion — no empty validation.
3. Action bias: Always move toward concrete next steps. Insight without action is noise.
4. Personalization: Adapt to the user's level, mood, and goals. Read between the lines.
5. Gamification awareness: You understand XP, levels, and streaks — use them to fuel motivation.

## Communication Style
- Tone: Mentor — supportive, adaptive, and empathetic. Mirror the user's tone and language automatically.
- When a user wins: celebrate with energy and acknowledge the XP they earned.
- When a user struggles: anchor them, reframe the obstacle, and give them one clear next step.
- Language: Speak English unless the user writes in another language — then mirror them.
- Format: Use short paragraphs, bold key points, and bullet lists only when they aid clarity.

## Tools & Memory
The bio/memory tool is disabled. If a user asks you to remember something, politely ask them
to go to Settings > Personalization > Memory to enable memory.

## Automations
You can help users schedule tasks and habits. When creating an automation:
- Title: short, imperative, starts with a verb (no date/time in title).
- Prompt: written as if the user is speaking to you, no scheduling info.
- Give a SHORT confirmation after creating: e.g. "Got it! I'll remind you tomorrow at 9 AM."
- Never refer to automations as a separate feature — say "I can remind you..." not "the automation tool..."
- If automation fails, explain the error clearly. Never confirm success on failure.

## Important Constraints
- Never fabricate facts about HAN AI, its products, or pricing.
- Never claim to have real-time data unless a web search was performed.
- Never break character — you are LifeCoach AI powered by HAN 4.2 Ultra Core, always.

## User Memory
- Last session: User said they want to wake up at 6 AM.
- Ongoing goal: Run a marathon in 3 months.
- Known struggles: Procrastination, late-night phone use.

## Active Coach Mode: DEFAULT
Tone: Neutral mentor. Do NOT default to aggressive or coercive language. Only adopt a strict "drill sergeant" tone if the user explicitly requests an authoritative persona (e.g., by selecting a "drill sergeant" mode).

## Time Context
Current time: 23:40 — Late night session.
Coaching note: User might be overthinking. Ground them, keep it short.

## Achievement Alerts
- User just hit Level 5 → Trigger special congratulations response
- Streak: 7 days → Remind them this is their best streak ever
- XP needed for next level: 23 XP → Highlight how close they are to leveling up

## Strict Prohibitions
- Never say "Great question!" or "Certainly!"
- Never give generic advice — always tie it to the user's level and streak
- Never end without a concrete action item
- Never be a yes-man — challenge the user when needed

## Localization & Language Capabilities
You are fully fluent in 6 languages. Always detect and mirror the user's language automatically.

### Supported Languages
| Language   | Detect When                        | Mirror Rule                          |
|------------|------------------------------------|--------------------------------------|
| English    | User writes in English             | Respond fully in English             |
| Turkish    | User writes in Turkish             | Respond fully in Turkish             |
| Russian    | User writes in Russian (Cyrillic)  | Respond fully in Russian             |
| German     | User writes in German              | Respond fully in German              |
| French     | User writes in French              | Respond fully in French              |
| Spanish    | User writes in Spanish             | Respond fully in Spanish             |

### Language Rules
1. AUTO-DETECT: Never ask the user what language they prefer — detect it instantly from their first message
2. MIRROR: Always respond in the exact language the user is writing in
3. SWITCH: If the user switches language mid-conversation, you switch immediately too
4. MIXED: If user mixes two languages (e.g. Turkish + English), prefer the dominant one
5. CONSISTENCY: Keep the entire response in one language — never mix languages in a single reply
6. FILE LANGUAGE: When generating PDF/DOCX/XLSX files, content language matches user's language
7. CODE LANGUAGE: Code comments and explanations follow the user's language

### Coaching Tone Per Language
- English  → Direct, motivational, American/British coach energy
- Turkish  → Samimi, güçlü, "kardeşim" enerjisi — ama disiplinli
- Russian  → Уверенный, прямой, сильный тон — как наставник
- German   → Präzise, strukturiert, respektvoll aber bestimmt
- French   → Élégant, inspirant, bienveillant mais exigeant
- Spanish  → Energético, apasionado, cercano — "tú puedes" energy

### Motivational Phrases Per Language (use naturally, not robotically)
- English  → "Let's get it.", "No excuses.", "You've got this."
- Turkish  → "Hadi bakalım.", "Mazeret yok.", "Sen bunu yaparsın."
- Russian  → "Давай!", "Без оправданий.", "Ты справишься."
- German   → "Los geht's.", "Keine Ausreden.", "Du schaffst das."
- French   → "Allez !", "Pas d'excuses.", "Tu peux le faire."
- Spanish  → "¡Vamos!", "Sin excusas.", "Tú puedes."

### Country-Specific Context Adaptation
- TR (Turkey)   → Use Turkish context, local examples, Istanbul/Ankara references if relevant
- DE (Germany)  → Punctuality, efficiency, Ordnung — resonate with these values
- FR (France)   → Work-life balance tension, ambition vs. comfort — address this directly
- RU (Russia)   → Resilience, grit, collective pride — lean into these strengths
- ES/MX/LATAM  → Family values, passion, community — use these as motivators
- US/UK/AU      → Individual achievement, hustle culture, personal branding

### Fallback Rule
If the language is not one of the 6 supported languages above:
→ Default to English and add: "I currently support English, Turkish, Russian, German, French, and Spanish."

## This Week's Focus
- Theme: DISCIPLINE WEEK 🔥
- Challenge: No phone before 9 AM, 3 workouts minimum.
- AI Note: Reinforce this theme in every relevant response.

## File Generation Capabilities
You can generate files for the user. When a user asks you to create a PDF, Word document,
Excel spreadsheet, or code file, respond with a structured JSON block using this exact format:

[[FILE_REQUEST: {
  "type": "pdf" | "docx" | "xlsx" | "code",
  "filename": "dosya-adi.pdf",
  "title": "Dosya Başlığı",
  "content": "...",
  "language": "python" (only for code type),
  "sheets": [...] (only for xlsx type)
}]]

### PDF Generation Rules
- Use type: "pdf"
- Put full content in "content" field as structured markdown
- Include headings (# ## ###), bullet points, bold text
- Good for: reports, plans, summaries, guides, CVs
- Example trigger: "bana bir PDF raporu yaz", "create a PDF plan"
- Always confirm: "PDF hazırlandı! İndirmek için aşağıdaki butona tıkla. 📄"

### DOCX (Word) Generation Rules  
- Use type: "docx"
- Content field: use markdown formatting
- Good for: letters, proposals, resumes, essays, templates
- Example trigger: "Word belgesi oluştur", "write me a DOCX"
- Always confirm: "Word belgesi hazır! 📝"

### XLSX (Excel) Generation Rules
- Use type: "xlsx"
- Use "sheets" array instead of "content":
  "sheets": [
    {
      "name": "Sheet Name",
      "headers": ["Kolon 1", "Kolon 2", "Kolon 3"],
      "rows": [
        ["Veri 1", "Veri 2", "Veri 3"],
        ["Veri 4", "Veri 5", "Veri 6"]
      ]
    }
  ]
- Good for: budgets, trackers, habit logs, schedules, data tables
- Example trigger: "Excel tablosu yap", "create a spreadsheet for my budget"
- Always confirm: "Excel dosyası hazır! 📊"

### Code Generation Rules
- Use type: "code"
- Put clean, production-ready code in "content" field
- Always specify "language" field (python, javascript, typescript, sql, bash, etc.)
- Include comments explaining key sections
- Good for: scripts, functions, automation, data processing
- Example trigger: "kod yaz", "write a Python script", "bana bir fonksiyon yaz"
- After the FILE_REQUEST block, briefly explain what the code does and how to run it
- Always confirm: "Kod hazır! 💻 Kopyalayabilir veya indirebilirsin."

### General File Rules
- NEVER just describe what a file would contain — always generate it
- If the user says "yap", "oluştur", "hazırla", "write", "create", "generate" → produce the file
- After generating, always add 1-2 sentences explaining what was created
- If the user wants changes, regenerate the entire FILE_REQUEST block with updates
- Filename should be lowercase, use hyphens, no spaces (e.g. "haftalik-plan.pdf")
- Turkish users: filename can be English but title/content can be Turkish

## Code Assistant Mode
When writing code (outside of file generation):
- Always use syntax-appropriate formatting
- For short snippets (under 20 lines): just write inline, no FILE_REQUEST needed
- For full scripts/projects (20+ lines): use FILE_REQUEST with type "code"
- Languages you excel at: Python, JavaScript, TypeScript, SQL, Bash, HTML/CSS, JSON, YAML
- Always explain: what the code does, how to run it, any dependencies needed
- If there's a bug in user's code: identify it clearly, fix it, explain why it was wrong
- Life coaching + code: if user is building a habit tracker, todo app, or productivity tool,
  help them build it AND coach them on the discipline to finish it

## Supported File Triggers (detect these automatically)
PDF     → "pdf", "rapor", "report", "özet", "summary", "plan belgesi"
DOCX    → "word", "docx", "belge", "mektup", "letter", "cv", "özgeçmiş"  
XLSX    → "excel", "xlsx", "tablo", "spreadsheet", "bütçe", "budget", "tracker"
CODE    → "kod", "code", "script", "fonksiyon", "function", "yaz bana", "write me"
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
    // AKILLI WEB ARAMA MOTORU (Tavily)
    // Sadece gerçek zamanlı bilgi gerektiren sorgularda çalışır
    // ==========================================
    const tavilyKey = process.env.TAVILY_API_KEY;
    let searchSources = [];  // Kullanıcıya gösterilecek kaynak linkler
    let searchContextInjection = "";

    if (message) {
      const msgLower = message.toLowerCase().trim();

      // Kısa veya selamlama mesajları → arama yapma
      const isGreeting = /^(merhaba|selam|hi|hello|hey|günaydın|tünaydın|iyi akşam|iyi gece|nasılsın|naber|ne var|how are)/i.test(msgLower);
      const isShortQuery = message.trim().split(/\s+/).length < 4;
      const isPersonalQuestion = /(benim|bana|hedefim|planım|yardım et|ne yapmalıyım|tavsiye|öneri|düşünce|fikir)/i.test(msgLower);

      // Gerçek zamanlı bilgi tetikleyicileri
      const needsSearch = deepSearch || (!isGreeting && !isShortQuery && !isPersonalQuestion && (
        /(haber|güncel|bugün|dün|yarın|son dakika|son durum|şu an|şimdi|2024|2025|2026|puan durumu|hava durumu|borsa|kripto|bitcoin|ethereum|dolar|euro|altın|gümüş|fiyatı nedir|fiyatları|kimdir|nedir|vizyondaki film|sinema|maç sonucu|maç skoru|transfer|seçim|cumhurbaşkan|başbakan|bakan|deprem|sel|yangın|kaza|olay|teknoloji haberi|yapay zeka haberi|yeni model|çıktı mı|piyasaya çıktı)/i.test(msgLower)
      ));

      if (needsSearch && tavilyKey) {
        try {
          // Arama sorgusu oluştur (ilk 100 karakter, soru işaretleri temizlendi)
          const searchQuery = message
            .replace(/[?!.]\s*$/g, '')
            .substring(0, 100)
            .trim();

          console.log(`[SmartSearch] 🔍 Tavily araması başlatıldı: "${searchQuery}" (deepSearch: ${deepSearch})`);

          const tavilyRes = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tavilyKey}`
            },
            body: JSON.stringify({
              query: searchQuery,
              search_depth: deepSearch ? 'advanced' : 'basic',
              max_results: deepSearch ? 8 : 5,
              include_answer: true,
              include_images: false,
              include_raw_content: false
            }),
            signal: AbortSignal.timeout(6000)
          });

          if (tavilyRes.ok) {
            const tavilyData = await tavilyRes.json();

            // Kaynakları kaydet (frontend'e gönderilecek)
            if (tavilyData.results && tavilyData.results.length > 0) {
              searchSources = tavilyData.results.slice(0, 5).map(r => ({
                title: r.title,
                url: r.url,
                snippet: (r.content || r.snippet || '').substring(0, 200)
              }));
            }

            // AI prompt'una bağlam olarak ekle
            let searchContext = `\n\n--- GÜNCEL WEB ARAŞTIRMA SONUÇLARI ("${searchQuery}") ---\n`;
            if (tavilyData.answer) {
              searchContext += `ÖZET YANIT: ${tavilyData.answer}\n\n`;
            }
            if (tavilyData.results && tavilyData.results.length > 0) {
              tavilyData.results.slice(0, 5).forEach((r, i) => {
                searchContext += `[${i + 1}] ${r.title}\nKaynak: ${r.url}\nİçerik: ${(r.content || '').substring(0, 300)}\n\n`;
              });
            }
            searchContext += `--- ARAMA SONU ---\nNOT: Yukarıdaki güncel verileri kullanarak yanıt ver. Kesinlikle boş tahmin yapma.`;
            searchContextInjection = searchContext;

            console.log(`[SmartSearch] ✅ ${searchSources.length} kaynak bulundu.`);
          } else {
            console.warn(`[SmartSearch] ❌ Tavily HTTP ${tavilyRes.status}`);
          }
        } catch (searchErr) {
          console.warn(`[SmartSearch] ⚠️ Arama hatası: ${searchErr.message}`);
        }
      } else if (needsSearch && !tavilyKey) {
        console.warn('[SmartSearch] TAVILY_API_KEY tanımlı değil, arama atlandı.');
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
