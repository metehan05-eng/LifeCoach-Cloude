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
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "GOOGLE_CLIENT_ID_BURAYA";

let genAI;
if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
} else {
    console.warn("UYARI: GEMINI_API_KEY ortam değişkeni ayarlanmamış. Sohbet işlevi çalışmayacak.");
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

// Chat endpoint
app.post('/api/chat', optionalAuth, async (req, res) => {
    try {
        if (!genAI) {
            return res.status(500).json({ error: 'Yapay zeka hizmeti yapılandırılmamış. Sunucu yöneticisi GEMINI_API_KEY değişkenini ayarlamalı.' });
        }

        const { message, file, history, systemPrompt, sessionId } = req.body;
        
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

        // --- Model Fallback Logic ---
        // Önce hızlı 'flash' modelini dene, 404 hatası verirse stabil 'pro' modeline geç.
        let aiResponse;
        let usedModel;
        const primaryModel = "gemini-1.5-flash-001";
        const fallbackModel = "gemini-pro";

        try {
            console.log(`Trying primary model: ${primaryModel}`);
            const model = genAI.getGenerativeModel({ model: primaryModel, systemInstruction: systemPrompt });
            const chat = model.startChat({ history: chatHistory, generationConfig: { maxOutputTokens: 4000, temperature: 0.7 } });
            const result = await chat.sendMessage(userMessageParts);
            aiResponse = result.response.text();
            usedModel = primaryModel;
        } catch (error) {
            // Eğer model bulunamadı hatası (404) alırsak, fallback modelini dene
            if (error.message && (error.message.includes('is not found') || error.message.includes('404'))) {
                console.warn(`Model '${primaryModel}' not found. Falling back to '${fallbackModel}'.`);
                try {
                    const model = genAI.getGenerativeModel({ model: fallbackModel, systemInstruction: systemPrompt });
                    const chat = model.startChat({ history: chatHistory, generationConfig: { maxOutputTokens: 4000, temperature: 0.7 } });
                    const result = await chat.sendMessage(userMessageParts);
                    aiResponse = result.response.text();
                    usedModel = fallbackModel;
                } catch (fallbackError) {
                    console.error(`Fallback model '${fallbackModel}' also failed.`);
                    throw fallbackError; // Fallback de başarısız olursa hatayı fırlat
                }
            } else {
                throw error; // Başka bir hata türü ise direkt fırlat
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
            model: usedModel // Çalışan modelin adını gönder
        });
        
    } catch (error) {
        console.error('Gemini Chat error:', error);
        res.status(500).json({ error: 'Bir hata oluştu', details: error.message });
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
            user: { id: userId, email, name: user.name, type: user.type }
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
            user: { id: user.id, email, name: user.name, type: user.type }
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
                createdAt: new Date().toISOString(),
                sessions: [] // Yeni kullanıcı için boş session dizisi
            };
            await setKVData(`user:${email}`, user);
            await setKVData(`user:id:${userId}`, { email });
        }
        
        const token = jwt.sign(
            { id: user.id, email, type: user.type },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            token,
            user: { id: user.id, email, name: user.name, type: user.type }
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

// Get History
app.post('/api/history', authenticateToken, async (req, res) => {
    try {
        const email = req.user.email;
        const user = await getKVData(`user:${email}`);
        
        if (user && user.sessions) {
            res.json(user.sessions.map(s => ({ id: s.id, title: s.title })));
        } else {
            res.json([]); // Kullanıcı veya session yoksa boş dizi dön
        }
    } catch (error) {
        console.error("History API Hatası:", error);
        res.status(500).json({ error: "Geçmiş alınamadı: " + error.message });
    }
});

// Get Session
app.post('/api/get-session', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.body;        
        const email = req.user.email;
        const user = await getKVData(`user:${email}`);
        
        if (user && user.sessions) {
            const session = user.sessions.find(s => s.id == sessionId);
            if (session) return res.json(session);
        }
        res.status(404).json({ error: "Oturum bulunamadı." });
    } catch (error) {
        res.status(500).json({ error: "Oturum alınamadı: " + error.message });
    }
});

// Delete Session
app.post('/api/delete-session', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.body;        
        const email = req.user.email;
        const user = await getKVData(`user:${email}`);
        
        if (user && user.sessions) {
            const initialLength = user.sessions.length;
            user.sessions = user.sessions.filter(s => s.id != sessionId);
            if (user.sessions.length === initialLength) {
                return res.status(404).json({ error: "Silinecek oturum bulunamadı." });
            }
            await setKVData(`user:${email}`, user);
            return res.json({ success: true });
        }
        res.status(404).json({ error: "Kullanıcı veya oturumlar bulunamadı." });
    } catch (error) {
        res.status(500).json({ error: "Oturum silinemedi: " + error.message });
    }
});

// === VARSAYILAN ROTA (Catch-all) ===
// Diğer rotalarla eşleşmezse ana uygulama sayfasını sunar.
app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'life-coach-ui.html'));
});

// Vercel Serverless Handler
export default app;