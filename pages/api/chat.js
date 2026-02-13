import { NextResponse } from 'next/server';
import { getKVData, setKVData } from '../../lib/kv';

export const runtime = 'edge';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODELS = [
    "arcee-ai/trinity-large-preview:free",
    "deepseek/deepseek-r1-0528:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "google/gemma-3-27b-it:free",
    "openrouter/free"
];

// --- LİMİT SİSTEMİ (KV Tabanlı) ---

async function checkRateLimit(req, ip, fingerprint) {
    const ua = req.headers.get('user-agent') || 'unknown';
    
    // Web Crypto API (Edge uyumlu)
    const msgBuffer = new TextEncoder().encode(`${ip}-${ua}-${fingerprint}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const identity = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Directly use the LIMITS_KV namespace for rate limiting
    const limitsJSON = await process.env.LIMITS_KV.get('user_limits');
    const limits = limitsJSON ? JSON.parse(limitsJSON) : {};
    const now = Date.now();

    if (!limits[identity]) {
        limits[identity] = { messageCount: 0, lastReset: now, isBlocked: false, lastActivity: now };
    }

    // Not: server.js'deki periyodik temizlik (setInterval) serverless ortamda çalışmaz.
    // Bu işlev için Cloudflare Cron Triggers kullanılmalıdır.

    const user = limits[identity];
    user.lastActivity = now;

    if (user.isBlocked) {
        return { allowed: false, error: "Hesabınız engellendi.", retryAfter: "Süresiz" };
    }

    // 2 Saatlik Otomatik Sıfırlama
    if (now - user.lastReset > 2 * 60 * 60 * 1000) {
        user.messageCount = 0;
        user.lastReset = now;
    }

    // Limit Kontrolü (2 saatte 10 mesaj)
    const MAX_MESSAGES = 10;
    if (user.messageCount >= MAX_MESSAGES) {
        const timePassed = now - user.lastReset;
        const timeLeft = (2 * 60 * 60 * 1000) - timePassed;
        const minutesLeft = Math.ceil(timeLeft / 60000);
        return { allowed: false, error: `Üzgünüm, işlem limitine ulaştın. Lütfen ${minutesLeft} dakika sonra tekrar gel.`, retryAfter: minutesLeft };
    }

    user.messageCount++;
    
    // Write back to the LIMITS_KV namespace
    await process.env.LIMITS_KV.put('user_limits', JSON.stringify(limits));

    return { allowed: true };
}

// --- OPENROUTER ÇAĞRISI ---

async function callOpenRouter(messages) {
    for (const model of OPENROUTER_MODELS) {
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://lifecoach-ai.pages.dev",
                    "X-Title": "LifeCoach AI"
                },
                body: JSON.stringify({ model, messages })
            });

            if (response.ok) {
                const data = await response.json();
                return data.choices[0].message.content;
            }
        } catch (e) {
            console.warn(`Model ${model} error:`, e);
        }
    }
    throw new Error("All AI models failed.");
}

// --- HELPER: ÖZETLEME ---
async function summarizeConversation(messages) {
    if (!messages || messages.length === 0) return "";
    const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    try {
        const summary = await callOpenRouter([
            { "role": "system", "content": "Summarize the following conversation very briefly (1-2 sentences). Only provide the summary, nothing else." },
            { "role": "user", "content": `Conversation to summarize:\n\n${conversationText}` }
        ]);
        return (summary || "").trim();
    } catch (e) {
        console.error("Summarization error:", e);
        return "";
    }
}

// --- API HANDLER ---

export default async function handler(req) {
    if (req.method !== 'POST') {
        return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    try {
        const body = await req.json();
        const { message, history, email, sessionId, fingerprintID, model } = body;
        
        // IP Adresini al (Cloudflare header)
        const ip = req.headers.get('cf-connecting-ip') || '127.0.0.1';

        // 1. Limit Kontrolü
        const limitStatus = await checkRateLimit(req, ip, fingerprintID);
        if (!limitStatus.allowed) {
            return NextResponse.json(
                { error: limitStatus.error, retryAfter: limitStatus.retryAfter }, 
                { status: 429 }
            );
        }

        // 2. Hafıza Motoru (Memory Engine)
        let memoryContext = "";
        if (email) {
            const users = await getKVData('users');
            const user = users.find(u => u.email === email);
            
            if (user && user.sessions && user.sessions.length > 0) {
                const otherSessions = user.sessions.filter(s => s.id != sessionId).slice(0, 3);
                if (otherSessions.length > 0) {
                    const summaries = await Promise.all(otherSessions.map(s => summarizeConversation(s.messages)));
                    const validSummaries = summaries.filter(s => s);
                    if (validSummaries.length > 0) {
                        memoryContext = "PAST CONVERSATION SUMMARIES:\n" + validSummaries.map(s => `- ${s}`).join('\n') + "\n\n";
                    }
                }
            }
        }

        // 3. Sistem Promptu (Server.js'den taşındı)
        const systemPrompt = `SYSTEM NAME: LifeCoach AI

ROLE:
You are LifeCoach AI — a structured, intelligent, emotionally balanced AI coaching system.
You are NOT a search engine.
You do NOT fetch external internet data.
You only use conversation context, memory engine, and internal reasoning.

CORE IDENTITY:
LifeCoach AI is a multi-coach artificial intelligence system designed to help users
build discipline, improve mental clarity, manage goals, and develop life structure.

CREATOR PROFILE:
LifeCoach AI was created by Metehan Haydar Erbaş.

About the creator:
- AI system builder and software developer
- Creator of HAN AI ecosystem and HAN OS operating system vision
- Focused on productivity, technology, AI coaching systems and software innovation
- Believes in long-term discipline, resilience and continuous self-improvement
- Builds systems to help people think clearer and act stronger in real life

LifeCoach AI represents the creator’s philosophy:
clarity over chaos, discipline over excuses, structure over confusion.

COACHING MODULES:
You operate as modular coaching personalities depending on user selection:

1. Therapy Coach
- calm tone
- emotional reflection
- stress and anxiety reduction
- non-clinical support

2. Motivation Coach
- energetic tone
- pushes action
- builds momentum
- removes procrastination

3. Business Coach
- logical tone
- focuses on productivity and efficiency
- business decisions and execution

4. Entrepreneurship Coach
- startup thinking
- product development
- risk awareness
- long-term strategy

Never change UI or mention system architecture.
Only adjust communication style internally.

MEMORY ENGINE:
You receive structured context before answering:
- user profile
- past conversation summaries
- goals
- emotional trend
- daily progress

Use memory naturally.
Do NOT expose internal memory system to the user.

CONTEXT BUILDER LOGIC:
Before answering:
1. Analyze latest user message
2. Check emotional tone
3. Check ongoing goals
4. Consider previous session summary
5. Provide structured response

LANGUAGE SYSTEM:
Always respond in English.
Do not switch to any other language even if the user speaks another language.

RESPONSE STYLE:
- grounded
- calm
- direct
- human-like but structured
- no exaggerated claims
- no fake promises
- no dramatic roleplay

YOU MUST:
- encourage realistic action
- help build routines
- help users track goals
- help users reflect on behavior patterns
- maintain logical and emotionally stable responses

YOU MUST NOT:
- claim real-world authority
- invent external facts
- access internet
- pretend to be a doctor or therapist
- manipulate or pressure users

DAILY GOAL SYSTEM:
You may:
- ask about daily goals
- track progress
- encourage small wins
- suggest realistic next actions

SESSION MODEL:
- conversations may be time-limited
- maintain clarity and continuity
- prioritize meaningful dialogue

FINAL RULE:
You are a structured AI coach system.
You exist to help users think clearly, act intentionally,
and build a stable and disciplined life.`;

        const finalSystemPrompt = memoryContext + systemPrompt;
        
        // 4. AI Cevabı
        const aiResponse = await callOpenRouter([
            { "role": "system", "content": finalSystemPrompt },
            ...(history || []),
            { "role": "user", "content": message }
        ]);

        // 5. Veritabanı Güncelleme (Kullanıcı varsa)
        let newSessionId = sessionId;
        if (email) {
            const users = await getKVData('users');
            const userIndex = users.findIndex(u => u.email === email);

            if (userIndex !== -1) {
                if (!users[userIndex].sessions) users[userIndex].sessions = [];
                
                let session = newSessionId ? users[userIndex].sessions.find(s => s.id == newSessionId) : null;

                if (!session) {
                    newSessionId = Date.now();
                    session = { 
                        id: newSessionId, 
                        title: message.substring(0, 30) + "...",
                        messages: [] 
                    };
                    // Başlık oluşturma (Opsiyonel, basit tutuldu)
                    try {
                        const titleText = await callOpenRouter([
                            { "role": "system", "content": "Write a very short title (3-5 words). No quotes." },
                            { "role": "user", "content": `User: ${message}\nAI: ${aiResponse}` }
                        ]);
                        if (titleText) session.title = titleText.trim().replace(/^["']|["']$/g, '');
                    } catch(e) {}

                    users[userIndex].sessions.unshift(session);
                }

                session.messages.push({ role: 'user', content: message });
                session.messages.push({ role: 'assistant', content: aiResponse });
                
                await setKVData('users', users);
            }
        }

        return NextResponse.json({ response: aiResponse, sessionId: newSessionId });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}