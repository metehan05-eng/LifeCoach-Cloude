import 'dotenv/config';
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
import { OAuth2Client } from 'google-auth-library';
import { createRequire } from 'module';
import nodemailer from 'nodemailer';

const require = createRequire(import.meta.url);

// __dirname ES Module çözümü
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(process.cwd(), 'public')));

// --- AYARLAR ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "GOOGLE_CLIENT_ID_BURAYA";

const TEXT_MODELS = [
    "google/gemini-2.0-flash-exp:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "google/gemma-3-27b-it:free",
    "openrouter/free"
];

const VISION_MODELS = [
    "google/gemini-2.0-flash-exp:free",
    "nvidia/nemotron-nano-12b-v2-vl:free",
];

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Rate Limit Config
const RATE_LIMIT_CONFIG = {
    free: { messageLimit: 10, windowMs: 3600000 },
    premium: { messageLimit: 1000, windowMs: 3600000 }
};

// In-memory store for rate limiting
const messageStore = new Map();

// Optional Auth middleware - token varsa kullanıcıyı ekle, yoksa devam et
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

// Auth middleware
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

// Rate limit middleware
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

// === ROUTES ===

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
        
        const modelsToTry = image ? VISION_MODELS : TEXT_MODELS;
        let lastError = null;
        
        for (const model of modelsToTry) {
            try {
                const messages = [];
                
                if (systemPrompt) {
                    messages.push({ role: 'system', content: systemPrompt });
                }
                
                if (history && Array.isArray(history)) {
                    messages.push(...history.slice(-10));
                }
                
                if (image) {
                    messages.push({
                        role: 'user',
                        content: [
                            { type: 'text', text: message || 'Bu görseli analiz et' },
                            { type: 'image_url', image_url: { url: image } }
                        ]
                    });
                } else {
                    messages.push({ role: 'user', content: message });
                }
                
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': req.headers.origin || 'https://lifecoach.app',
                        'X-Title': 'LifeCoach AI'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 4000
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`OpenRouter error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    return res.json({
                        response: data.choices[0].message.content,
                        model: model,
                        usage: data.usage
                    });
                }
                
                throw new Error('Invalid response format');
                
            } catch (error) {
                lastError = error;
                console.error(`Model ${model} failed:`, error.message);
                continue;
            }
        }
        
        throw lastError || new Error('Tüm modeller başarısız oldu');
        
    } catch (error) {
        console.error('Chat error:', error);
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

// Default route - serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'life-coach-ui.html'));
});

// Vercel Serverless Handler
export default (req, res) => {
    return app(req, res);
};