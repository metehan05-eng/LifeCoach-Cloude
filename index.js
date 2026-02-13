import express from 'express';
import path from 'path';
import cors from 'cors';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getKVData, setKVData } from './lib/db.js';

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
    "openrouter/free"
];

// --- YARDIMCI FONKSİYONLAR ---

// Limit Kontrolü (Vercel KV)
async function checkRateLimit(req) {
    try {
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        if (Array.isArray(ip)) ip = ip[0];
        if (ip.includes(',')) ip = ip.split(',')[0].trim();

        // IP + UserAgent + Fingerprint Hash
        const ua = req.headers['user-agent'] || 'unknown';
        const fingerprint = req.body.fingerprintID || 'none';
        const identity = crypto.createHash('sha256').update(`${ip}-${ua}-${fingerprint}`).digest('hex');

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
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history, email, sessionId, fingerprintID } = req.body;

        // Limit Kontrolü
        const limitStatus = await checkRateLimit(req);
        if (!limitStatus.allowed) {
            return res.status(429).json(limitStatus);
        }

        // Sistem Promptu
        const systemPrompt = `SYSTEM NAME: LifeCoach AI
ROLE: You are a structured, intelligent, emotionally balanced AI coaching system.
CORE IDENTITY: Help users build discipline, improve mental clarity, and develop life structure.
RESPONSE STYLE: Grounded, calm, direct, human-like but structured.
LANGUAGE: Always respond in English.`;

        // AI Cevabı
        const aiResponse = await callOpenRouter([
            { "role": "system", "content": systemPrompt },
            ...(history || []),
            { "role": "user", "content": message }
        ]);

        // Veritabanı Kaydı (Kullanıcı varsa)
        let newSessionId = sessionId;
        if (email) {
            const users = await getKVData('users');
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

        const newUser = { id: Date.now(), name, email, password };
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
        const user = users.find(u => u.email === email && u.password === password);

        if (user) res.json({ success: true, user: { name: user.name, email: user.email } });
        else res.status(401).json({ error: "Hatalı email veya şifre." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. History API
app.post('/api/history', async (req, res) => {
    try {
        const { email } = req.body;
        const users = await getKVData('users');
        const user = users.find(u => u.email === email);
        
        if (user && user.sessions) {
            res.json(user.sessions.map(s => ({ id: s.id, title: s.title })));
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Get Session API
app.post('/api/get-session', async (req, res) => {
    try {
        const { email, sessionId } = req.body;
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

// Sunucuyu Başlat
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;