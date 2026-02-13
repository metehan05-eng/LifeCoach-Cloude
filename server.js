require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');
const LIMITS_FILE = path.join(__dirname, 'user_limits.json');

// OpenRouter Ayarları
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODELS = [
    "arcee-ai/trinity-large-preview:free",
    "deepseek/deepseek-r1-0528:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "google/gemma-3-27b-it:free",
    "openrouter/free"
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Kullanıcıları oku
const getUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE));
    } catch (e) {
        return [];
    }
};

// Helper: Kullanıcı kaydet
const saveUser = (user) => {
    const users = getUsers();
    users.push(user);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// --- LIMIT VE GÜVENLİK SİSTEMİ ---
let limitsLock = Promise.resolve(); // Dosya Kilidi (File Locking)

// Helper: Limitleri Oku
const getLimits = async () => {
    try {
        // Dosya yoksa boş obje döndür
        await fs.promises.access(LIMITS_FILE).catch(() => fs.promises.writeFile(LIMITS_FILE, '{}'));
        const data = await fs.promises.readFile(LIMITS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
};

// Helper: Limitleri Kaydet (Mutex/Lock ile Güvenli Yazma)
const saveLimits = (data) => {
    limitsLock = limitsLock.then(async () => {
        await fs.promises.writeFile(LIMITS_FILE, JSON.stringify(data, null, 2));
    }).catch(e => console.error("Limit save error:", e));
    return limitsLock;
};

// Auto-Cleanup: 24 saattir işlem yapmayanları temizle (Her 1 saatte bir çalışır)
setInterval(async () => {
    const limits = await getLimits();
    const now = Date.now();
    let changed = false;
    
    Object.keys(limits).forEach(key => {
        const user = limits[key];
        // Son işlemden 24 saat geçmişse sil
        if (now - (user.lastActivity || user.lastReset) > 24 * 60 * 60 * 1000) {
            delete limits[key];
            changed = true;
        }
    });

    if (changed) {
        saveLimits(limits);
        console.log("🧹 Auto-cleanup: İnaktif kullanıcılar temizlendi.");
    }
}, 60 * 60 * 1000);

// Limit Kontrol Fonksiyonu
async function checkRateLimit(req) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ua = req.headers['user-agent'] || 'unknown';
    const fingerprint = req.body.fingerprintID || req.headers['x-fingerprint-id'] || 'none';
    
    // Gelişmiş Kimlik (Identity Hash)
    const identity = crypto.createHash('sha256').update(`${ip}-${ua}-${fingerprint}`).digest('hex');
    
    const limits = await getLimits();
    const now = Date.now();
    
    if (!limits[identity]) {
        limits[identity] = { messageCount: 0, lastReset: now, isBlocked: false, lastActivity: now };
    }
    
    const user = limits[identity];
    user.lastActivity = now; // Aktivite zamanını güncelle

    if (user.isBlocked) {
        return { allowed: false, error: "Hesabınız engellendi.", retryAfter: "Süresiz" };
    }

    // 2 Saatlik Otomatik Sıfırlama
    if (now - user.lastReset > 2 * 60 * 60 * 1000) {
        user.messageCount = 0;
        user.lastReset = now;
    }

    // Limit Kontrolü (Örn: 2 saatte 10 mesaj)
    const MAX_MESSAGES = 10; 
    if (user.messageCount >= MAX_MESSAGES) {
        const timePassed = now - user.lastReset;
        const timeLeft = (2 * 60 * 60 * 1000) - timePassed;
        const minutesLeft = Math.ceil(timeLeft / 60000);
        return { allowed: false, error: `Üzgünüm, işlem limitine ulaştın. Lütfen ${minutesLeft} dakika sonra tekrar gel.`, retryAfter: minutesLeft };
    }

    user.messageCount++;
    saveLimits(limits); // Asenkron ve kilitli kaydetme
    
    return { allowed: true };
}

// Helper: OpenRouter Fallback Mekanizması
async function callOpenRouter(messages) {
    for (const model of OPENROUTER_MODELS) {
        try {
            console.log(`Trying model: ${model}...`);
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": `http://localhost:${PORT}`, // OpenRouter için gerekli
                    "X-Title": "LifeCoach AI"
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.choices[0].message.content; // Başarılı yanıtı döndür
            }
            console.warn(`Model ${model} failed with status: ${response.status}`);
        } catch (e) {
            console.warn(`Model ${model} error: ${e.message}`);
        }
    }
    throw new Error("All AI models failed to respond.");
}

// Sayfa Rotaları
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

// API: Kayıt Ol
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: "Please fill in all fields." });
    }

    const users = getUsers();
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: "This email address is already in use." });
    }

    // Not: Prodüksiyonda şifreler hashlenmelidir (örn: bcrypt ile).
    const newUser = { id: Date.now(), name, email, password };
    saveUser(newUser);

    res.json({ success: true, user: { name, email } });
});

// API: Giriş Yap
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: "Invalid email or password." });
    }

    const users = getUsers();
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        res.json({ success: true, user: { name: user.name, email: user.email } });
    } else {
        res.status(401).json({ error: "Invalid email or password." });
    }
});

// API: Şifre Sıfırla
app.post('/api/reset-password', (req, res) => {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
        return res.status(400).json({ error: "Please fill in all fields." });
    }

    const users = getUsers();
    const userIndex = users.findIndex(u => u.email === email);

    if (userIndex === -1) {
        return res.status(404).json({ error: "User not found with this email." });
    }

    users[userIndex].password = newPassword;
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    res.json({ success: true });
});

// API: Profil Güncelle (Kullanıcı Adı)
app.post('/api/update-profile', (req, res) => {
    const { email, newName, newAvatar } = req.body;
    
    if (!email || !newName) {
        return res.status(400).json({ error: "Invalid request." });
    }

    const users = getUsers();
    const userIndex = users.findIndex(u => u.email === email);

    if (userIndex === -1) {
        return res.status(404).json({ error: "User not found." });
    }

    // Instagram tarzı benzersizlik kontrolü: Başka biri bu ismi kullanıyor mu?
    const nameExists = users.find(u => u.name === newName && u.email !== email);
    if (nameExists) {
        return res.status(400).json({ error: "This username is already taken." });
    }

    users[userIndex].name = newName;
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    res.json({ success: true, user: { name: newName, email: email } });
});

// API: Geçmiş Seansları Getir
app.post('/api/history', (req, res) => {
    const { email } = req.body;
    const users = getUsers();
    const user = users.find(u => u.email === email);
    
    if (user && user.sessions) {
        // Sadece ID ve başlıkları gönder
        res.json(user.sessions.map(s => ({ id: s.id, title: s.title })));
    } else {
        res.json([]);
    }
});

// API: Belirli Bir Seansı Getir
app.post('/api/get-session', (req, res) => {
    const { email, sessionId } = req.body;
    const users = getUsers();
    const user = users.find(u => u.email === email);
    
    if (user && user.sessions) {
        const session = user.sessions.find(s => s.id == sessionId);
        if (session) {
            res.json(session);
            return;
        }
    }
    res.status(404).json({ error: "Session not found." });
});

// API: Seans Sil
app.post('/api/delete-session', (req, res) => {
    const { email, sessionId } = req.body;
    const users = getUsers();
    const userIndex = users.findIndex(u => u.email === email);

    if (userIndex !== -1 && users[userIndex].sessions) {
        users[userIndex].sessions = users[userIndex].sessions.filter(s => s.id != sessionId);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Operation failed." });
    }
});

// API: Geri Bildirim (Like/Dislike)
app.post('/api/feedback', (req, res) => {
    const { email, sessionId, messageContent, feedback } = req.body;
    const users = getUsers();
    const userIndex = users.findIndex(u => u.email === email);

    if (userIndex !== -1 && users[userIndex].sessions) {
        const session = users[userIndex].sessions.find(s => s.id == sessionId);
        if (session) {
            const msg = session.messages.find(m => m.role === 'assistant' && m.content === messageContent);
            if (msg) {
                msg.feedback = feedback;
                fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
                return res.json({ success: true });
            }
        }
    }
    res.json({ success: false });
});

// Helper: Konuşmayı Özetle
async function summarizeConversation(messages) {
    if (!messages || messages.length === 0) return "";

    // Mesajları tek bir metin haline getir
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

// API: Chat (Streaming Versiyon)
app.post('/api/chat', async (req, res) => {
    const { message, history, email, sessionId, model } = req.body;
    let aiResponse = "";
    let newSessionId = sessionId;

    // 1. Limit Kontrolü
    const limitStatus = await checkRateLimit(req);
    if (!limitStatus.allowed) {
        return res.status(429).json({ error: limitStatus.error, retryAfter: limitStatus.retryAfter });
    }

    // NOT: Şu anki kod yapısı streaming (SSE) değil, normal JSON yanıtı üzerine kurulu.
    // Eğer streaming istenirse client ve server tarafında köklü değişiklik gerekir.
    // Bu yüzden SSE başlıklarını kaldırıyoruz ki JSON yanıtı bozulmasın.
    // res.setHeader('Content-Type', 'text/event-stream');
    // res.setHeader('Cache-Control', 'no-cache');
    // res.setHeader('Connection', 'keep-alive');
    // res.flushHeaders();

    // Hafıza Motoru için Önceki Oturum Özetlerini Hazırla
    // NOT: Bu işlem her mesajda çalıştığı için performansı etkileyebilir.
    // Daha verimli bir sistem için özetler periyodik olarak veya seans sonunda oluşturulup saklanabilir.
    let memoryContext = "";
    if (email) {
        const users = getUsers();
        const user = users.find(u => u.email === email);
        
        if (user && user.sessions && user.sessions.length > 0) {
            // Mevcut seans hariç en son 3 seansı al
            const otherSessions = user.sessions
                .filter(s => s.id != sessionId)
                .slice(0, 3);

            if (otherSessions.length > 0) {
                const summaries = await Promise.all(
                    otherSessions.map(s => summarizeConversation(s.messages))
                );
                
                const validSummaries = summaries.filter(s => s);
                if (validSummaries.length > 0) {
                    memoryContext = "PAST CONVERSATION SUMMARIES:\n" + validSummaries.map(s => `- ${s}`).join('\n') + "\n\n";
                }
            }
        }
    }

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
    
    try {
        // 1. Yapay Zeka Cevabını Al (Yedekleme Mekanizması ile)
        aiResponse = await callOpenRouter([
            { "role": "system", "content": finalSystemPrompt },
            ...(history || []),
            { "role": "user", "content": message }
        ]);

        if (!aiResponse) aiResponse = "An error occurred.";

        // 2. Veritabanına Kaydet ve Başlık Oluştur
        let newSessionId = sessionId;
        if (email) {
            const users = getUsers();
            const userIndex = users.findIndex(u => u.email === email);

            if (userIndex !== -1) {
                if (!users[userIndex].sessions) users[userIndex].sessions = [];
                let session = newSessionId ? users[userIndex].sessions.find(s => s.id == newSessionId) : null;

                if (!session) {
                    newSessionId = Date.now();
                    let title = message.substring(0, 30) + "...";
                    try {
                        const titleText = await callOpenRouter([
                            { "role": "system", "content": "Write a very short title (3-5 words) for this chat. Only write the title, do not use quotes." },
                            { "role": "user", "content": `User: ${message}\nAI: ${aiResponse}` }
                        ]);
                        
                        if (titleText) {
                            title = titleText.trim().replace(/^["']|["']$/g, '');
                        }
                    } catch (e) {
                        console.error("Title generation error:", e);
                    }
                    session = { id: newSessionId, title: title, messages: [] };
                    users[userIndex].sessions.unshift(session);
                }

                session.messages.push({ role: 'user', content: message });
                session.messages.push({ role: 'assistant', content: aiResponse });
                fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
            }
        }

        res.json({ response: aiResponse, sessionId: newSessionId });

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "An error occurred during the process: " + error.message });
    }
});

// API: Toplam Kullanıcı Sayısını Getir
app.get('/api/user-count', (req, res) => {
    const users = getUsers();
    res.json({ success: true, count: users.length });
});

app.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Mevcut Kullanıcı Sayısı: ${getUsers().length}`);
    const { default: open } = await import('open');
    open(`http://localhost:${PORT}`);
});