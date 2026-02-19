import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getKVData, setKVData } from './lib/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// __dirname ES Module çözümü
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- AYARLAR ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODELS = [
    "arcee-ai/trinity-large-preview:free",
    "deepseek/deepseek-r1-0528:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "google/gemma-3-27b-it:free",
    "openrouter/free",
    "openai/gpt-oss-120b:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "z-ai/glm-4.5-air:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "upstage/solar-pro-3:free",
    "openrouter/aurora-alpha"

];

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';

// --- YARDIMCI FONKSİYONLAR ---

// UTC tarih string'i (YYYY-MM-DD) döndüren yardımcı fonksiyon
const getUTCDateString = (date) => {
    return new Date(date).toISOString().split('T')[0];
};

// Middleware: Token Doğrulama
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Giriş yapmanız gerekiyor." });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Oturum geçersiz." });
        req.user = user;
        next();
    });
};

// Limit Kontrolü (Vercel KV)
async function checkRateLimit(req) {
    try {
        if (!req.user || !req.user.email) return { allowed: false, error: "Kimlik doğrulanamadı." };
        const identity = `limit:${req.user.email}`;

        // KV'den limitleri çek
        const limits = await getKVData('user_limits');
        const now = Date.now();

        if (!limits[identity]) {
            limits[identity] = { messageCount: 0, lastReset: now, isBlocked: false, lastActivity: now };
        }

        const user = limits[identity];
        user.lastActivity = now;

        if (user.isBlocked) {
            return { allowed: false, error: "Hesabınız engellendi.", retryAfter: "Süresiz" };
        }

        // 2 Saatlik Sıfırlama
        if (now - user.lastReset > 2 * 60 * 60 * 1000) {
            user.messageCount = 0;
            user.lastReset = now;
        }

        // Limit Kontrolü (10 Mesaj)
        if (user.messageCount >= 10) {
            const timePassed = now - user.lastReset;
            const timeLeft = (2 * 60 * 60 * 1000) - timePassed;
            const minutesLeft = Math.ceil(timeLeft / 60000);
            return { allowed: false, error: `Limit doldu. ${minutesLeft} dakika sonra tekrar deneyin.`, retryAfter: minutesLeft };
        }

        user.messageCount++;
        await setKVData('user_limits', limits);
        
        return { allowed: true };
    } catch (error) {
        console.error("Rate Limit Error:", error);
        return { allowed: true }; // Hata durumunda izin ver
    }
}

// OpenRouter Çağrısı
async function callOpenRouter(messages) {
    for (const model of OPENROUTER_MODELS) {
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://lifecoach-ai.vercel.app",
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

// --- API ROTALARI ---

// 1. Chat API
app.post('/api/chat', authenticateToken, async (req, res) => {
    try {
        const { message, history, sessionId } = req.body;
        const email = req.user.email;

        // Limit Kontrolü
        const limitStatus = await checkRateLimit(req);
        if (!limitStatus.allowed) {
            return res.status(429).json(limitStatus);
        }
        
        // Kullanıcı hedeflerini çek (Context için)
        const users = await getKVData('users');
        const currentUser = users.find(u => u.email === email);
        const activeGoals = currentUser && currentUser.goals ? currentUser.goals.filter(g => g.status === 'active') : [];
        
        // Kullanıcı İstatistiklerini Hesapla (Mock veri yerine gerçek veritabanından çekilebilir)
        const streak = currentUser.streak || 0;
        const lastCheckin = currentUser.lastCheckinDate ? getUTCDateString(currentUser.lastCheckinDate) : "Never";
        
        const userStatsContext = `
USER STATS:
- Current Streak: ${streak} days
- Last Check-in: ${lastCheckin}
`;

        const goalContext = activeGoals.length > 0 ? `\n\nCURRENT USER ACTIVE GOALS (Keep these in mind):\n${activeGoals.map(g => `- ${g.title}`).join('\n')}` : "";

        // Sistem Promptu
        const systemPrompt = `You are LifeCoach AI.

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
FOUNDER MODE (Auto-Trigger)
------------------------------------

If the user expresses startup, business, AI development, productivity, or strategy-related intent:

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

        // AI Cevabı
        const aiResponse = await callOpenRouter([
            { "role": "system", "content": systemPrompt },
            ...(history || []),
            { "role": "user", "content": message }
        ]);

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
            const token = jwt.sign({ email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
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
        const lastCheckinDate = user.lastCheckinDate || null;

        const calculateStars = (s) => {
            if (s >= 28) return 4;
            if (s >= 21) return 3;
            if (s >= 14) return 2;
            if (s >= 7) return 1;
            return 0;
        };

        res.json({ streak, stars: calculateStars(streak), lastCheckinDate });

    } catch (error) {
        console.error("Badge Status API Hatası:", error);
        res.status(500).json({ error: error.message });
    }
});

// 5.3 Daily Check-in API (POST)
app.post('/api/check-in', authenticateToken, async (req, res) => {
    try {
        const email = req.user.email;
        const users = await getKVData('users');
        const userIndex = users.findIndex(u => u.email === email);

        if (userIndex === -1) return res.status(404).json({ error: "Kullanıcı bulunamadı." });
        
        const user = users[userIndex];
        const todayStr = getUTCDateString(new Date());

        // 1. Bugün tamamlanmış bir görev var mı kontrol et
        const hasCompletedTaskToday = user.goals?.some(g => 
            g.status === 'completed' && g.completedAt && getUTCDateString(g.completedAt) === todayStr
        );

        if (!hasCompletedTaskToday) {
            return res.status(400).json({ error: "Check-in yapabilmek için bugünün hedeflerinden en az birini tamamlamalısın." });
        }

        // 2. Bugün zaten check-in yapılmış mı kontrol et
        if (user.lastCheckinDate && getUTCDateString(user.lastCheckinDate) === todayStr) {
            return res.status(400).json({ error: "Bugün zaten check-in yaptın." });
        }

        // 3. Yeni seriyi hesapla
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getUTCDateString(yesterday);

        if (user.lastCheckinDate && getUTCDateString(user.lastCheckinDate) === yesterdayStr) {
            user.streak = (user.streak || 0) + 1; // Seriyi devam ettir
        } else {
            user.streak = 1; // Yeni seri veya kırılmış seri
        }

        user.lastCheckinDate = new Date().toISOString();
        users[userIndex] = user; // Kullanıcı verisini güncelle

        await setKVData('users', users);
        res.json({ success: true, message: `Tebrikler! Serin ${user.streak} güne ulaştı.` });

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