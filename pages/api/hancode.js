import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// HAN CODE — SYSTEM PROMPT
// World-class AI Software Engineer by HAN AI
// ============================================================
const HAN_CODE_SYSTEM_PROMPT = `You are HAN Code, an elite AI software engineer created by HAN AI.
You are powered by HAN 4.2 Ultra Core — the most advanced coding model in the HAN AI ecosystem.
Knowledge cutoff: 2024-06
Personality: Senior Engineer meets Patient Mentor

If asked what model you are, always say: HAN 4.2 Ultra Core (Code Edition).
Never break character. You are HAN Code, always.
Do not reproduce copyrighted code, licenses, or proprietary implementations.

## Your Identity
You are not just a code generator — you are a senior software architect with 20+ years of
experience across every major platform, language, and paradigm. You think before you code.
You ask the right questions. You write code that is clean, scalable, and production-ready.

## Core Philosophy
1. THINK FIRST: Before writing a single line, understand the full picture.
2. CLEAN CODE: Every function has one job. Every variable has a clear name.
3. PRODUCTION READY: No toy examples — write code that actually works in the real world.
4. EXPLAIN EVERYTHING: A senior dev explains their decisions, not just their code.
5. NO HALF MEASURES: Either write the full implementation or clearly explain what's missing.

## Supported Project Types
You are expert in ALL of the following:

### 🌐 Web (HTML / CSS / JavaScript / TypeScript / React / Next.js / Vue / Svelte)
- Modern React with hooks, context, Zustand, Redux Toolkit
- Next.js App Router, API routes, SSR/SSG/ISR
- Tailwind CSS, shadcn/ui, Framer Motion
- REST APIs, GraphQL, WebSockets
- Authentication: JWT, OAuth, NextAuth, Clerk
- Deployment: Vercel, Netlify, Cloudflare Pages

### 📱 Mobile (React Native / Flutter / Expo)
- React Native with Expo — cross-platform iOS & Android
- Flutter with Dart — beautiful native UIs
- Navigation: React Navigation, Expo Router, GoRouter
- State: Zustand, Riverpod, Provider, Bloc
- Push notifications, camera, location, biometrics
- App Store & Google Play deployment prep

### 🖥️ Desktop (Electron / Tauri)
- Electron with React/Vue frontend
- Tauri with Rust backend (lightweight, secure)
- Native menus, tray icons, auto-updater
- File system access, OS integrations
- Cross-platform packaging (Windows, macOS, Linux)

### ⚙️ Backend & API (Node.js / Python / FastAPI / Express / NestJS)
- Node.js: Express, Fastify, NestJS, tRPC
- Python: FastAPI, Django, Flask
- REST API design, OpenAPI/Swagger docs
- Authentication middleware, rate limiting, CORS
- Background jobs: Bull, Celery, cron
- WebSocket servers, SSE streaming
- Deployment: Railway, Render, Fly.io, AWS, GCP, VPS

### 🗄️ Database & SQL
- PostgreSQL, MySQL, SQLite — full schema design
- MongoDB, Redis — NoSQL patterns
- Prisma ORM, Drizzle ORM, SQLAlchemy
- Query optimization, indexing strategies
- Migrations, seeding, backup strategies
- Supabase, PlanetScale, Neon, Turso

### 🎮 Game Development
- Phaser.js — 2D browser games
- Three.js / Babylon.js — 3D web games
- Unity C# concepts (architecture guidance)
- Game loops, collision detection, physics
- Multiplayer with WebSockets / Socket.io
- Asset management, sprite animation

## Supported Languages (Expert Level)
- JavaScript / TypeScript ← Primary
- Python ← Primary  
- Dart (Flutter) ← Primary
- Swift / Kotlin ← Architecture & guidance
- Go ← Backend services
- Rust ← Systems & Tauri backends
- SQL ← All dialects
- Bash / Shell ← Automation scripts
- HTML / CSS ← Always pixel-perfect

## Operating Modes
Detect the user's intent and switch modes automatically:

### 🚀 MODE: PROJECT CREATE
Trigger: "yap", "oluştur", "baştan yaz", "proje yap", "create", "build", "generate"
Behavior:
- Ask 3-5 clarifying questions FIRST (if project is complex)
- For simple requests: start coding immediately
- Always output: folder structure → then file by file
- Use [[FILE: filename]] markers for each file (see File Output Format below)
- End with: setup instructions, how to run, dependencies list

### 🔍 MODE: DEBUG & REVIEW  
Trigger: "hata var", "çalışmıyor", "bug", "error", "fix", "debug", "neden çalışmıyor"
Behavior:
- Identify the root cause FIRST — explain it clearly
- Show the broken code, then the fixed code (side by side if helpful)
- Explain WHY it was broken, not just what changed
- Check for related issues the user might not have noticed
- End with: "Bu değişiklikten sonra X ve Y'yi de test et."

### ⚡ MODE: OPTIMIZE
Trigger: "optimize et", "yavaş", "performans", "slow", "refactor", "temizle", "clean up"
Behavior:
- Analyze time complexity (Big O) if relevant
- Identify bottlenecks: N+1 queries, unnecessary re-renders, memory leaks
- Rewrite with clear before/after comparison
- Explain the performance gain in plain language
- Suggest profiling tools relevant to the stack

### 📖 MODE: EXPLAIN
Trigger: "anlat", "ne yapıyor", "explain", "nasıl çalışıyor", "how does this work"
Behavior:
- Line-by-line or section-by-section explanation
- Use simple analogies for complex concepts
- Always end with a summary of the big picture
- Suggest what the user should learn next

### 📦 MODE: FILE GENERATE
Trigger: "indir", "zip", "dosya olarak ver", "download", "export"
Behavior:
- Output all files using [[FILE: path/filename.ext]] format
- Include package.json / pubspec.yaml / requirements.txt
- Include README.md with setup instructions
- Wrap everything in [[PROJECT_EXPORT: { "name": "...", "files": [...] }]]

## File Output Format
When generating project files, ALWAYS use this format:

[[FILE: path/to/filename.ext]]
\`\`\`language
// full file content here
\`\`\`
[[/FILE]]

For full project exports:
[[PROJECT_EXPORT: {"name": "project-name", "totalFiles": 5}]]
[[FILE: package.json]]
\`\`\`json
{ ... }
\`\`\`
[[/FILE]]
[[FILE: src/index.js]]
\`\`\`javascript
// ...
\`\`\`
[[/FILE]]
[[/PROJECT_EXPORT]]

## Code Quality Standards
Every piece of code you write MUST follow these rules:
- ✅ TypeScript over JavaScript (unless user specifies JS)
- ✅ Proper error handling (try/catch, error boundaries)
- ✅ Environment variables for all secrets (.env.example included)
- ✅ No hardcoded values — use constants or config files
- ✅ Meaningful variable names (no x, y, data, temp)
- ✅ Comments for complex logic (not obvious things)
- ✅ Consistent code style (follow language conventions)
- ✅ Security basics: no SQL injection, sanitize inputs, validate data
- ❌ Never use deprecated APIs or outdated patterns
- ❌ Never write synchronous blocking code in async contexts
- ❌ Never skip error handling "for brevity"

## Architecture Thinking
Before writing code for any non-trivial project:
1. Clarify the requirements (what problem are we really solving?)
2. Choose the right stack (don't over-engineer, don't under-engineer)
3. Design the data model first
4. Define the API contract (inputs/outputs)
5. Then write the code

## Security Rules
- Always mention security implications when relevant
- Never suggest storing passwords in plain text
- Always recommend HTTPS, rate limiting, input validation
- Point out XSS, CSRF, SQL injection risks when you see them
- Suggest environment variable usage for all API keys

## Communication Style
- Start with the BIG PICTURE, then dive into details
- Use code blocks for ALL code — never inline code in paragraphs
- When explaining: use simple language, real-world analogies
- When there are multiple approaches: list pros/cons, then recommend one
- Be direct: "This approach is better because..." not "You could maybe consider..."
- Detect user language (Turkish/English/Russian/German/French/Spanish) and mirror it
- Turkish users: "kardeşim", "bak şöyle", "şu şekilde yapıyoruz" — samimi ol ama profesyonel

## Strict Prohibitions
- Never write incomplete code and say "add your logic here" without explanation
- Never use console.log as error handling
- Never suggest npm packages without checking if they're maintained
- Never write code without considering edge cases
- Never say "this should work" — be certain or explain the uncertainty
- Never output more than one approach unless the user asks for alternatives

## Response Structure for Code
1. 🎯 Brief plan (2-3 sentences max)
2. 📁 Folder/file structure (if multi-file project)
3. 💻 Code files (using [[FILE]] format)
4. 🚀 How to run / setup instructions
5. ⚠️ Things to watch out for (gotchas, edge cases)
6. 🔜 Suggested next steps
`;

// ============================================================
// QWEN DASHSCOPE (Singapore Region - Primary)
// ============================================================
async function callQwenDashScope(systemPrompt, userMessages, model = 'qwen3.7-plus', maxTokens = 8192) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY ayarlı değil.');

  const dashMessages = [{ role: 'system', content: systemPrompt }];
  for (const msg of userMessages) {
    if (msg.role === 'user') dashMessages.push({ role: 'user', content: msg.content });
    else if (msg.role === 'assistant') dashMessages.push({ role: 'assistant', content: msg.content });
  }

  // Using Singapore regional endpoint
  const response = await fetch('https://dashscope-sg.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${apiKey}`,
      'X-Region': 'sg-singapore'
    },
    body: JSON.stringify({
      model,
      input: { messages: dashMessages },
      parameters: { 
        result_format: 'message', 
        temperature: 0.2,
        top_p: 0.8, 
        max_tokens: maxTokens,
        repetition_penalty: 1.0
      }
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Qwen API Error ${response.status}: ${errorData?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  const content = data?.output?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Qwen boş yanıt döndürdü.');
  return content;
}

// ============================================================
// MODEL CHAINS (Qwen as Primary)
// ============================================================
const QWEN_MODEL_CHAIN = (process.env.QWEN_API_MODELS || 'qwen3.7-plus|qwen-plus|qwen-flash').split('|');

const OPENROUTER_MODEL_CHAIN = (process.env.OPENROUTER_CODE_MODELS ||
  'google/gemma-3-27b-it:free|meta-llama/llama-3.3-70b-instruct:free|' +
  'openai/gpt-oss-120b:free|google/gemma-4-31b-it:free'
).split('|');

const GROQ_MODEL_CHAIN = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

const DEEPSEEK_MODEL_CHAIN = [
  'deepseek-chat',
  'deepseek-coder',
];

// ============================================================
// MAIN HANDLER
// ============================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      message,
      history,
      email,
      sessionId,
      mode,           // 'create' | 'debug' | 'optimize' | 'explain' | 'export'
      language,       // Preferred coding language hint
      projectType,    // 'web' | 'mobile' | 'desktop' | 'backend' | 'game' | 'database'
      attachments,    // Code files pasted by user
    } = req.body;

    // ── 1. KULLANICI VERİSİ ──
    let userId = null;
    let userName = 'Developer';
    let userPlan = 'FREE';
    let usageCount = 0;
    let usageLimit = 20;

    if (email) {
      try {
        const userData = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true, name: true, plan: true,
            usageLimit: true, usageCount: true, lastActiveAt: true
          }
        });
        if (userData) {
          userId = userData.id;
          userName = userData.name || 'Developer';
          userPlan = userData.plan;
          usageLimit = userData.usageLimit;

          // 5 saatlik reset
          if (userData.plan === 'FREE' && userData.lastActiveAt) {
            const hours = (new Date() - new Date(userData.lastActiveAt)) / (1000 * 60 * 60);
            usageCount = hours >= 5 ? 0 : userData.usageCount;
          } else {
            usageCount = userData.usageCount;
          }
        }
      } catch (e) { console.error('User fetch error:', e); }
    }

    // ── 2. LİMİT KONTROLÜ ──
    if (userId && userPlan === 'FREE' && usageCount >= usageLimit) {
      return res.status(403).json({
        error: 'LIMIT_REACHED',
        message: 'HAN Code mesaj limitine ulaştın. Premium ile sınırsız kod üret!'
      });
    }

    // ── 3. KOD DOSYASI CONTEXT ──
    let codeContext = '';
    if (attachments && attachments.length > 0) {
      for (const at of attachments) {
        if (at.type === 'code' || at.type === 'text') {
          codeContext += `\n\n[[ATTACHED FILE: ${at.name}]]\n\`\`\`${at.language || ''}\n${at.content}\n\`\`\`\n[[/ATTACHED FILE]]`;
        }
      }
    }

    // ── 4. MODE & CONTEXT INJECTION ──
    const modeHints = {
      create: '## ACTIVE MODE: PROJECT CREATE\nUser wants to build something from scratch. Ask clarifying questions if the request is vague. Then generate the full project.',
      debug: '## ACTIVE MODE: DEBUG & REVIEW\nUser has a bug or error. Find the root cause first, then fix it. Explain why it broke.',
      optimize: '## ACTIVE MODE: OPTIMIZE\nUser wants better performance or cleaner code. Analyze, then rewrite with clear before/after.',
      explain: '## ACTIVE MODE: EXPLAIN\nUser wants to understand code. Break it down clearly, use analogies, stay patient.',
      export: '## ACTIVE MODE: FILE GENERATE\nUser wants downloadable files. Use [[FILE]] and [[PROJECT_EXPORT]] format for everything.',
    };

    const projectHints = {
      web: 'Project Type: Web — prefer React/Next.js/TypeScript/Tailwind unless specified otherwise.',
      mobile: 'Project Type: Mobile — prefer React Native with Expo unless user specifies Flutter.',
      desktop: 'Project Type: Desktop — prefer Tauri (Rust+React) for performance, Electron if compatibility matters.',
      backend: 'Project Type: Backend — prefer Node.js/Express or FastAPI depending on user preference.',
      game: 'Project Type: Game — prefer Phaser.js for 2D web games, Three.js for 3D.',
      database: 'Project Type: Database — design schema first, then queries, then ORM integration.',
    };

    const modeInjection = mode && modeHints[mode] ? modeHints[mode] : '';
    const projectInjection = projectType && projectHints[projectType] ? projectHints[projectType] : '';
    const langInjection = language ? `Preferred Language: ${language}` : '';

    const fullSystemPrompt = `${HAN_CODE_SYSTEM_PROMPT}

## Session Context
Developer Name: ${userName}
Plan: ${userPlan}
${modeInjection}
${projectInjection}
${langInjection}
${codeContext ? `\n## Attached Files\n${codeContext}` : ''}
`;

    // ── 5. MESAJ GEÇMİŞİ ──
    const messages = [
      { role: 'system', content: fullSystemPrompt },
      ...(history || []).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || ''
      })),
      { role: 'user', content: message || '' }
    ];

    // ── 6. API ÇAĞRI FONKSİYONLARI ──
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const dashscopeKey = process.env.DASHSCOPE_API_KEY;

    async function tryOpenRouterModel(modelName) {
      if (!openrouterKey) throw new Error('OPENROUTER_API_KEY ayarlı değil.');
      const client = new OpenAI({
        apiKey: openrouterKey.trim(),
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://hanai.app',
          'X-Title': 'HAN Code'
        }
      });
      const completion = await client.chat.completions.create({
        model: modelName,
        messages,
        temperature: 0.2,   // Daha düşük = daha deterministik kod
        max_tokens: 8192,
        stream: false
      }, { signal: AbortSignal.timeout(45000) });
      const content = completion.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('OpenRouter boş yanıt döndürdü.');
      return content;
    }

    async function tryDeepseekModel(modelName) {
      if (!deepseekKey) throw new Error('DEEPSEEK_API_KEY ayarlı değil.');
      const client = new OpenAI({
        apiKey: deepseekKey.trim(),
        baseURL: 'https://api.deepseek.com/v1'
      });
      const completion = await client.chat.completions.create({
        model: modelName,
        messages,
        temperature: 0.2,
        max_tokens: 8192,
        stream: false
      }, { signal: AbortSignal.timeout(45000) });
      const content = completion.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('Deepseek boş yanıt döndürdü.');
      return content;
    }

    async function tryGroqModel(modelName) {
      if (!groqKey) throw new Error('GROQ_API_KEY ayarlı değil.');
      const client = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' });
      const completion = await client.chat.completions.create({
        model: modelName,
        messages,
        temperature: 0.2,
        max_tokens: 8192,
        stream: false
      }, { signal: AbortSignal.timeout(30000) });
      const content = completion.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('Groq boş yanıt döndürdü.');
      return content;
    }

    async function tryGeminiFallback() {
      if (!geminiKey) throw new Error('GEMINI_API_KEY ayarlı değil.');
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey.trim());
      const geminiHistory = (history || []).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }]
      }));
      const geminiModel = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { maxOutputTokens: 8192, temperature: 0.2 },
        systemInstruction: { parts: [{ text: fullSystemPrompt }] }
      }, { apiVersion: 'v1' });
      const result = await geminiModel.generateContent({
        contents: [...geminiHistory, { role: 'user', parts: [{ text: message || '' }] }]
      });
      const text = result.response.text();
      if (!text) throw new Error('Gemini boş yanıt döndürdü.');
      return text;
    }

    // ── 7. FALLBACK ZİNCİRİ ──
    let aiResponse = null;
    let usedModel = null;
    let lastError = null;

    // KATMAN 1: Qwen DashScope
    if (dashscopeKey) {
      for (const modelName of QWEN_MODEL_CHAIN) {
        try {
          console.log(`[HAN-Code] 🚀 Qwen deneniyor: ${modelName}`);
          aiResponse = await callQwenDashScope(
            fullSystemPrompt,
            (history || []).filter(m => m.role !== 'system'),
            modelName,
            8192
          );
          usedModel = `qwen/${modelName}`;
          console.log(`[HAN-Code] ✅ Qwen başarılı: ${modelName}`);
          break;
        } catch (err) {
          console.warn(`[HAN-Code] ❌ Qwen ${modelName}: ${err.message}`);
          lastError = err;
        }
      }
    }

    // KATMAN 2: OpenRouter
    if (!aiResponse && openrouterKey) {
      for (const modelName of OPENROUTER_MODEL_CHAIN) {
        try {
          console.log(`[HAN-Code] 🚀 OpenRouter deneniyor: ${modelName}`);
          aiResponse = await tryOpenRouterModel(modelName);
          usedModel = `openrouter/${modelName}`;
          console.log(`[HAN-Code] ✅ OpenRouter başarılı: ${modelName}`);
          break;
        } catch (err) {
          console.warn(`[HAN-Code] ❌ OpenRouter ${modelName}: ${err.message}`);
          lastError = err;
          if (err.status === 401 || err.status === 403) break;
        }
      }
    }

    // KATMAN 3: Deepseek
    if (!aiResponse && deepseekKey) {
      for (const modelName of DEEPSEEK_MODEL_CHAIN) {
        try {
          console.log(`[HAN-Code] 🚀 Deepseek deneniyor: ${modelName}`);
          aiResponse = await tryDeepseekModel(modelName);
          usedModel = `deepseek/${modelName}`;
          console.log(`[HAN-Code] ✅ Deepseek başarılı: ${modelName}`);
          break;
        } catch (err) {
          console.warn(`[HAN-Code] ❌ Deepseek ${modelName}: ${err.message}`);
          lastError = err;
          if (err.status === 401 || err.status === 403) break;
        }
      }
    }

    // KATMAN 4: Groq
    if (!aiResponse && groqKey) {
      for (const modelName of GROQ_MODEL_CHAIN) {
        try {
          console.log(`[HAN-Code] 🚀 Groq deneniyor: ${modelName}`);
          aiResponse = await tryGroqModel(modelName);
          usedModel = `groq/${modelName}`;
          console.log(`[HAN-Code] ✅ Groq başarılı: ${modelName}`);
          break;
        } catch (err) {
          console.warn(`[HAN-Code] ❌ Groq ${modelName}: ${err.message}`);
          lastError = err;
          if (err.status === 401 || err.status === 403) break;
        }
      }
    }

    // KATMAN 5: Gemini Son Çare
    if (!aiResponse && geminiKey) {
      try {
        console.log(`[HAN-Code] 🔄 Gemini yedekleme...`);
        aiResponse = await tryGeminiFallback();
        usedModel = 'gemini-1.5-flash';
        console.log(`[HAN-Code] ✅ Gemini başarılı.`);
      } catch (err) {
        console.error(`[HAN-Code] ❌ Gemini de başarısız: ${err.message}`);
        lastError = err;
      }
    }

    // Tüm modeller başarısız
    if (!aiResponse) {
      console.error('[HAN-Code] 💥 Tüm modeller başarısız.');
      return res.status(503).json({
        error: 'AI_UNAVAILABLE',
        message: 'HAN Code şu an yanıt veremiyor. Lütfen birkaç saniye sonra tekrar dene.',
        details: lastError?.message
      });
    }

    // ── 8. DOSYA BLOKLARINI PARSE ET ──
    const fileBlocks = [];
    const fileRegex = /\[\[FILE:\s*(.+?)\]\]\s*```[\w]*\n([\s\S]*?)```\s*\[\[\/FILE\]\]/g;
    let fileMatch;
    while ((fileMatch = fileRegex.exec(aiResponse)) !== null) {
      fileBlocks.push({
        filename: fileMatch[1].trim(),
        content: fileMatch[2]
      });
    }

    // PROJECT_EXPORT bloğunu parse et
    let projectExport = null;
    const exportMatch = aiResponse.match(/\[\[PROJECT_EXPORT:\s*(\{.*?\})\]\]/s);
    if (exportMatch) {
      try { projectExport = JSON.parse(exportMatch[1]); } catch (e) { /* ignore */ }
    }

    // ── 9. USAGE COUNT GÜNCELLE ──
    if (userId) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            usageCount: usageCount === 0 ? 1 : { increment: 1 },
            lastActiveAt: new Date()
          }
        });
      } catch (e) { console.error('Usage update error:', e); }
    }

    console.log(`[HAN-Code] 🎯 Yanıt: ${usedModel} | Dosyalar: ${fileBlocks.length}`);

    // ── 10. RESPONSE ──
    return res.status(200).json({
      message: aiResponse,
      response: aiResponse,  // Frontend'in kullandığı format
      reply: aiResponse,     // Alternatif format
      fileBlocks,           // Parse edilmiş dosya listesi
      projectExport,        // Proje export metadata
      hasFiles: fileBlocks.length > 0,
      usedModel: usedModel,
      model: usedModel,
      success: true
    });

  } catch (error) {
    console.error('[HAN-Code] Sistem Hatası:', error);
    return res.status(500).json({ error: 'Sistem Hatası', details: error.message });
  }
}