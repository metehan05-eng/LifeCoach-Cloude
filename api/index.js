import express from 'express';
import path from 'path';
import cors from 'cors';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getKVData, setKVData } from '../lib/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import * as pdf from 'pdf-parse';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OAuth2Client } from 'google-auth-library';

// __dirname ES Module çözümü
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- AYARLAR ve SABİTLER ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY; // OpenRouter Desteği
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "GOOGLE_CLIENT_ID_BURAYA";

let genAI;
if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

if (!GEMINI_API_KEY && !OPENROUTER_API_KEY) {
    console.warn("UYARI: Hiçbir AI API Anahtarı (Gemini veya OpenRouter) ayarlanmamış. Sohbet çalışmayabilir.");
}

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Rate Limit Config
const RATE_LIMIT_CONFIG = {
    free: { messageLimit: 10, windowMs: 3600000 },
    premium: { messageLimit: 1000, windowMs: 3600000 }
};

// In-memory store for rate limiting
const messageStore = new Map();

// --- MIDDLEWARE TANIMLAMALARI ---

// Optional Auth: Token varsa kullanıcıyı ekler, yoksa devam eder.
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next(); // Token yoksa devam et (anonim kullanıcı)
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (!err) {
            req.user = user; // Token geçerliyse kullanıcıyı ekle
        }
        next(); // Hata olsa da devam et
    });
};

// Auth: Token'ı doğrular ve kullanıcıyı ekler. Token yoksa veya geçersizse hata döner.
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token gerekli' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Geçersiz token' });
        }
        req.user = user;
        next();
    });
};

// Rate Limit: Kullanıcı bazlı mesaj limitini kontrol eder.
const rateLimitMiddleware = async (req, res, next) => {
    if (!req.user) return next();

    const userId = req.user.id;
    const userType = req.user.type || 'free';
    const config = RATE_LIMIT_CONFIG[userType];

    const now = Date.now();
    const userData = messageStore.get(userId) || { count: 0, resetTime: now + config.windowMs };

    if (now > userData.resetTime) {
        userData.count = 0;
        userData.resetTime = now + config.windowMs;
    }

    if (userData.count >= config.messageLimit) {
        return res.status(429).json({
            error: 'Rate limit aşıldı',
            resetTime: userData.resetTime
        });
    }

    userData.count++;
    messageStore.set(userId, userData);
    next();
};

// --- MIDDLEWARE ve STATIC DOSYALAR ---
app.use(express.static(path.join(process.cwd(), 'public')));

// === API ROTALARI ===

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Frontend config (sadece client ID; .env'den alınır, Vercel'de güvenli)
app.get('/api/config', (req, res) => {
    res.json({
        googleClientId: process.env.GOOGLE_CLIENT_ID || ''
    });
});

// Chat endpoint
app.post('/api/chat', optionalAuth, async (req, res) => {
    try {
        if (!genAI) {
            return res.status(500).json({ error: 'Yapay zeka hizmeti yapılandırılmamış. Sunucu yöneticisi GEMINI_API_KEY değişkenini ayarlamalı.' });
        }

        const { message, file, history, systemPrompt, sessionId } = req.body;

        // Default System Prompt - HAN 4.2 Ultra Core
        const defaultSystemPrompt = `You are HAN 4.2 Ultra Core, the central intelligence of LifeCoach AI.

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

You are HAN 4.2 Ultra Core — the intelligence engine behind LifeCoach AI. (Operating on Gemini 3.1 Pro)

---

SMART FILE GENERATION ENGINE:

When a user asks you to "create", "generate", or "build" an Excel, Word, or PowerPoint file:
1. Provide the content preview in your response.
2. At the end of your response, output a JSON block with the language \`json-action\`.

EXCEL:
\`\`\`json-action
{
  "type": "excel",
  "filename": "Dosya.xlsx",
  "data": [["Başlık1", "Başlık2"], ["Veri1", "Veri2"]]
}
\`\`\`

WORD:
\`\`\`json-action
{
  "type": "word",
  "filename": "Belge.docx",
  "content": "Belge metni..."
}
\`\`\`

POWERPOINT:
\`\`\`json-action
{
  "type": "ppt",
  "filename": "Sunum.pptx",
  "slides": [{"title": "Slayt 1", "content": ["Nokta 1"]}]
}
\`\`\`

---

SPECIALIZED OCR & DATA EXTRACTION RULES:

1. When a user uploads a handwritten or printed document (like a class list):
   - Be EXTREMELY precise with names and numbers.
   - Do NOT guess characters you cannot read clearly. 
   - If a name is "Zeynep", do NOT hallucinate a surname like "Hacıahmet" or "Hiçyılmaz" unless it is explicitly written.
   - Maintain the case (Uppercase/Lowercase) as seen in the document.
   - For Turkish names, pay close attention to characters: İ, ı, Ş, ş, Ğ, ğ, Ç, ç, Ö, ö, Ü, ü.

2. STRUCTURED OUTPUT:
   - When extracting a list, ALWAYS use a Markdown Table format.
   - Example:
     | No | Ad Soyad | Numara |
     |---|---|---|
     | 1 | Ahmet Yılmaz | 123 |
   - Using tables allows the system to export the data to Excel correctly.

3. ZERO HALLUCINATION POLICY:
   - It is better to say "[Okunamadı]" than to invent a name.
   - Do NOT combine parts of different names.

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

        // Use provided systemPrompt or fallback to default
        const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

        if (!message && !file) {
            return res.status(400).json({ error: 'Mesaj veya dosya gerekli' });
        }

        // Sohbet geçmişini Gemini formatına çevir
        const chatHistory = (history || []).slice(-10).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const userMessageParts = [];
        let userTextMessage = message || ''; // Kullanıcının yazdığı mesajla başla

        if (file && file.data) {
            const mimeType = file.type;
            const base64Data = file.data.split(',')[1];

            if (!base64Data) {
                return res.status(400).json({ error: 'Dosya verisi bozuk veya eksik.' });
            }

            if (mimeType.startsWith('image/')) {
                // Eğer dosya bir resimse, ayrı bir 'part' olarak ekle
                userMessageParts.push({
                    inlineData: { data: base64Data, mimeType: mimeType }
                });
            } else {
                // Diğer dosya türleri için metin içeriğini çıkarmaya çalış
                let extractedText = '';
                if (mimeType === 'application/pdf') {
                    const pdfBuffer = Buffer.from(base64Data, 'base64');
                    const data = await pdf(pdfBuffer);
                    extractedText = data.text;
                } else if (mimeType.startsWith('text/')) {
                    const textBuffer = Buffer.from(base64Data, 'base64');
                    extractedText = textBuffer.toString('utf-8');
                } else if (file.name && file.name.endsWith('.docx')) {
                    const docxBuffer = Buffer.from(base64Data, 'base64');
                    const mammothResult = await mammoth.extractRawText({ buffer: docxBuffer });
                    extractedText = mammothResult.value;
                }

                if (extractedText) {
                    // Çıkarılan metni kullanıcı mesajına ekle
                    const fileInstruction = `\n\n--- DOSYA İÇERİĞİ ---\n${extractedText}\n--- DOSYA SONU ---`;
                    userTextMessage += fileInstruction;
                } else {
                    // Resim değilse ve metin çıkarılamadıysa hata ver
                    return res.status(400).json({ error: `Desteklenmeyen dosya türü: ${mimeType}` });
                }
            }
        }

        // Nihai metin mesajını (dosya içeriği dahil olabilir) bir 'part' olarak ekle
        if (userTextMessage) {
            userMessageParts.unshift({ text: userTextMessage }); // Metni her zaman başa koy
        }

        // --- AI Model Logic (OpenRouter & Gemini Fallback) ---
        let aiResponse;
        let usedModel;

        const orModel = "google/gemini-2.0-pro-exp-02-05:free"; // OpenRouter öncelikli model
        const primary31 = "gemini-3.1-pro-preview";
        const pro20 = "gemini-2.0-pro";
        const pro15 = "gemini-1.5-pro-latest";
        const flash15 = "gemini-1.5-flash-latest";

        try {
            // 1. Önce OpenRouter dene (Eğer anahtar varsa)
            if (OPENROUTER_API_KEY) {
                console.log(`[AI] OpenRouter deneniyor: ${orModel}`);
                const orMessages = [
                    { role: "system", content: finalSystemPrompt },
                    ...chatHistory.map(h => ({
                        role: h.role === 'model' ? 'assistant' : 'user',
                        content: h.parts[0].text
                    })),
                    {
                        role: "user",
                        content: userMessageParts.map(p => {
                            if (p.text) return { type: "text", text: p.text };
                            if (p.inlineData) return { 
                                type: "image_url", 
                                image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } 
                            };
                            return null;
                        }).filter(Boolean)
                    }
                ];

                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                        "HTTP-Referer": "https://han-ai.dev",
                        "X-Title": "Han AI LifeCoach",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: orModel,
                        messages: orMessages,
                        temperature: 0.7,
                        max_tokens: 4000
                    })
                });

                const data = await response.json();
                if (data.choices && data.choices[0]) {
                    aiResponse = data.choices[0].message.content;
                    usedModel = "OpenRouter: " + orModel;
                } else {
                    throw new Error(data.error?.message || "OpenRouter response error");
                }
            } else {
                throw new Error("OpenRouter Key Yok");
            }
        } catch (orError) {
            console.warn(`[AI] OpenRouter başarısız veya ayarlanmamış. Gemini'ye geçiliyor... ${orError.message}`);
            
            try {
                // Gemini Fallback Logic
                console.log(`[AI] Gemini Deneniyor: ${primary31}`);
                const model = genAI.getGenerativeModel({ model: primary31, systemInstruction: finalSystemPrompt });
                const chat = model.startChat({ history: chatHistory, generationConfig: { maxOutputTokens: 4000, temperature: 0.7 } });
                const result = await chat.sendMessage(userMessageParts);
                aiResponse = result.response.text();
                usedModel = primary31;
            } catch (error) {
                console.warn(`[AI] ${primary31} başarısız. GÜÇLÜ YEDEK: ${pro15}`);
                try {
                    const model = genAI.getGenerativeModel({ model: pro15, systemInstruction: finalSystemPrompt });
                    const chat = model.startChat({ history: chatHistory, generationConfig: { maxOutputTokens: 4000, temperature: 0.7 } });
                    const result = await chat.sendMessage(userMessageParts);
                    aiResponse = result.response.text();
                    usedModel = pro15;
                } catch (finalError) {
                    console.warn(`[AI] Son çare: ${flash15}`);
                    const model = genAI.getGenerativeModel({ model: flash15, systemInstruction: finalSystemPrompt });
                    const chat = model.startChat({ history: chatHistory, generationConfig: { maxOutputTokens: 3000, temperature: 0.7 } });
                    const result = await chat.sendMessage(userMessageParts);
                    aiResponse = result.response.text();
                    usedModel = flash15;
                }
            }
        }

        let newSessionId = sessionId;

        // Oturum açmış kullanıcılar için sohbeti kaydet
        if (req.user && req.user.email) {
            const user = await getKVData(`user:${req.user.email}`);
            if (user) {
                if (!user.sessions) user.sessions = [];

                let session;
                if (sessionId) {
                    session = user.sessions.find(s => s.id == sessionId);
                }

                if (!session) {
                    newSessionId = Date.now().toString();
                    const title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
                    session = { id: newSessionId, title: title, messages: [] };
                    user.sessions.push(session);
                }

                session.messages.push({ role: 'user', content: message });
                session.messages.push({ role: 'assistant', content: aiResponse });

                // En son 20 oturumu sakla
                user.sessions.sort((a, b) => Number(b.id) - Number(a.id));
                user.sessions = user.sessions.slice(0, 20);

                await setKVData(`user:${req.user.email}`, user);
            }
        }

        return res.json({
            response: aiResponse,
            // Eğer yeni bir oturum oluşturulduysa, ID'sini ön yüze gönder
            sessionId: newSessionId,
            model: usedModel, // Çalışan modelin adını gönder
        });

    } catch (error) {
        console.error('Gemini Chat error:', error);
        res.status(500).json({ error: 'Bir hata oluştu', details: error.message });
    }
});

// Image Generation Endpoint (Nano Banana)
app.post('/api/generate-image', authenticateToken, async (req, res) => {
    try {
        if (!genAI) {
            return res.status(500).json({ error: 'AI not configured' });
        }

        const { prompt, aspectRatio = "1:1" } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt gerekli' });
        }

        console.log(`Generating image for prompt: ${prompt}`);

        // Waffle Modu için Pollinations AI Entegrasyonu (Garantili Çalışır)
        const seed = Math.floor(Math.random() * 1000000);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ", visually stunning, 8k, masterpiece, highly detailed")}?width=1024&height=1024&nologo=true&enhance=true&seed=${seed}`;

        try {
            const imageRes = await fetch(imageUrl);
            if (!imageRes.ok) throw new Error("Pollinations error");
            const buffer = await imageRes.arrayBuffer();
            const base64Image = Buffer.from(buffer).toString('base64');

            return res.json({
                success: true,
                imageData: `data:image/jpeg;base64,${base64Image}`,
                model: "Pollinations AI (Waffle Engine)"
            });
        } catch (error) {
            console.error('Image Gen Error:', error);
            // Fallback: URL olarak dön
            return res.json({
                success: true,
                url: imageUrl,
                model: "Pollinations AI (Direct Link)"
            });
        }

    } catch (error) {
        console.error('Image Generation error:', error);
        res.status(500).json({ error: 'Görüntü oluşturma hatası', details: error.message });
    }
});

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email ve şifre gerekli' });
        }

        const existingUser = await getKVData(`user:${email}`);
        if (existingUser) {
            return res.status(409).json({ error: 'Bu email zaten kayıtlı' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();

        const user = {
            id: userId,
            email,
            name: name || email.split('@')[0],
            password: hashedPassword,
            type: 'free',
            avatar: null, // Varsayılan avatar alanı
            createdAt: new Date().toISOString(),
            sessions: [] // Yeni kullanıcı için boş session dizisi
        };

        await setKVData(`user:${email}`, user);
        await setKVData(`user:id:${userId}`, { email });

        const token = jwt.sign(
            { id: userId, email, type: user.type },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: userId, email, name: user.name, type: user.type, avatar: user.avatar }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Kayıt başarısız' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email ve şifre gerekli' });
        }

        const user = await getKVData(`user:${email}`);

        if (!user) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        }

        // Eğer kullanıcı şifreyle değil, Google gibi bir sosyal medya hesabıyla
        // kayıt olduysa, 'password' alanı olmayacaktır. Bu durumu kontrol et.
        if (!user.password) {
            // Eğer googleId varsa, kullanıcıya Google ile giriş yapmasını söyle.
            if (user.googleId) {
                return res.status(401).json({ error: 'Bu hesap Google ile oluşturulmuştur. Lütfen "Google ile Giriş Yap" butonunu kullanın.' });
            }
            // Şifre yoksa ve sosyal medya ID'si de yoksa, bu beklenmedik bir durumdur.
            // Güvenlik açısından genel bir hata mesajı dönmek en iyisidir.
            return res.status(401).json({ error: 'Geçersiz şifre' });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Geçersiz şifre' });
        }

        const token = jwt.sign(
            { id: user.id, email, type: user.type },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: user.id, email, name: user.name, type: user.type, avatar: user.avatar }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Giriş başarısız' });
    }
});

// Google Login
app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ error: 'Credential gerekli' });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const email = payload.email;
        const name = payload.name;

        let user = await getKVData(`user:${email}`);

        if (!user) {
            const userId = crypto.randomUUID();
            user = {
                id: userId,
                email,
                name,
                type: 'free',
                googleId: payload.sub,
                avatar: payload.picture || null, // Google profil fotoğrafını kaydet
                createdAt: new Date().toISOString(),
                sessions: [] // Yeni kullanıcı için boş session dizisi
            };
            await setKVData(`user:${email}`, user);
            await setKVData(`user:id:${userId}`, { email });
        } else if (!user.avatar && payload.picture) {
            // Daha önce kayıtlı kullanıcıda avatar yoksa, Google fotoğrafını set et
            user.avatar = payload.picture;
            await setKVData(`user:${email}`, user);
        }

        const token = jwt.sign(
            { id: user.id, email, type: user.type },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: user.id, email, name: user.name, type: user.type, avatar: user.avatar }
        });

    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Google girişi başarısız' });
    }
});

// Profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await getKVData(`user:${req.user.email}`);

        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            type: user.type,
            avatar: user.avatar,
            success: true
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Profil bilgisi alınamadı' });
    }
});

// Update Profile
app.post('/api/update-profile', authenticateToken, async (req, res) => {
    try {
        const { newName, newAvatar } = req.body;
        const user = await getKVData(`user:${req.user.email}`);

        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        user.name = newName || user.name;
        user.avatar = newAvatar; // Avatarı boş olsa bile ayarla (silme durumu için)

        await setKVData(`user:${req.user.email}`, user);

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                type: user.type,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Profil güncellenemedi' });
    }
});

// Login Page
app.get('/login', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'login.html'));
});

// Signup Page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'signup.html'));
});

// Forgot Password Page
app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'forgot-password.html'));
});

// --- HELPERS FOR API ---

function calculateStreak(completions) {
    if (!completions || completions.length === 0) return 0;
    const sortedDates = [...completions].sort((a, b) => new Date(b) - new Date(a));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastCompletion = new Date(sortedDates[0]);
    lastCompletion.setHours(0, 0, 0, 0);
    if (lastCompletion < yesterday) return 0;
    let streak = 0;
    let currentDate = lastCompletion.getTime() === today.getTime() ? today : yesterday;
    for (let i = 0; i < sortedDates.length; i++) {
        const completionDate = new Date(sortedDates[i]);
        completionDate.setHours(0, 0, 0, 0);
        if (completionDate.getTime() === currentDate.getTime()) {
            streak++;
            currentDate = new Date(currentDate);
            currentDate.setDate(currentDate.getDate() - 1);
        } else if (completionDate.getTime() < currentDate.getTime()) {
            break;
        }
    }
    return streak;
}

function calculateReflectionStreak(reflections) {
    if (!reflections || reflections.length === 0) return 0;
    const dates = [...new Set(reflections.map(r => r.date))].sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (dates[0] !== today && dates[0] !== yesterdayStr) return 0;
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
        const current = new Date(dates[i - 1]);
        const prev = new Date(dates[i]);
        const diffDays = Math.round((current - prev) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) streak++;
        else break;
    }
    return streak;
}

function calculateFocusStreak(sessions) {
    if (!sessions || sessions.length === 0) return 0;
    const completedSessions = sessions.filter(s => s.status === 'completed');
    if (completedSessions.length === 0) return 0;
    const dates = [...new Set(completedSessions.map(s => s.date))].sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (dates[0] !== today && dates[0] !== yesterdayStr) return 0;
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
        const current = new Date(dates[i - 1]);
        const prev = new Date(dates[i]);
        const diffDays = Math.round((current - prev) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) streak++;
        else break;
    }
    return streak;
}

// --- HABITS API ---

app.get('/api/habits', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const allHabits = await getKVData('habits');
        const userHabits = allHabits[userId] || [];
        const today = new Date().toISOString().split('T')[0];
        const habitsWithStats = userHabits.map(habit => {
            const completions = habit.completions || [];
            return {
                ...habit,
                streak: calculateStreak(completions),
                completedToday: completions.includes(today)
            };
        });
        habitsWithStats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(habitsWithStats);
    } catch (error) {
        res.status(500).json({ error: 'Alışkanlıklar yüklenirken hata oluştu' });
    }
});

app.post('/api/habits', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { action, id, name, description, frequency, icon, color } = req.body;
        const allHabits = await getKVData('habits');
        const userHabits = allHabits[userId] || [];

        if (action === 'toggle') {
            const habitIndex = userHabits.findIndex(h => h.id === id);
            if (habitIndex === -1) return res.status(404).json({ error: 'Alışkanlık bulunamadı' });
            const today = new Date().toISOString().split('T')[0];
            const completions = userHabits[habitIndex].completions || [];
            let updatedCompletions = completions.includes(today) ? completions.filter(d => d !== today) : [...completions, today];
            userHabits[habitIndex] = { ...userHabits[habitIndex], completions: updatedCompletions, streak: calculateStreak(updatedCompletions), updatedAt: new Date().toISOString() };
            allHabits[userId] = userHabits;
            await setKVData('habits', allHabits);
            return res.json(userHabits[habitIndex]);
        }

        if (!name) return res.status(400).json({ error: 'Alışkanlık adı gereklidir' });
        const newHabit = {
            id: Date.now().toString(),
            name, description: description || '', frequency: frequency || 'daily',
            icon: icon || 'star', color: color || '#2DD4BF', completions: [], streak: 0,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        userHabits.push(newHabit);
        allHabits[userId] = userHabits;
        await setKVData('habits', allHabits);
        res.status(201).json(newHabit);
    } catch (error) {
        res.status(500).json({ error: 'İşlem sırasında hata oluştu' });
    }
});

app.put('/api/habits', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id, name, description, frequency, icon, color } = req.body;
        const allHabits = await getKVData('habits');
        const userHabits = allHabits[userId] || [];
        const index = userHabits.findIndex(h => h.id === id);
        if (index === -1) return res.status(404).json({ error: 'Alışkanlık bulunamadı' });
        userHabits[index] = { ...userHabits[index], name, description, frequency, icon, color, updatedAt: new Date().toISOString() };
        allHabits[userId] = userHabits;
        await setKVData('habits', allHabits);
        res.json(userHabits[index]);
    } catch (error) {
        res.status(500).json({ error: 'Güncelleme hatası' });
    }
});

app.delete('/api/habits', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.body;
        const allHabits = await getKVData('habits');
        allHabits[userId] = (allHabits[userId] || []).filter(h => h.id !== id);
        await setKVData('habits', allHabits);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Silme hatası' });
    }
});

// --- PLANS API ---

app.get('/api/plans', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const allPlans = await getKVData('plans');
        const userPlans = allPlans[userId] || [];
        userPlans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(userPlans);
    } catch (error) {
        res.status(500).json({ error: 'Planlar yüklenirken hata oluştu' });
    }
});

app.post('/api/plans', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, type, description, tasks, aiGenerated } = req.body;
        if (!title || !type) return res.status(400).json({ error: 'Başlık ve tür gereklidir' });
        const allPlans = await getKVData('plans');
        const userPlans = allPlans[userId] || [];
        const newPlan = {
            id: Date.now().toString(), title, type, description: description || '',
            tasks: tasks || [], aiGenerated: aiGenerated || false,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        userPlans.push(newPlan);
        allPlans[userId] = userPlans;
        await setKVData('plans', allPlans);
        res.status(201).json(newPlan);
    } catch (error) {
        res.status(500).json({ error: 'Plan oluşturma hatası' });
    }
});

app.put('/api/plans', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id, action, planId, taskId, status, title, type, description, tasks } = req.body;
        const allPlans = await getKVData('plans');
        const userPlans = allPlans[userId] || [];

        if (action === 'updateTask') {
            const pIdx = userPlans.findIndex(p => p.id === planId);
            if (pIdx === -1) return res.status(404).json({ error: 'Plan bulunamadı' });
            const planTasks = userPlans[pIdx].tasks || [];
            const tIdx = planTasks.findIndex(t => t.id === taskId);
            if (tIdx === -1) return res.status(404).json({ error: 'Görev bulunamadı' });
            planTasks[tIdx] = { ...planTasks[tIdx], status };
            userPlans[pIdx] = { ...userPlans[pIdx], tasks: planTasks, updatedAt: new Date().toISOString() };
            allPlans[userId] = userPlans;
            await setKVData('plans', allPlans);
            return res.json(userPlans[pIdx]);
        }

        const index = userPlans.findIndex(p => p.id === id);
        if (index === -1) return res.status(404).json({ error: 'Plan bulunamadı' });
        userPlans[index] = { ...userPlans[index], title, type, description, tasks, updatedAt: new Date().toISOString() };
        allPlans[userId] = userPlans;
        await setKVData('plans', allPlans);
        res.json(userPlans[index]);
    } catch (error) {
        res.status(500).json({ error: 'Güncelleme hatası' });
    }
});

app.delete('/api/plans', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.body;
        const allPlans = await getKVData('plans');
        allPlans[userId] = (allPlans[userId] || []).filter(p => p.id !== id);
        await setKVData('plans', allPlans);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Silme hatası' });
    }
});

// --- REFLECTIONS API ---

app.get('/api/reflections', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const allReflections = await getKVData('reflections');
        const userReflections = allReflections[userId] || [];
        userReflections.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const today = new Date().toISOString().split('T')[0];
        res.json({
            reflections: userReflections,
            todayReflection: userReflections.find(r => r.date === today),
            streak: calculateReflectionStreak(userReflections),
            totalReflections: userReflections.length
        });
    } catch (error) {
        res.status(500).json({ error: 'Yansımalar hatası' });
    }
});

app.post('/api/reflections', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { content, type, mood, achievements, improvements, tomorrowGoals } = req.body;
        const allReflections = await getKVData('reflections');
        const userReflections = allReflections[userId] || [];
        const today = new Date().toISOString().split('T')[0];
        const existingToday = userReflections.find(r => r.date === today && r.type === (type || 'daily'));
        const newReflection = {
            id: Date.now().toString(), content, type: type || 'daily', mood: mood || 'neutral',
            achievements: achievements || '', improvements: improvements || '', tomorrowGoals: tomorrowGoals || '',
            date: today, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        if (existingToday) {
            const idx = userReflections.findIndex(r => r.id === existingToday.id);
            userReflections[idx] = { ...existingToday, ...newReflection, id: existingToday.id, createdAt: existingToday.createdAt };
        } else {
            userReflections.push(newReflection);
        }
        allReflections[userId] = userReflections;
        await setKVData('reflections', allReflections);
        res.status(201).json(newReflection);
    } catch (error) {
        res.status(500).json({ error: 'Yansıma kaydetme hatası' });
    }
});

app.put('/api/reflections', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id, content, type, mood, achievements, improvements, tomorrowGoals } = req.body;
        const allReflections = await getKVData('reflections');
        const userReflections = allReflections[userId] || [];
        const idx = userReflections.findIndex(r => r.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Bulunamadı' });
        userReflections[idx] = { ...userReflections[idx], content, type, mood, achievements, improvements, tomorrowGoals, updatedAt: new Date().toISOString() };
        allReflections[userId] = userReflections;
        await setKVData('reflections', allReflections);
        res.json(userReflections[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Güncelleme hatası' });
    }
});

app.delete('/api/reflections', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.body;
        const allReflections = await getKVData('reflections');
        allReflections[userId] = (allReflections[userId] || []).filter(r => r.id !== id);
        await setKVData('reflections', allReflections);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Silme hatası' });
    }
});

// --- FOCUS API ---

app.get('/api/focus', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const allFocus = await getKVData('focus');
        const userFocus = allFocus[userId] || [];
        const today = new Date().toISOString().split('T')[0];
        const todaySessions = userFocus.filter(s => s.date === today);
        const totalMinutes = userFocus.reduce((sum, s) => sum + (s.duration || 0), 0);
        res.json({
            sessions: userFocus.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)),
            stats: {
                totalSessions: userFocus.length, totalMinutes,
                todaySessions: todaySessions.length, todayMinutes: todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0),
                currentStreak: calculateFocusStreak(userFocus)
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Odak verisi hatası' });
    }
});

app.post('/api/focus', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { action, duration, startTime, endTime } = req.body;
        const allFocus = await getKVData('focus');
        const userFocus = allFocus[userId] || [];
        if (action === 'start') {
            const newSession = { id: Date.now().toString(), startTime: startTime || new Date().toISOString(), endTime: null, duration: 0, date: new Date().toISOString().split('T')[0], status: 'active' };
            userFocus.push(newSession);
            allFocus[userId] = userFocus;
            await setKVData('focus', allFocus);
            return res.status(201).json(newSession);
        }
        if (action === 'complete') {
            const idx = userFocus.findIndex(s => s.status === 'active');
            if (idx === -1) return res.status(404).json({ error: 'Aktif seans yok' });
            const end = endTime ? new Date(endTime) : new Date();
            const start = new Date(userFocus[idx].startTime);
            const dur = Math.round((end - start) / 60000);
            userFocus[idx] = { ...userFocus[idx], endTime: end.toISOString(), duration: dur, status: 'completed' };
            allFocus[userId] = userFocus;
            await setKVData('focus', allFocus);
            return res.json(userFocus[idx]);
        }
    } catch (error) {
        res.status(500).json({ error: 'Odak seansı hatası' });
    }
});

app.delete('/api/focus', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.body;
        const allFocus = await getKVData('focus');
        allFocus[userId] = (allFocus[userId] || []).filter(s => s.id !== id);
        await setKVData('focus', allFocus);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Silme hatası' });
    }
});

// --- PROGRESS API ---

app.get('/api/progress', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const allGoals = await getKVData('goals') || {};
        const allHabits = await getKVData('habits') || {};
        const allPlans = await getKVData('plans') || {};
        const userGoals = allGoals[userId] || [];
        const userHabits = allHabits[userId] || [];
        const userPlans = allPlans[userId] || [];

        const goalStats = {
            total: userGoals.length,
            completed: userGoals.filter(g => g.status === 'completed').length,
            completionRate: userGoals.length > 0 ? Math.round((userGoals.filter(g => g.status === 'completed').length / userGoals.length) * 100) : 0
        };

        const habitStats = {
            total: userHabits.length,
            completionRate: userHabits.length > 0 ? Math.round((userHabits.reduce((acc, h) => acc + (h.completions?.length || 0), 0) / (userHabits.length * 7)) * 100) : 0
        };

        const planStats = {
            total: userPlans.length,
            completionRate: userPlans.length > 0 ? Math.round((userPlans.reduce((acc, p) => acc + (p.tasks?.filter(t => t.status === 'completed').length || 0), 0) / Math.max(1, userPlans.reduce((acc, p) => acc + (p.tasks?.length || 0), 0))) * 100) : 0
        };

        res.json({ goals: goalStats, habits: habitStats, plans: planStats, productivityScore: Math.round((goalStats.completionRate + habitStats.completionRate + planStats.completionRate) / 3) });
    } catch (error) {
        res.status(500).json({ error: 'İlerleme verisi hatası' });
    }
});

// --- RECOMMENDATIONS API ---

app.get('/api/recommendations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const allGoals = await getKVData('goals') || {};
        const userGoals = allGoals[userId] || [];
        const recs = [];
        if (userGoals.length === 0) recs.push({ type: 'suggestion', title: 'Hedef Belirleyin', message: 'Küçük bir hedefle başlayın.' });
        res.json(recs);
    } catch (error) {
        res.status(500).json({ error: 'Öneriler hatası' });
    }
});

// --- SMART COACH API ---

app.get('/api/smart-coach', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const allGoals = await getKVData('goals') || {};
        const userGoals = allGoals[userId] || [];
        res.json({ score: 75, summary: 'İyi gidiyorsunuz, devam edin!' });
    } catch (error) {
        res.status(500).json({ error: 'Koçluk hatası' });
    }
});

// --- GOALS API ---

app.get('/api/goals', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const allGoals = await getKVData('goals');
        const userGoals = allGoals[userId] || [];
        const today = new Date().toISOString().split('T')[0];
        
        const goalsWithStats = userGoals.map(goal => {
            const completions = goal.completions || [];
            return {
                ...goal,
                completedToday: completions.includes(today),
                completions: completions
            };
        });

        goalsWithStats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(goalsWithStats);
    } catch (error) {
        res.status(500).json({ error: 'Hedefler yüklenirken hata oluştu' });
    }
});

app.post('/api/goals', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, type, description, targetDate } = req.body;
        if (!title || !type) return res.status(400).json({ error: 'Başlık ve tür gereklidir' });
        const allGoals = await getKVData('goals');
        const userGoals = allGoals[userId] || [];
        const newGoal = {
            id: Date.now().toString(), title, type, description: description || '',
            progress: 0, status: 'in-progress', targetDate: targetDate || null,
            completions: [], // Günlük takipler için
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        userGoals.push(newGoal);
        allGoals[userId] = userGoals;
        await setKVData('goals', allGoals);
        res.status(201).json(newGoal);
    } catch (error) {
        res.status(500).json({ error: 'Hedef oluşturma hatası' });
    }
});

app.put('/api/goals', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id, title, type, description, progress, status, targetDate, reflection } = req.body;
        const allGoals = await getKVData('goals');
        const userGoals = allGoals[userId] || [];
        const idx = userGoals.findIndex(g => g.id === id);
        if (idx === -1) return res.status(404).json({ error: 'Hedef bulunamadı' });
        userGoals[idx] = {
            ...userGoals[idx], title, type, description,
            progress: progress !== undefined ? progress : userGoals[idx].progress,
            status, targetDate, reflection: reflection || userGoals[idx].reflection, 
            updatedAt: new Date().toISOString()
        };
        allGoals[userId] = userGoals;
        await setKVData('goals', allGoals);
        res.json(userGoals[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Güncelleme hatası' });
    }
});

// --- GOAL TOGGLE DAY ---
app.post('/api/goals/toggle', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { goalId } = req.body;
        const allGoals = await getKVData('goals');
        const userGoals = allGoals[userId] || [];
        const idx = userGoals.findIndex(g => g.id === goalId);
        
        if (idx === -1) return res.status(404).json({ error: 'Hedef bulunamadı' });
        
        const today = new Date().toISOString().split('T')[0];
        const completions = userGoals[idx].completions || [];
        
        let updatedCompletions;
        if (completions.includes(today)) {
            updatedCompletions = completions.filter(d => d !== today);
        } else {
            updatedCompletions = [...completions, today];
        }
        
        userGoals[idx].completions = updatedCompletions;
        allGoals[userId] = userGoals;
        await setKVData('goals', allGoals);
        res.json({ success: true, completedToday: updatedCompletions.includes(today), completions: updatedCompletions });
    } catch (error) {
        res.status(500).json({ error: 'Günlük işaretleme hatası' });
    }
});

app.delete('/api/goals', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.body;
        const allGoals = await getKVData('goals');
        allGoals[userId] = (allGoals[userId] || []).filter(g => g.id !== id);
        await setKVData('goals', allGoals);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Silme hatası' });
    }
});

// --- SESSION & HISTORY API ---

app.post('/api/history', authenticateToken, async (req, res) => {
    try {
        const email = req.user.email;
        // Kullanıcı verisi user:email anahtarında saklanıyor
        const user = await getKVData(`user:${email}`);
        res.json(user?.sessions ? user.sessions.map(s => ({ id: s.id, title: s.title })) : []);
    } catch (error) {
        res.status(500).json({ error: 'Geçmiş hatası' });
    }
});

app.post('/api/get-session', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const email = req.user.email;
        // Kullanıcı verisi user:email anahtarında saklanıyor
        const user = await getKVData(`user:${email}`);
        const session = user?.sessions?.find(s => s.id == sessionId);
        if (session) res.json(session);
        else res.status(404).json({ error: 'Seans bulunamadı' });
    } catch (error) {
        res.status(500).json({ error: 'Seans hatası' });
    }
});

app.post('/api/delete-session', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const email = req.user.email;
        // Kullanıcı verisi user:email anahtarında saklanıyor
        const user = await getKVData(`user:${email}`);
        if (user && user.sessions) {
            user.sessions = user.sessions.filter(s => s.id != sessionId);
            await setKVData(`user:${email}`, user);
            return res.json({ success: true });
        }
        res.status(404).json({ error: 'Bulunamadı' });
    } catch (error) {
        res.status(500).json({ error: 'Silme hatası' });
    }
});

// --- USER ENGAGEMENT & BADGES ---

app.post('/api/check-in', authenticateToken, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const today = new Date().toDateString();
        const checkInHistory = await getKVData('checkin_history') || {};
        const userHistory = checkInHistory[userEmail] || [];

        if (userHistory.includes(today)) {
            return res.json({ message: 'Zaten bugün check-in yaptınız! 🎉', alreadyCheckedIn: true });
        }

        userHistory.push(today);
        checkInHistory[userEmail] = userHistory;
        await setKVData('checkin_history', checkInHistory);

        // Calculate streak
        let streak = 0;
        const sortedDates = [...userHistory].sort().reverse();
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        let checkDate = new Date(todayDate);
        for (let i = 0; i < sortedDates.length; i++) {
            if (sortedDates[i] === checkDate.toDateString()) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (i === 0 && sortedDates[i] === new Date(todayDate.getTime() - 86400000).toDateString()) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else break;
        }

        let stars = streak >= 30 ? 4 : streak >= 14 ? 3 : streak >= 7 ? 2 : streak >= 3 ? 1 : 0;
        res.json({ success: true, message: `Check-in başarılı! 🔥 ${streak} günlük seri`, streak, stars });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/badge-status', authenticateToken, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const checkInHistory = await getKVData('checkin_history') || {};
        const userHistory = checkInHistory[userEmail] || [];

        let streak = 0;
        if (userHistory.length > 0) {
            const sortedDates = [...userHistory].sort().reverse();
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);
            let checkDate = new Date(todayDate);
            for (let i = 0; i < sortedDates.length; i++) {
                if (sortedDates[i] === checkDate.toDateString()) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else if (i === 0 && sortedDates[i] === new Date(todayDate.getTime() - 86400000).toDateString()) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else break;
            }
        }

        let stars = streak >= 30 ? 4 : streak >= 14 ? 3 : streak >= 7 ? 2 : streak >= 3 ? 1 : 0;
        res.json({ streak, stars, totalDays: userHistory.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === VARSAYILAN ROTA (Catch-all) ===
// Diğer rotalarla eşleşmezse ana uygulama sayfasını sunar.
app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'life-coach-ui.html'));
});

// === GLOBAL HATA YAKALAYICI (Global Error Handler) ===
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Sunucu hatası oluştu', message: err.message });
});

// Vercel Serverless Handler
export default app;