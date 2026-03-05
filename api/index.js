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

if (!GEMINI_API_KEY) {
    console.warn("UYARI: GEMINI_API_KEY ortam değişkeni ayarlanmamış. Sohbet işlevi çalışmayabilir.");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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
        const { message, image, history, systemPrompt } = req.body;
        
        if (!message && !image) {
            return res.status(400).json({ error: 'Mesaj veya görsel gerekli' });
        }
        
        // Gemini modelini yapılandır
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: systemPrompt 
        });

        // Sohbet geçmişini Gemini formatına çevir
        const chatHistory = (history || []).slice(-10).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({
            history: chatHistory,
            generationConfig: {
                maxOutputTokens: 4000,
                temperature: 0.7,
            },
        });

        let result;
        const userMessageParts = [];
        
        if (message) userMessageParts.push({ text: message });
        
        if (image) {
            // Base64 formatındaki görseli hazırla
            const base64Data = image.split(',')[1];
            const mimeType = image.split(';')[0].split(':')[1];
            userMessageParts.push({
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            });
        }

        result = await chat.sendMessage(userMessageParts);
        const response = result.response;
        
        return res.json({
            response: response.text(),
            model: "gemini-1.5-flash"
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
            createdAt: new Date().toISOString()
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
                createdAt: new Date().toISOString()
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
            createdAt: user.createdAt
        });
        
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Profil bilgisi alınamadı' });
    }
});

// Update Profile
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const user = await getKVData(`user:${req.user.email}`);
        
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        
        user.name = name || user.name;
        await setKVData(`user:${req.user.email}`, user);
        
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            type: user.type
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

// Get Session
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

// Delete Session
app.post('/api/delete-session', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const email = req.user.email;
        let users = await getKVData('users');
        const userIndex = users.findIndex(u => u.email === email);
        
        if (userIndex !== -1 && users[userIndex].sessions) {
            users[userIndex].sessions = users[userIndex].sessions.filter(s => s.id != sessionId);
            await setKVData('users', users);
            return res.json({ success: true });
        }
        res.status(404).json({ error: "Seans bulunamadı." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === VARSAYILAN ROTA (Catch-all) ===
// Diğer rotalarla eşleşmezse ana uygulama sayfasını sunar.
app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'life-coach-ui.html'));
});

// Vercel Serverless Handler
export default app;