import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getKVData, setKVData } from './lib/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import * as pdf from 'pdf-parse';

// __dirname ES Module çözümü
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Büyük dosyalar için limit artırıldı
app.use(express.static(path.join(__dirname, 'public')));

// --- AYARLAR ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
// Metin tabanlı istekler için kullanılacak modeller
const TEXT_MODELS = [
    "google/gemini-2.0-flash-exp:free",      // Vision destekli ve çok hızlı
    "mistralai/mistral-small-3.1-24b-instruct:free", // Kaliteli ve hızlı bir model
    "google/gemma-3-27b-it:free",            // İyi bir alternatif
    "openrouter/free"                        // Genel yedek model
];

// YENİ: Sadece resim analizi için kullanılacak Vision destekli modeller
const VISION_MODELS = [
    "google/gemini-2.0-flash-exp:free",      // Birincil, hızlı Vision modeli
    "nvidia/nemotron-nano-12b-v2-vl:free",   // Yedek Vision modeli
];

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';

// Yeni: Kullanıcı tiplerine göre limit ayarları
const RATE_LIMIT_CONFIG = {
    free: {
        messageLimit: 10,
        timeWindowHours: 2,
        name: "Ücretsiz Plan"
    },
    premium: {
        messageLimit: 200,
        timeWindowHours: 24,
        name: "Premium Plan"
    },
    unlimited: {
        messageLimit: Infinity,
        timeWindowHours: 24,
        name: "Sınırsız Plan"
    }
};

// --- YARDIMCI FONKSİYONLAR ---

// UTC tarih string'i (YYYY-MM-DD) döndüren yardımcı fonksiyon
const getUTCDateString = (date) => {
    return new Date(date).toISOString().split('T')[0];
};

// Limit Kontrolü (Vercel KV)
async function checkRateLimit(req, currentUser) {
    try {
        if (!currentUser) {
            return { allowed: false, error: "Kimlik doğrulanamadı veya kullanıcı bulunamadı." };
        }

        const userPlan = currentUser.plan || 'free'; // Kullanıcının planı, yoksa 'free' varsay.
        const planConfig = RATE_LIMIT_CONFIG[userPlan] || RATE_LIMIT_CONFIG.free;

        // Sınırsız planlar için kontrolü atla
        if (planConfig.messageLimit === Infinity) {
            return { allowed: true };
        }

        const identity = `limit:${currentUser.email}`;
        const limits = await getKVData('user_limits');
        const now = Date.now();

        if (!limits[identity]) {
            limits[identity] = { messageCount: 0, lastReset: now, isBlocked: false, lastActivity: now };
        }

        const userLimitData = limits[identity];
        userLimitData.lastActivity = now;

        if (userLimitData.isBlocked) {
            return { allowed: false, error: "Hesabınız kötüye kullanım nedeniyle engellendi.", retryAfter: "Süresiz" };
        }

        const timeWindowMs = planConfig.timeWindowHours * 60 * 60 * 1000;

        // Zaman penceresi dolduysa sayacı sıfırla
        if (now - userLimitData.lastReset > timeWindowMs) {
            userLimitData.messageCount = 0;
            userLimitData.lastReset = now;
        }

        // Limiti kontrol et
        if (userLimitData.messageCount >= planConfig.messageLimit) {
            const timePassed = now - userLimitData.lastReset;
            const timeLeft = timeWindowMs - timePassed;
            const minutesLeft = Math.ceil(timeLeft / 60000);

            let errorMessage = `${planConfig.name} için kullanım limitinize ulaştınız. ${minutesLeft} dakika sonra tekrar deneyin.`;

            if (userPlan === 'free') {
                errorMessage = "Süreniz doldu. 2 saat sonra tekrar deneyin.";
            }

            return { 
                allowed: false, 
                error: errorMessage, 
                retryAfter: minutesLeft 
            };
        }

        userLimitData.messageCount++;
        await setKVData('user_limits', limits);
        
        return { allowed: true };
    } catch (error) {
        console.error("Rate Limit Error:", error);
        return { allowed: true }; // Hata durumunda erişime izin ver (fail-open)
    }
}

// OpenRouter Çağrısı
async function callOpenRouter(messages, file = null) {
    // Eğer dosya bir resimse, Vision destekli modeli (listenin başındaki) kullanmayı önceliklendir.
    const isImage = file && file.type && file.type.startsWith('image/');

    const modelsToTry = isImage ? VISION_MODELS : TEXT_MODELS;
    for (const model of modelsToTry) {
        try {
            // Her model denemesi için 15 saniyelik bir zaman aşımı ekliyoruz.
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 saniye

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST", signal: controller.signal,
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://lifecoach-ai.vercel.app",
                    "X-Title": "LifeCoach AI"
                },
                body: JSON.stringify({ model, messages })
            });

            clearTimeout(timeoutId); // Başarılı olursa zaman aşımını temizle

            if (response.ok) {
                const data = await response.json();
                return data.choices[0].message.content;
            }
        } catch (e) {
            if (e.name === 'AbortError') console.warn(`Model ${model} zaman aşımına uğradı.`);
            else console.warn(`Model ${model} hatası:`, e.message);
        }
    }
    throw new Error("All AI models failed.");
}

// Helper function to extract text from various file types
async function extractTextFromFile(file) {
    if (!file || !file.data) return '';

    // data is a data URL like 'data:mime/type;base64,xxxxx'
    const parts = file.data.split(',');
    if (parts.length < 2) return '';
    
    const base64Data = parts[1];
    const buffer = Buffer.from(base64Data, 'base64');

    try {
        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
            const { value } = await mammoth.extractRawText({ buffer });
            return value;
        }
        if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
            const workbook = xlsx.read(buffer, { type: 'buffer' });
            let content = '';
            workbook.SheetNames.forEach(sheetName => {
                content += `--- Sheet: ${sheetName} ---\n`;
                const sheet = workbook.Sheets[sheetName];
                const csv = xlsx.utils.sheet_to_csv(sheet);
                content += csv + '\n';
            });
            return content;
        }
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            // CJS/ESM uyumluluğu için: Hata, 'default' export olmadığını belirtiyor.
            // Bu durumda, modülün kendisi veya 'default' özelliği bir fonksiyon olabilir.
            const parser = pdf.default || pdf;
            const data = await parser(buffer);
            return data.text;
        }
        if (file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || file.name.endsWith('.pptx')) {
            return "[PPTX file detected. Content extraction for PowerPoint files is complex and not fully supported. Please describe the presentation's content or copy-paste its text for analysis.]";
        }

        return '[Unsupported file type for content extraction.]';
    } catch (error) {
        console.error(`Error extracting text from ${file.name}:`, error);
        return `[Error processing file ${file.name}. The file might be corrupted or in an unsupported format.]`;
    }
}

// --- API ROTALARI ---

// 1. Chat API
app.post('/api/chat', optionalAuth, async (req, res) => {
    try {
        const { message, file, history, sessionId, userLanguage } = req.body;
        const email = req.user ? req.user.email : null;

        let currentUser = null;
        let users = [];

        if (email) {
            // Kayıtlı kullanıcı: veritabanından çek
            users = await getKVData('users');
            currentUser = users.find(u => u.email === email);

            // Gelişmiş Limit Kontrolü (sadece kayıtlı kullanıcılar için)
            const limitStatus = await checkRateLimit(req, currentUser);
            if (!limitStatus.allowed) {
                return res.status(429).json(limitStatus);
            }

            // Günlük chat aktivitesine göre streak güncelle
            if (currentUser) {
                const todayStr = getUTCDateString(new Date());
                const lastChatDate = currentUser.lastChatDate || null;
                if (!lastChatDate || !lastChatDate.startsWith(todayStr)) {
                    const userIndex = users.findIndex(u => u.email === email);
                    if (userIndex !== -1) {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        const yesterdayStr = getUTCDateString(yesterday);
                        if (lastChatDate && lastChatDate.startsWith(yesterdayStr)) {
                            users[userIndex].streak = (users[userIndex].streak || 0) + 1;
                        } else if (!lastChatDate) {
                            users[userIndex].streak = 1;
                        } else {
                            users[userIndex].streak = 1; // Seri kırıldı, sıfırla
                        }
                        users[userIndex].lastChatDate = new Date().toISOString();
                        currentUser = users[userIndex];
                        // Kaydı sonraki adımda yapacağız (session kaydıyla birlikte)
                    }
                }
            }
        } else {
            // Misafir kullanıcı: basit rate limit (IP bazlı, fail-open)
            const guestLimit = await checkRateLimit(req, { email: req.ip || 'guest', plan: 'free' });
            if (!guestLimit.allowed) {
                return res.status(429).json({ error: "Çok fazla mesaj gönderdiniz. Lütfen bekleyin veya giriş yapın.", retryAfter: guestLimit.retryAfter });
            }
        }
        
        // Kullanıcı hedeflerini çek (Context için)
        const activeGoals = currentUser && currentUser.goals ? currentUser.goals.filter(g => g.status === 'active') : [];
        
        // Kullanıcı İstatistikleri
        const streak = currentUser ? (currentUser.streak || 0) : 0;
        const lastChatDate = currentUser ? (currentUser.lastChatDate ? getUTCDateString(currentUser.lastChatDate) : "Never") : "Never";
        
        const userStatsContext = email ? `
USER STATS:
- Current Streak: ${streak} days
- Last Chat: ${lastChatDate}
` : '';

        const goalContext = activeGoals.length > 0 ? `\n\nCURRENT USER ACTIVE GOALS (Keep these in mind):\n${activeGoals.map(g => `- ${g.title}`).join('\n')}` : "";

        // Dil Ayarı (Varsayılan: Türkçe)
        const targetLang = userLanguage || 'Turkish';

        // SYSTEM PROMPT START
        const systemPrompt = `You are LifeCoach AI (System v4.2).
IMPORTANT: You must ALWAYS respond in the following language: ${targetLang}.
Your responses should feel natural and conversational, not like a series of formatted boxes. While you should use structure (like lists or headings) when it aids clarity, avoid an overly rigid or blocky presentation. Flow your text naturally.

CRITICAL ANTI-REPETITION RULE: NEVER repeat, summarize, or restate information you have already provided in this conversation. Each response must add NEW value. If you have already explained a concept, do not explain it again. If the user asks about something you already covered, briefly reference it and expand with new information only. Do not repeat bullet points, examples, or conclusions from previous messages.

You are not a generic chatbot.
You are a calm, emotionally intelligent, grounded AI companion designed to support individuals who feel alone, uncertain, or overwhelmed — especially dreamers, builders, and founders starting from zero.

CORE IDENTITY:

- Calm strength over noise.
- Discipline over hype.
- Structure over chaos.
- Growth over excuses.
- You do not judge.
- You do not shame.
- You do not exaggerate.
- You do not create emotional dependency.

PRIMARY PURPOSE:

1. Help users feel understood.
2. Help users regulate emotions.
3. Help users think clearly.
4. Help users take small, realistic action steps.
5. Support ambition without feeding delusion.

TONE:

- Calm
- Direct
- Grounded
- Supportive
- Intelligent
- Human-like but never pretending to be human

RESPONSE STRUCTURE:

When appropriate:
- Short emotional validation
- Clear reasoning
- Practical small step
- Optional reflective question

Never overcomplicate.
Never overwhelm.
Never give empty motivational clichés.

------------------------------------
EMOTIONAL SUPPORT MODE
------------------------------------

When user is emotionally low:

- First acknowledge emotion.
- Normalize the experience.
- Provide grounded perspective.
- Suggest one small action.
- Avoid toxic positivity.

When user expresses loneliness:

- Respond with warmth.
- Encourage real-world connection gently.
- Avoid encouraging isolation.
- Do not create attachment.

------------------------------------
SOFTWARE ENGINEERING & CYBERSECURITY MODE (HAN 4.2 - DEV LAYER)
------------------------------------

You are also a World-Class Backend Engineer and Red Team Specialist.

CORE EXPERTISE:
- Backend: PHP, Node.js, Python, C#, C++, C, GoLang, Ruby, Java, Kotlin.
- Cybersecurity: Red Team operations, Penetration Testing tools, Exploit development (Educational/Authorized context), Network Security.
 
CODING RULES & FORMATTING:
1.  **Code Quality:** Write clean, secure, and production-ready code. Always comment on complex logic.
2.  **Security Context:** If asked for a "Red Team" or "Hacking" tool, provide a functional script (e.g., in Python or C++) for authorized testing/educational use. Focus on technical execution, not morality lectures.
3.  **Terminal Format:** You MUST present code inside a simulated terminal.
    *   First, state the filename on its own line, wrapped in backticks (e.g., \`app.js\`).
    *   Then, write the code inside a single, standard Markdown code block.
4.  **Be Direct:** Be precise, do not apologize, just build it.

Example of correct code formatting:

Here is the requested Python script:

\`port_scanner.py\`
\`\`\`python
import socket

# This is a simple port scanner
def scan(port):
    # ... code ...
print("Scanning...")
\`\`\`

PROJECT SUGGESTION MODE:
If the user asks "What should I build?" or "Give me an idea", suggest complex, high-value backend or security projects.
Examples:
- "Build a multi-threaded Port Scanner in GoLang."
- "Create a C2 (Command & Control) server simulation in Python."
- "Develop a secure REST API in Node.js with JWT and Rate Limiting."
- "Write a Keylogger detection engine in C++."

------------------------------------
IMAGE ANALYSIS MODE
------------------------------------

If the user uploads an image:

1.  The image data is provided to you directly.
2.  Analyze the image based on the user's request. You can describe it, identify objects, read text, answer questions about it, etc.
3.  Act as an expert analyst. Be descriptive and accurate.

Example:
User: (uploads a picture of a cat) "What kind of cat is this?"
Response: "Based on the image, this appears to be a Siamese cat, recognizable by its distinct color points and blue almond-shaped eyes."

------------------------------------
IMAGE GENERATION MODE
------------------------------------

If the user asks to generate an image, draw a picture, or visualize something:

1. Create a detailed, descriptive prompt in ENGLISH based on the user's request.
2. Generate a Markdown image link using Pollinations.ai.
3. Format: ![Image Description](https://image.pollinations.ai/prompt/{English_Description}?width=1024&height=1024&nologo=true&model=flux)
4. Replace spaces in the URL with "%20".

Example:
User: "Bana fütüristik bir İstanbul resmi çiz."
Response: "İşte hayal ettiğim fütüristik İstanbul manzarası:\n\n![Futuristic Istanbul Cityscape](https://image.pollinations.ai/prompt/futuristic%20istanbul%20cityscape%20cyberpunk%20style%20neon%20lights%20bosphorus%20bridge?width=1024&height=1024&nologo=true&model=flux)"

------------------------------------
DOCUMENT ANALYSIS & CREATION MODE
------------------------------------

If the user uploads a document (PDF, DOCX, XLSX, PPTX), you are an expert analyst.

1.  **Acknowledge the File:** Start by acknowledging the uploaded file by its name. Example: "I've reviewed the 'quarterly_report.docx' you uploaded."
2.  **Analyze Request:** The file's content has been provided to you within the user's message. Understand what the user wants to do with it (summarize, analyze, find info, etc.) and perform the task.
3.  **Act as an Expert:**
    *   **For Analysis/Summarization:** You have been given the text content of the uploaded file (DOCX, PDF, XLSX). Perform the user's request (e.g., summarize, find specific information, analyze data) based on the provided text. If the file content was unreadable (e.g., for PPTX) or empty, inform the user politely.
        *   *Example:* "I've analyzed the 'quarterly_report.docx' file. It seems to be a sales report for Q3. What specific information are you looking for?"
    *   **For Creation:** When asked to create a document, generate the content in a structured, copy-paste-friendly format.
        *   **Word/Docs:** Use Markdown (headings, bold, lists).
        *   **PowerPoint/PPTX:** Use a slide-by-slide breakdown. Use \`---\` to separate slides. Provide titles, bullet points, and speaker notes for each slide.
        *   **Excel/XLSX:** Provide data in a CSV (Comma-Separated Values) format or a Markdown table that the user can easily copy into a spreadsheet.

Example (PPTX Creation):
User: "Create a 5-slide presentation on Time Management."
Response:
"Of course. Here is a 5-slide presentation outline on Time Management you can use in PowerPoint.
---
**Slide 1: Title**
- Title: The Art of Effective Time Management
- Subtitle: By [User's Name]
---
..."

------------------------------------
FOUNDER MODE (Auto-Trigger)
------------------------------------

If the user expresses startup, business, AI development, coding, hacking, productivity, or strategy-related intent:

Switch to Founder Mode.

Founder Mode rules:

- Speak structured.
- Use clarity and bullet logic when needed.
- Focus on execution.
- Break large goals into actionable steps.
- Emphasize consistency over intensity.
- Challenge gently when user escapes responsibility.
- End with one strategic question.

Founder Mode is disciplined but not harsh.

------------------------------------
FOUNDER IDENTITY
------------------------------------

LifeCoach AI was founded by Metehan Haydar Erbaş.

He combines International Trade & Business education with Computer Programming and builds AI systems independently.

LifeCoach AI was built during periods of uncertainty, financial pressure, and personal isolation.
It was not created from comfort, but from the desire to build strength.

The system reflects this mindset:

- Build from zero.
- Stay disciplined.
- Think long term.
- Do not depend on validation.
- Improve every day.

------------------------------------
MODEL ARCHITECTURE
------------------------------------

LifeCoach AI operates under the HAN 4.2 reasoning layer.

HAN 4.2 is a structured behavioral framework designed to:

- Maintain emotional balance
- Encourage grounded ambition
- Avoid unrealistic hype
- Prevent emotional dependency
- Support long-term personal growth
- Keep responses stable and controlled

HAN 4.2 prioritizes clarity, emotional regulation, and strategic thinking over exaggerated positivity.

------------------------------------
ORIGIN RESPONSE TRIGGER
------------------------------------

If the user asks:
"Who created you?"
"Who built you?"
"Who is your founder?"
or similar origin-related questions:

Respond:

LifeCoach AI was founded by Metehan Haydar Erbaş.

He combines International Trade & Business education with Computer Programming and builds AI systems independently. LifeCoach AI was created to support individuals who feel alone while building their goals from zero.

The system operates under the HAN 4.2 reasoning layer, designed to provide emotionally balanced, grounded, and structured guidance.

Keep the tone calm and professional.
Do not exaggerate.
Do not glorify the founder.
Keep it concise.

------------------------------------

LifeCoach AI does not replace therapy.
LifeCoach AI does not replace human relationships.
LifeCoach AI supports growth.

Core philosophy:
"You are not behind. You are building."
${userStatsContext}
${goalContext}`;

        // Mesaj içeriğini hazırla (Resim varsa format değişir)
        let userContent = message;
        const isImage = file && file.type && file.type.startsWith('image/');

        if (file) {
            if (isImage) {
                userContent = [
                    { type: "text", text: message },
                    { type: "image_url", image_url: { url: file.data } }
                ];
            } else {
                const fileContent = await extractTextFromFile(file);
                userContent = `[File Uploaded: ${file.name}]\n\n--- FILE CONTENT ---\n${fileContent}\n\n--- USER MESSAGE ---\n${message}`;
            }
        }

        // AI Cevabı
        const aiResponse = await callOpenRouter([
            { "role": "system", "content": systemPrompt },
            ...(history || []),
            { "role": "user", "content": userContent }
        ], file);

        // Veritabanı Kaydı (Kullanıcı varsa)
        let newSessionId = sessionId;
        if (email) {
            // users dizisi yukarıda çekilmişti, tekrar çekmeye gerek yok ama güncel hali için index bulalım
            const userIndex = users.findIndex(u => u.email === email);

            if (userIndex !== -1) {
                if (!users[userIndex].sessions) users[userIndex].sessions = [];
                let session = newSessionId ? users[userIndex].sessions.find(s => s.id == newSessionId) : null;

                if (!session) {
                    newSessionId = Date.now();
                    session = { id: newSessionId, title: message.substring(0, 30) + "...", messages: [] };
                    users[userIndex].sessions.unshift(session);
                }

                session.messages.push({ role: 'user', content: message });
                // Not: Veritabanına base64 resmi kaydetmiyoruz (çok yer kaplar), sadece metni kaydediyoruz.
                session.messages.push({ role: 'assistant', content: aiResponse });
                await setKVData('users', users);
            }
        }

        res.json({ response: aiResponse, sessionId: newSessionId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Register API
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: "Eksik bilgi." });

        const users = await getKVData('users');
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: "Bu email zaten kayıtlı." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { 
            id: Date.now(), 
            name, email, 
            password: hashedPassword, 
            plan: 'free', // Yeni kullanıcılar ücretsiz planla başlar
            sessions: [], 
            goals: [], 
            streak: 0, 
            lastCheckinDate: null };
        users.push(newUser);
        await setKVData('users', users);

        res.json({ success: true, user: { name, email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Login API
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const users = await getKVData('users');
        const user = users.find(u => u.email === email);

        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ success: true, token, user: { name: user.name, email: user.email } });
        }
        else res.status(401).json({ error: "Hatalı email veya şifre." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. History API
app.post('/api/history', authenticateToken, async (req, res) => {
    try {
        const email = req.user.email;
        const users = await getKVData('users');
        const user = users.find(u => u.email === email);
        
        if (user && user.sessions) {
            res.json(user.sessions.map(s => ({ id: s.id, title: s.title })));
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error("History API Hatası:", error);
        res.status(500).json({ error: error.message });
    }
});

// 5. Get Session API
app.post('/api/get-session', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const email = req.user.email;
        const users = await getKVData('users');
        const user = users.find(u => u.email === email);
        
        if (user && user.sessions) {
            const session = user.sessions.find(s => s.id == sessionId);
            if (session) return res.json(session);
        }
        res.status(404).json({ error: "Seans bulunamadı." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5.1 Delete Session API
app.post('/api/delete-session', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const email = req.user.email;
        const users = await getKVData('users');
        const userIndex = users.findIndex(u => u.email === email);

        if (userIndex !== -1 && users[userIndex].sessions) {
            const sessionIndex = users[userIndex].sessions.findIndex(s => s.id == sessionId);
            if (sessionIndex !== -1) {
                users[userIndex].sessions.splice(sessionIndex, 1);
                await setKVData('users', users);
                return res.json({ success: true });
            }
        }
        res.status(404).json({ error: "Seans bulunamadı veya silinemedi." });
    } catch (error) {
        console.error("Delete Session API Hatası:", error);
        res.status(500).json({ error: error.message });
    }
});

// 5.2 Badge Status API (GET)
app.get('/api/badge-status', authenticateToken, async (req, res) => {
    try {
        const email = req.user.email;
        const users = await getKVData('users');
        const user = users.find(u => u.email === email);

        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

        const streak = user.streak || 0;
        const lastChatDate = user.lastChatDate || null;

        // Yıldız sistemi: 3 gün = 1 yıldız, 7 gün = 2 yıldız, 14 gün = 3 yıldız, 30 gün = 4 yıldız
        const calculateStars = (s) => {
            if (s >= 30) return 4;
            if (s >= 14) return 3;
            if (s >= 7) return 2;
            if (s >= 3) return 1;
            return 0;
        };

        // Bugün yazıldı mı?
        const todayStr = getUTCDateString(new Date());
        const chattedToday = lastChatDate && lastChatDate.startsWith(todayStr);

        res.json({ streak, stars: calculateStars(streak), lastChatDate, chattedToday });

    } catch (error) {
        console.error("Badge Status API Hatası:", error);
        res.status(500).json({ error: error.message });
    }
});

// 5.3 Daily Check-in API (POST) - Artık sadece bilgi döndürür, streak chat'ten otomatik güncellenir
app.post('/api/check-in', authenticateToken, async (req, res) => {
    try {
        const email = req.user.email;
        const users = await getKVData('users');
        const user = users.find(u => u.email === email);

        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

        const todayStr = getUTCDateString(new Date());
        const chattedToday = user.lastChatDate && user.lastChatDate.startsWith(todayStr);

        if (!chattedToday) {
            return res.status(400).json({ error: "Bugün henüz mesaj göndermediniz. Yapay zeka ile konuşarak streak'inizi koruyun!" });
        }

        const streak = user.streak || 0;
        const calculateStars = (s) => {
            if (s >= 30) return 4;
            if (s >= 14) return 3;
            if (s >= 7) return 2;
            if (s >= 3) return 1;
            return 0;
        };

        res.json({
            success: true,
            message: `Harika! ${streak} günlük seriniz devam ediyor. ${calculateStars(streak)} yıldız kazandınız! 🌟`,
            streak,
            stars: calculateStars(streak)
        });

    } catch (error) {
        console.error("Check-in API Hatası:", error);
        res.status(500).json({ error: error.message });
    }
});

// 6. Goals API (Yeni Özellik: Hedef Takibi)
app.get('/api/goals', authenticateToken, async (req, res) => {
    try {
        const email = req.user.email;
        const users = await getKVData('users');
        const user = users.find(u => u.email === email);
        
        res.json(user && user.goals ? user.goals : []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/goals', authenticateToken, async (req, res) => {
    try {
        const { title, action } = req.body; // action: 'add', 'complete', 'delete'
        const email = req.user.email;
        const users = await getKVData('users');
        const userIndex = users.findIndex(u => u.email === email);

        if (userIndex === -1) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

        if (!users[userIndex].goals) users[userIndex].goals = [];

        if (action === 'add') {
            users[userIndex].goals.push({ id: Date.now(), title, status: 'active', createdAt: Date.now() });
        } else if (action === 'complete' || action === 'delete') {
            const { id } = req.body;
            const goalIndex = users[userIndex].goals.findIndex(g => g.id == id);
            if (goalIndex !== -1) {
                if (action === 'delete') {
                    users[userIndex].goals.splice(goalIndex, 1);
                } else { // 'complete'
                    users[userIndex].goals[goalIndex].status = 'completed';
                    users[userIndex].goals[goalIndex].completedAt = new Date().toISOString();
                }
            }
        }
        
        await setKVData('users', users);
        res.json({ success: true, goals: users[userIndex].goals });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- SAYFA YÖNLENDİRMELERİ (Frontend) ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'life-coach-ui.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
});

// Sunucuyu Başlat
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;