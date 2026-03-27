import { GoogleGenerativeAI } from '@google/generative-ai';
import { getKVData, setKVData } from '../../lib/db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI;
if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// --- LİMİT SİSTEMİ (KV Tabanlı) ---

async function checkRateLimit(req, ip, fingerprint) {
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

    // Limit Kontrolü (2 saatte 10 mesaj)
    const MAX_MESSAGES = 10;
    if (user.messageCount >= MAX_MESSAGES) {
        const timePassed = now - user.lastReset;
        const timeLeft = (2 * 60 * 60 * 1000) - timePassed;
        const minutesLeft = Math.ceil(timeLeft / 60000);
        return { allowed: false, error: `Üzgünüm, işlem limitine ulaştın. Lütfen ${minutesLeft} dakika sonra tekrar gel.`, retryAfter: minutesLeft };
    }

    user.messageCount++;
    
    // Dosyaya kaydet
    await setKVData('user_limits', limits);

    return { allowed: true };
}

// --- GEMINI ÇAĞRISI ---

async function callGemini(messages, systemPrompt) {
    if (!genAI) {
        throw new Error("GEMINI_API_KEY ayarlanmamış");
    }
    
    const gemini31Pro = "gemini-3.1-pro-preview-customtools";
    const gemini31FlashLite = "gemini-3.1-flash-lite-preview";
    const gemini15Pro = "gemini-1.5-pro-latest";
    
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
            console.warn(`[AI] Son çare: ${gemini15Pro}`);
            // 3. Gemini 1.5 Pro
            const model = genAI.getGenerativeModel({ 
                model: gemini15Pro, 
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

        // 1. Limit Kontrolü
        const limitStatus = await checkRateLimit(req, ip, fingerprintID);
        if (!limitStatus.allowed) {
            return res.status(429).json({ error: limitStatus.error, retryAfter: limitStatus.retryAfter });
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
        
        // 4. AI Cevabı
        const aiResponse = await callGemini([
            { "role": "system", "content": finalSystemPrompt },
            ...(history || []),
            { "role": "user", "content": message }
        ], finalSystemPrompt);

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

        return res.status(200).json({ response: aiResponse, sessionId: newSessionId });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
