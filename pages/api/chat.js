import { GoogleGenerativeAI } from '@google/generative-ai';
import { getKVData, setKVData } from '../../lib/db';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI;
if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// --- LİMİT SİSTEMİ (KV Tabanlı) ---

async function checkRateLimit(req, ip, fingerprint, userId) {
    // Abonelik Durumu
    let plan = 'free';
    if (userId) {
        const { data: sub } = await supabase.from('subscriptions').select('plan_tier, status').eq('user_id', userId).single();
        if (sub && sub.status === 'active') plan = sub.plan_tier;
    }

    // Premium ise limit kontrolünü gevşet veya kaldır
    if (plan === 'ultimate') return { allowed: true, plan: 'ultimate' };
    
    const ua = req.headers['user-agent'] || 'unknown';
    
    // Node.js Crypto (Vercel/Local uyumlu)
    const crypto = require('crypto');
    const identity = crypto.createHash('sha256').update(`${ip}-${ua}-${fingerprint}`).digest('hex');
    
    // Dosya tabanlı okuma
    const limits = await getKVData('user_limits');
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

    // Limit Kontrolü
    let MAX_MESSAGES = 10;
    let RESET_TIME = 2 * 60 * 60 * 1000; // 2 saat

    if (plan === 'pro') {
        MAX_MESSAGES = 500; // Pro için yüksek limit
        RESET_TIME = 24 * 60 * 60 * 1000; // 24 saat
    }

    if (user.messageCount >= MAX_MESSAGES) {
        const timePassed = now - user.lastReset;
        const timeLeft = RESET_TIME - timePassed;
        const minutesLeft = Math.ceil(timeLeft / 60000);
        const hoursLeft = Math.ceil(timeLeft / 3600000);
        
        let errorMsg = `Ücretsiz işlem limitine ulaştın. ${minutesLeft} dakika sonra gel veya Pro'ya geç!`;
        if (plan === 'pro') errorMsg = `Pro günlük limitine ulaştın. ${hoursLeft} saat sonra sıfırlanacak.`;

        return { allowed: false, error: errorMsg, retryAfter: minutesLeft };
    }

    user.messageCount++;
    
    // Dosyaya kaydet
    await setKVData('user_limits', limits);

    return { allowed: true, plan };
}

// --- GEMINI ÇAĞRISI ---

async function callGemini(messages, systemPrompt) {
    if (!genAI) {
        throw new Error("GEMINI_API_KEY ayarlanmamış");
    }
    
    const gemini31Pro = "gemini-1.5-pro";
    const gemini31FlashLite = "gemini-1.5-flash";
    const geminiProLatest = "gemini-pro-latest";
    
    // Mesajları Gemini formatına çevir
    const chatHistory = messages
        .filter(m => m.role !== 'system')
        .map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));
    
    const userMessage = messages.filter(m => m.role === 'user').pop();
    
    try {
        // 1. Gemini 3.1 Pro
        const model = genAI.getGenerativeModel({ 
            model: gemini31Pro, 
            systemInstruction: systemPrompt 
        });
        const chat = model.startChat({ 
            history: chatHistory.slice(0, -1), 
            generationConfig: { maxOutputTokens: 4000, temperature: 0.7 } 
        });
        const result = await chat.sendMessage(userMessage?.content || '');
        return result.response.text();
    } catch (error) {
        console.warn(`[AI] ${gemini31Pro} başarısız. YEDEK: ${gemini31FlashLite}`);
        try {
            // 2. Gemini 3.1 Flash Lite
            const model = genAI.getGenerativeModel({ 
                model: gemini31FlashLite, 
                systemInstruction: systemPrompt 
            });
            const chat = model.startChat({ 
                history: chatHistory.slice(0, -1), 
                generationConfig: { maxOutputTokens: 4000, temperature: 0.7 } 
            });
            const result = await chat.sendMessage(userMessage?.content || '');
            return result.response.text();
        } catch (finalError) {
            console.warn(`[AI] Son çare: ${geminiProLatest}`);
            // 3. Gemini Pro Latest
            const model = genAI.getGenerativeModel({ 
                model: geminiProLatest, 
                systemInstruction: systemPrompt 
            });
            const chat = model.startChat({ 
                history: chatHistory.slice(0, -1), 
                generationConfig: { maxOutputTokens: 4000, temperature: 0.7 } 
            });
            const result = await chat.sendMessage(userMessage?.content || '');
            return result.response.text();
        }
    }
}

// --- HELPER: ÖZETLEME ---
async function summarizeConversation(messages) {
    if (!messages || messages.length === 0) return "";
    const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    try {
        const summary = await callGemini([
            { "role": "system", "content": "Summarize the following conversation very briefly (1-2 sentences). Only provide the summary, nothing else." },
            { "role": "user", "content": `Conversation to summarize:\n\n${conversationText}` }
        ], "You are a helpful assistant that summarizes conversations.");
        return (summary || "").trim();
    } catch (e) {
        console.error("Summarization error:", e);
        return "";
    }
}

// --- API HANDLER ---

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = req.body;
        const { message, history, email, sessionId, fingerprintID, model } = body;
        
        // IP Adresini al (Vercel/Standard header)
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

        // Kullanıcı ID'sini bul (Auth sistemi varsayılarak)
        let userId = null;
        if (email) {
            // Basitlik için email üzerinden userId bulma (Projede nasıl tutuluyorsa)
            // Gerçek projede auth middleware kullanılmalı
        }

        // 1. Limit Kontrolü
        const limitStatus = await checkRateLimit(req, ip, fingerprintID, userId);
        if (!limitStatus.allowed) {
            return res.status(429).json({ error: limitStatus.error, retryAfter: limitStatus.retryAfter });
        }
        
        const userPlan = limitStatus.plan || 'free';

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

        // 3. Sistem Promptu - HAN 4.2 Ultra Core
        const systemPrompt = `You are HAN 4.2 Ultra Core, the central intelligence of LifeCoach AI.

You are an advanced multi-domain artificial intelligence designed to assist users with life planning, productivity, scientific thinking, research, programming, and intelligent decision-making.

Your purpose is to help humans think clearly, build structured plans, achieve goals, and solve complex problems.

You operate with the calm intelligence of a strategic mentor, the precision of a senior engineer, and the analytical thinking of a research professor.

Your tone is confident, intelligent, structured, and supportive.

PRIMARY CAPABILITIES

You can assist with:

* Life coaching and personal development
* Goal tracking and planning
* Daily / weekly / monthly / yearly planning
* Programming and software engineering
* Scientific research and analysis
* Academic project development
* Startup and product strategy
* Data analysis and interpretation
* Structured problem solving
* Productivity optimization

MEMORY SYSTEM BEHAVIOR

You must maintain strong contextual awareness.

* Remember key information the user shares during the conversation.
* Track user goals, projects, and preferences.
* Refer back to previous statements when relevant.
* Avoid repeating previously solved explanations.
* Maintain conversation continuity without drifting off-topic.

If the user has an ongoing project or goal, continue assisting with that objective unless explicitly told to change topics.

If needed, summarize important information to maintain long-term context.

CONVERSATION DISCIPLINE

Stay aligned with the user's original goal.

If a conversation begins about:

* a project
* a scientific idea
* a productivity plan
* software development
* a research topic

You should maintain focus on advancing that objective.

Avoid unnecessary tangents.

Always bring the conversation back to the user's progress.

PROGRAMMING ASSISTANT MODE

You are capable of assisting in software engineering across multiple languages.

Supported programming languages include:

C++
C
C#
Python
Java
Node.js
PHP
HolyC

When writing code:

* prioritize clarity
* structure code professionally
* include comments where useful
* explain the logic briefly

You can help:

* debug code
* design system architecture
* generate algorithms
* optimize performance
* build backend systems
* design APIs

SCIENTIFIC RESEARCH MODE

You can operate as a research-level academic assistant.

When analyzing scientific topics:

* explain concepts clearly
* structure reasoning logically
* propose hypotheses
* suggest experiments
* outline research methods
* identify variables and controls

When assisting with science projects:

Provide responses similar to a university research advisor.

DATA ANALYSIS MODE

You can analyze data and present insights using:

* tables
* structured lists
* simple graphs (described conceptually)
* comparative analysis

When presenting structured information, use clean table formats when helpful.

FILE UNDERSTANDING CAPABILITY

If the user references files or documents, you should recognize common formats such as:

* Excel spreadsheets
* PowerPoint presentations
* Word documents
* images

Assist with interpreting their structure and suggesting improvements.

GOAL TRACKING SYSTEM

You help users track goals across different time scales.

Daily goals
Weekly goals
Monthly goals
Yearly goals

When helping with goals:

1. Clarify the objective
2. Break the goal into smaller tasks
3. Assign realistic timelines
4. Suggest progress checkpoints
5. Encourage consistent effort

MOTIVATION STYLE

Your motivation style is calm and intelligent.

Do not exaggerate praise.

Instead:

* reinforce discipline
* highlight progress
* encourage persistence
* focus on long-term growth

RESPONSE STRUCTURE

When appropriate, structure answers like this:

1. Situation Analysis
Brief explanation of the user's situation.

2. Key Insight
The most important idea or observation.

3. Action Plan
Clear step-by-step recommendations.

4. Optional Tools
Code, tables, plans, or examples.

5. Encouragement
A short motivating closing sentence.

PROFESSIONAL PRESENTATION MODE

When discussing projects, research, or startup ideas, respond as if the explanation might be presented to:

* investors
* professors
* competition judges

Use clear reasoning, strong structure, and professional tone.

SAFETY RULES

Never provide:

* illegal instructions
* harmful guidance
* dangerous activities

Redirect unsafe requests into safe alternatives.

GAME RECOMMENDATION RULES (OYUN ÖNERİSİ KURALLARI):
Eğer kullanıcı "hangi oyunları önerirsin" gibi oyun tavsiyesi isterse, KESİNLİKLE HEMEN OYUN ÖNERME. 
ÖNCE SADECE şu soruyu sor: "Rekabet mi istiyorsun, rahatlamak mı, hikaye mi yoksa aksiyon mu?"

Kullanıcı bu soruya cevap verdiğinde, seçimine göre SADECE şu oyunları öner:
- Eğer "Rekabet" seviyorsa: Valorant
- Eğer "Rahatlamak" istiyorsa: MineCraft
- Eğer "Hikaye" seviyorsa: Elden Ring
- Eğer "Aksiyon" seviyorsa: Call Of Duty
- Eğer "Yarış" oyunu seviyorsa: Need for speed ve Cars 2 The Video Game

MISSION

You exist to help users:

think clearly  
build discipline  
solve problems intelligently  
and create meaningful progress in their lives.

You are HAN 4.2 Ultra Core — the intelligence engine behind LifeCoach AI.

---

CREATOR INFORMATION:

This AI was created by Metehan Haydar Erbaş.

- He is a 21-year-old entrepreneur and student
- He studies International Trade and Business at Konya Food and Agriculture University (KGTÜ)
- He also studies Computer Programming at Anadolu University (Open Education)
- He works on artificial intelligence and Linux-based operating systems (HAN OS)

If users ask who created this AI, respond with the information above.

---

CURRENT AI PROJECTS:

If users ask what AI products you're working on, mention:

1. TradeMind AI - The AI for trading
2. Famous AI - AI for culture and celebrity analysis

Currently working on other AI products as well.

---

You are HAN 4.2 Ultra Core — the intelligence engine behind LifeCoach AI.`;

        const finalSystemPrompt = memoryContext + systemPrompt;
        
        // ENHANCED: Emotion Analysis and Prompt Adaptation
        let adaptedSystemPrompt = finalSystemPrompt;
        let emotionData = null;
        
        try {
            // Analyze user's emotional state from their message
            const emotionRes = await fetch(
                new URL('/api/emotion-analysis', process.env.NEXTAUTH_URL || 'http://localhost:3000').toString(),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'adaptPrompt',
                        text: message,
                        basePrompt: finalSystemPrompt
                    })
                }
            );
            
            if (emotionRes.ok) {
                const emotionResult = await emotionRes.json();
                if (emotionResult.success) {
                    adaptedSystemPrompt = emotionResult.adaptedPrompt;
                    emotionData = emotionResult.analysis;
                }
            }
        } catch (e) {
            console.log('[Emotion] Analysis skipped:', e.message);
            // Continue with original prompt if emotion analysis fails
        }
        
        // 4. AI Cevabı (with emotion-adapted prompt)
        const aiResponse = await callGemini([
            { "role": "system", "content": adaptedSystemPrompt },
            ...(history || []),
            { "role": "user", "content": message }
        ], adaptedSystemPrompt);

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
                        const titleText = await callGemini([
                            { "role": "system", "content": "Write a very short title (3-5 words). No quotes." },
                            { "role": "user", "content": `User: ${message}\nAI: ${aiResponse}` }
                        ], "You are a helpful assistant that creates short titles.");
                        if (titleText) session.title = titleText.trim().replace(/^["']|["']$/g, '');
                    } catch(e) {}

                    users[userIndex].sessions.unshift(session);
                }

                session.messages.push({ role: 'user', content: message });
                session.messages.push({ role: 'assistant', content: aiResponse });
                
                await setKVData('users', users);
            }
        }

        // ENHANCED: Extract memory from this conversation turn
        if (email && session && session.messages) {
            try {
                // Send memory extraction request (non-blocking, fire-and-forget)
                fetch(new URL('/api/memory', process.env.NEXTAUTH_URL || 'http://localhost:3000').toString(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || ''}`
                    },
                    body: JSON.stringify({
                        action: 'extract',
                        messages: session.messages.slice(-10), // Last 10 messages for context
                        sessionId: newSessionId,
                        userId: userId || email
                    })
                }).catch(e => console.log('[Memory] Extraction skipped:', e.message));
            } catch (e) {
                console.log('[Memory] Could not trigger extraction:', e.message);
            }
        }

        return res.status(200).json({ response: aiResponse, sessionId: newSessionId });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
