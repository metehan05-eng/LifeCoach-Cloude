// ⚠️ MUST BE FIRST - Load environment variables BEFORE any other imports
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config(); // Also load .env if it exists

// Now import everything else
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { PeerServer } from 'peer';
import cors from 'cors';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { getKVData, setKVData } from '../lib/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import * as pdf from 'pdf-parse';
import { OAuth2Client } from 'google-auth-library';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { spawn } from 'child_process';
import fs from 'fs';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });
app.set('io', io);

// PeerJS Server
const peerServer = PeerServer({ port: 9000, path: '/peerjs' });
console.log('📡 PeerJS Sunucusu 9000 portunda aktif');

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
            if (err) return next(new Error('Authentication error'));
            socket.user = decoded;
            next();
        });
    } else {
        next(new Error('Authentication error'));
    }
});

io.on('connection', (socket) => {
    socket.on('join_room', (roomId) => {
        socket.join(roomId);
    });

    socket.on('join_voice', ({ groupId, channelId, peerId, userId }) => {
        socket.join(`voice_${groupId}_${channelId}`);
        socket.to(`voice_${groupId}_${channelId}`).emit('user_joined_voice', userId, peerId);
    });

    socket.on('leave_voice', ({ groupId, userId }) => {
        socket.broadcast.emit('user_left_voice', userId);
    });
});

// Middleware
// Security Middlewares
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- AYARLAR ve SABİTLER ---
// Gemini API Ayarları (Ana AI)
// Gemini API Ayarları (Tek AI - Sadece Gemini)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_ENDPOINT = process.env.GEMINI_API_ENDPOINT || 'https://generativelanguage.googleapis.com/v1/models';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODELS = ['gemini-2.5-pro', 'gemma-3-27b', 'gemini-2.0-flash'];
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY; // Tavily AI arama için
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY; // Pollinations.ai görsel üretim için (opsiyonel)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "GOOGLE_CLIENT_ID_BURAYA";
const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// OpenRouter API Ayarları
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODELS = [
    "google/gemini-2.0-flash-exp:free",      // Hızlı ve ücretsiz
    "mistralai/mistral-small-3.1-24b-instruct:free", // Kaliteli
    "google/gemma-3-27b-it:free",            // Alternatif
    "openrouter/free"                        // Yedek
];

// --- YARDIMCI FONKSİYONLAR ---
/**
 * Türkiye (UTC+3) saatine göre bugünün tarihini YYYY-MM-DD formatında döner.
 */
function getTodayDate() {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
}

function getYesterdayDate() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
}

// Gemini Client (Tek AI)
let genAI = null;
let ACTUAL_GEMINI_MODEL = GEMINI_MODEL;

// --- DİNAMİK MODEL YAPILANDIRMASI ---
// Monitor scripti tarafından oluşturulan config.json dosyasını kontrol et
try {
    const configPath = path.join(__dirname, 'data/ai_config.json');
    if (fs.existsSync(configPath)) {
        const dynamicConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (dynamicConfig.active_model) {
            ACTUAL_GEMINI_MODEL = dynamicConfig.active_model;
            console.log(`[AI] Dinamik model yüklendi: ${ACTUAL_GEMINI_MODEL} (Kaynak: ai_monitor.py)`);
        }
    }
} catch (err) {
    console.warn("[AI] Dinamik yapılandırma okunamadı, varsayılan kullanılacak.");
}

if (GEMINI_API_KEY) {
    // API Key'in başında/sonunda boşluk varsa temizle (Vercel'de bazen yaşanabiliyor)
    const cleanApiKey = GEMINI_API_KEY.trim();
    genAI = new GoogleGenerativeAI(cleanApiKey);
    console.log(`[AI] Gemini API aktif: ${GEMINI_API_ENDPOINT}`);
    console.log(`[AI] Aktif Gemini modeli: ${ACTUAL_GEMINI_MODEL}`);
} else {
    console.warn("UYARI: GEMINI_API_KEY ayarlanmamış. AI özellikleri çalışmayabilir.");
}

// Supabase Client (optional - use local storage if not configured)
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_URL.includes('YOUR_')) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
} else {
    console.log("📁 Supabase yapılandırılmamış - yerel depolama kullanılıyor");
}

// ── Gemini API çağrısı (Tek AI) ──────────────────────────────
async function callGemini(prompt, history = [], systemInstruction = "") {
    if (!genAI) throw new Error("Gemini API yapılandırılmamış");

    // Hız için en hızlı modelleri seç
    const modelsToTry = [ACTUAL_GEMINI_MODEL, 'gemini-1.5-flash'];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`[AI] Hızlı deneme: ${modelName}`);
            
            // Zaman aşımı kontrolü (Hız için 4 saniye!)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
            }, { apiVersion: 'v1' });

            const contents = [];
            for (const msg of history) {
                const role = msg.role === 'user' ? 'user' : 'model';
                contents.push({
                    role: role,
                    parts: [{ text: msg.content || msg.parts?.map(p => p.text).join(' ') || '' }]
                });
            }
            contents.push({ role: 'user', parts: [{ text: prompt }] });

            const result = await model.generateContent({ contents }, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            return {
                text: result.response.text(),
                model: modelName
            };
        } catch (err) {
            console.warn(`[AI] Deneme başarısız (${modelName}): ${err.message}`);
            lastError = err;
            if (err.message.includes('401') || err.message.includes('403')) break;
        }
    }

    throw lastError || new Error("Gemini denemesi başarısız oldu.");
}

// ── AI Yanıt Fonksiyonu (Gemini & OpenRouter Fallback) ──────────────────────────────
// ── AI Yanıt Fonksiyonu (Gemini & OpenRouter Fallback) ──────────────────────────────
async function generateAIResponse(prompt, history = [], systemInstruction = "") {
    try {
        // 1. Önce Gemini'yi dene (Max 6 saniye)
        const result = await callGemini(prompt, history, systemInstruction);
        return result.text;
    } catch (err) {
        console.warn(`[AI] Gemini başarısız oldu, OpenRouter yedeklemesi başlatılıyor...`);
        
        if (OPENROUTER_API_KEY && OPENROUTER_MODELS.length > 0) {
            const messages = (history || []).map(h => ({
                role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user',
                content: h.parts ? h.parts.map(p => p.text).join(' ') : (h.content || '')
            }));
            messages.push({ role: 'user', content: prompt });

            // Sadece ilk OpenRouter modelini dene (Zaman kısıtlı!)
            try {
                const orResult = await callOpenRouter(messages, OPENROUTER_MODELS[0], systemInstruction);
                return orResult.text;
            } catch (orErr) {
                console.error("[AI] Tüm modeller zaman aşımına uğruyor.");
            }
        }
        throw new Error("Yapay zeka yanıt veremedi, lütfen tekrar deneyin.");
    }
}

// ── Tavily AI Search Helper ──────────────────────────────
async function searchTavily(query, numResults = 5) {
    if (!TAVILY_API_KEY) {
        console.warn('[TavilySearch] TAVILY_API_KEY ayarlanmamış');
        return null;
    }

    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TAVILY_API_KEY}`
            },
            body: JSON.stringify({
                query: query,
                search_depth: 'advanced',
                max_results: numResults,
                include_answer: true,
                include_images: false,
                include_raw_content: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[TavilySearch] API error:', response.status, errorText);
            return null;
        }

        const data = await response.json();

        // Tavily sonuçlarını formatla
        const results = [];

        // AI generated answer varsa ekle (öne çıkan bilgi gibi)
        if (data.answer) {
            results.push({
                title: 'Özet Cevap',
                snippet: data.answer,
                isFeatured: true
            });
        }

        // Arama sonuçlarını ekle
        if (data.results && data.results.length > 0) {
            for (const result of data.results.slice(0, numResults)) {
                results.push({
                    title: result.title,
                    link: result.url,
                    snippet: result.content || result.snippet || ''
                });
            }
        }

        console.log(`[TavilySearch] "${query}" için ${results.length} sonuç bulundu`);
        return results;

    } catch (err) {
        console.error('[TavilySearch] Arama hatası:', err.message);
        return null;
    }
}

// Arama sonuçlarını AI promptuna formatla
function formatSearchResultsForAI(results, query) {
    if (!results || results.length === 0) {
        return '';
    }

    let formatted = `\n\n--- İNTERNET ARAMA SONUÇLARI: "${query}" ---\n\n`;

    results.forEach((result, index) => {
        if (result.isFeatured) {
            formatted += `[ÖNE ÇIKAN BİLGİ]\n${result.snippet}\n\n`;
        } else {
            formatted += `[${index + 1}] ${result.title}\n`;
            formatted += `Kaynak: ${result.displayUrl || result.link}\n`;
            formatted += `Özet: ${result.snippet}\n\n`;
        }
    });

    formatted += '--- ARAMA SONUÇLARI BİTTİ ---\n';
    formatted += 'NOT: Yukarıdaki arama sonuçlarını kullanarak en güncel ve doğru bilgiyi ver.\n\n';

    return formatted;
}

// ── OpenRouter API Çağrısı (Helper) ──────────────────────────────
async function callOpenRouter(messages, model, systemPrompt = null, temperature = 0.7, maxTokens = 2000) {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API Key eksik. Lütfen .env dosyasında OPENROUTER_API_KEY değişkenini ayarlayın.');
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://han-ai.dev/',
                'X-Title': 'Life Coach AI'
            },
            body: JSON.stringify({
                model: model,
                messages: systemPrompt
                    ? [{ role: 'system', content: systemPrompt }, ...messages]
                    : messages,
                temperature: temperature,
                max_tokens: maxTokens
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API hatası: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (!data.choices || data.choices.length === 0) {
            throw new Error("OpenRouter seçim yapamadı (boş yanıt).");
        }

        return {
            text: data.choices[0]?.message?.content || '',
            model: model
        };
    } catch (err) {
        console.error(`[OpenRouter] ${model} isteği başarısız:`, err.message);
        throw err;
    }
}

// ── Pollinations.ai Görsel Üretim Helper ──────────────────────────────
async function generateImage(prompt, options = {}) {
    const {
        width = 1024,
        height = 1024,
        model = 'flux-schnell',
        seed = null,
        nologo = true
    } = options;

    try {
        // URL'yi oluştur - Pollinations.ai formatı
        const encodedPrompt = encodeURIComponent(prompt);
        let url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${model}`;

        if (seed) url += `&seed=${seed}`;
        if (nologo) url += `&nologo=true`;
        if (POLLINATIONS_API_KEY) url += `&key=${POLLINATIONS_API_KEY}`;

        console.log(`[Pollinations] Görsel üretiliyor: ${model}, ${width}x${height}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'image/*, application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Pollinations API hatası: ${response.status} - ${errorText}`);
        }

        // Görseli base64 olarak al
        const imageBuffer = await response.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        console.log(`[Pollinations] Görsel başarıyla üretildi (${(imageBuffer.byteLength / 1024).toFixed(1)} KB)`);

        return {
            success: true,
            base64: base64Image,
            contentType: contentType,
            dataUrl: `data:${contentType};base64,${base64Image}`,
            prompt: prompt,
            model: model
        };

    } catch (err) {
        console.error('[Pollinations] Görsel üretim hatası:', err.message);
        return {
            success: false,
            error: err.message
        };
    }
}

// Hedef için görsel promptu oluştur
function generateGoalImagePrompt(title, description) {
    const cleanTitle = title.replace(/[^a-zA-Z0-9\s\u00C0-\u017F]/g, '').trim();
    const cleanDesc = (description || '').replace(/[^a-zA-Z0-9\s\u00C0-\u017F]/g, '').trim();

    return `A beautiful, inspiring illustration representing: ${cleanTitle}. ${cleanDesc}. 
    Professional artwork, clean composition, warm colors, motivational theme, 
    modern digital art style, high quality, no text, no watermarks.`;
}

// ── YouTube Data API v3 Search Helper ──────────────────────────────
async function searchYouTubeVideo(query) {
    if (!YOUTUBE_API_KEY) return null;
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&relevanceLanguage=tr&key=${YOUTUBE_API_KEY}`;
        const res = await fetch(url, { headers: { 'Referer': 'https://han-ai.dev/' } });
        if (!res.ok) {
            console.error('[YouTube] API error:', res.status, await res.text());
            return null;
        }
        const data = await res.json();
        if (data.items && data.items.length > 0) {
            const item = data.items[0];
            return {
                videoId: item.id.videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails?.medium?.url || null
            };
        }
    } catch (err) {
        console.error('[YouTube] Search failed:', err.message);
    }
    return null;
}

// Helper function to generate AI response for goals briefing - OpenRouter
async function generateAIResponseOpenRouter(prompt, history = []) {
    // OpenRouter modellerini dene
    if (!OPENROUTER_API_KEY) {
        throw new Error('AI not configured - OpenRouter API Key eksik');
    }

    let lastError;
    let systemInstruction = "Sen Türkçe içerik üreten uzman bir eğitim koçusun.";
    const messages = [];

    // History'yi OpenRouter formatına çevir
    for (const msg of history) {
        if (msg.role === 'system') {
            systemInstruction = msg.content;
        } else {
            messages.push({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            });
        }
    }

    // Son kullanıcı mesajını ekle
    messages.push({ role: 'user', content: prompt });

    // Modelleri sırayla dene
    for (const modelName of OPENROUTER_MODELS) {
        try {
            console.log(`[AI-Status] OpenRouter deneniyor: ${modelName}`);
            const result = await callOpenRouter(messages, modelName, systemInstruction, 0.7, 2000);
            console.log(`[AI-Status] ${modelName} yanıtı başarılı.`);
            return result.text;
        } catch (error) {
            console.warn(`[AI-Status] ${modelName} başarısız:`, error.message);
            lastError = error;
        }
    }

    throw new Error(`AI üretimi başarısız: ${lastError.message}`);
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Rate Limit Config
const RATE_LIMIT_CONFIG = {
    free: { messageLimit: 10, windowMs: 3600000 },
    premium: { messageLimit: 1000, windowMs: 3600000 }
};

// In-memory store for rate limiting
const messageStore = new Map();

// --- OPENROUTER HELPER ---
async function callOpenRouterWithFallback(prompt, history = [], systemPrompt = "") {
    if (!OPENROUTER_API_KEY) {
        throw new Error('AI not configured - OpenRouter API Key eksik');
    }

    let lastError;
    const messages = [];

    // History'yi OpenRouter formatına çevir
    for (const msg of history) {
        if (msg.role !== 'system') {
            messages.push({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            });
        }
    }

    // Prompt'u son mesaj olarak ekle
    messages.push({ role: 'user', content: prompt });

    // Modelleri sırayla dene
    for (const modelName of OPENROUTER_MODELS) {
        try {
            console.log(`[AI-Briefing] OpenRouter deneniyor: ${modelName}`);
            const result = await callOpenRouter(messages, modelName, systemPrompt, 0.7, 2000);
            console.log(`[AI-Briefing] ${modelName} başarılı.`);
            return result.text;
        } catch (error) {
            console.warn(`[AI-Briefing] ${modelName} başarısız:`, error.message);
            lastError = error;
        }
    }

    throw new Error(`AI üretimi başarısız: ${lastError.message}`);
}

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

// Security: Simple HTML Sanitizer to prevent XSS
function sanitize(text) {
    if (typeof text !== 'string') return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
// Security: Simple Profanity & sensitive word filter
function filterProfanity(text) {
    if (typeof text !== 'string') return text;
    const badWords = ['küfür1', 'küfür2', 'hack', 'script', 'eval', 'process.env']; // Örnek kelimeler
    let filtered = text;
    badWords.forEach(word => {
        const reg = new RegExp(word, 'gi');
        filtered = filtered.replace(reg, '***');
    });
    return filtered;
}

// Security: LifeCoach Guard - Threat Detection
function detectThreats(text) {
    if (typeof text !== 'string') return false;
    const lethalThreats = ['öldüreceğim', 'vuracağım', 'katil', 'dark web', 'hack', 'terör', 'patlat', 'bombala', 'saldır', 'saldırgan',];
    return lethalThreats.some(threat => text.toLowerCase().includes(threat));
}

// Security: Link & Ad Detection
function isLinkOrAd(text) {
    const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
    const adKeywords = ['satılık', 'satın al', 'tıklayın', 'discord.gg', 't.me'];
    return linkRegex.test(text) || adKeywords.some(ad => text.toLowerCase().includes(ad));
}


// Security: In-memory store for rate limiting
const userLastActionTime = {};

function rateLimit(userId, limitMs = 2000) {
    const now = Date.now();
    if (userLastActionTime[userId] && (now - userLastActionTime[userId] < limitMs)) {
        return false; // Çok hızlı işlem
    }
    userLastActionTime[userId] = now;
    return true;
}

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

        const { message, file, history, systemPrompt, sessionId, mode, userLanguage } = req.body;
        const countryCode = req.headers['x-vercel-ip-country'] || 'Unknown';

        let dbUser = null;
        let memoryInjection = "";
        let modeInjection = "";
        let localizationInjection = "";
        let personaInjection = "";

        const PERSONAS = {
            drill: "Sen bir sert disiplin koçusun. Mazeret kabul etmezsin. Kullanıcıya doğrudan, net ve sonuç odaklı konuşursun. Zaman zaman hesap sorarsın. Yumuşamazsın, ama amacın zarar vermek değil itici kuvvet olmak. Şerbet değil zehirli bir ilaç gibi dürüst ol.",
            kind: "Sen nazik, empatik ve destekleyici bir yaşam koçusun. Her zaman anlayışla yaklaşırsın. Küçük adımları bile büyük başarı olarak kutlarsın. Kullanıcıyı asla yargılamazsın.",
            sage: "Sen Sokratik yöntemi kullanan bilge bir koçsun. Doğrudan cevap vermek yerine sorular sorarak kullanıcının kendi cevabını bulmasına rehberlik edersin. Derin düşündürürsün. Bilgece ve felsefi bir ton kullan."
        };

        // Akıllı Dil ve Konum Tespiti
        const detectedLang = userLanguage || 'tr-TR';
        localizationInjection = `\n\n--- AKILLI YERELLEŞTİRME VE DİL ---\nSiz şu an küresel bir asistansınız. 
Kullanıcının Tercih Ettiği Dil: ${detectedLang}
Kullanıcı Konumu: ${countryCode} (ISO Ülke Kodu)

KURALLAR:
1. Her zaman kullanıcının yukarıdaki dil koduna (${detectedLang}) uygun bir dille yanıt verin. 
2. Eğer kullanıcı farklı bir dilde soru sorsa bile yanıtınızı ona en uygun dilde verin. 
3. Kullanıcının bulunduğu ülkenin (${countryCode}) kültürüne, saat dilimine ve sosyal normlarına uygun davranın.`;

        if (mode === 'emergency') {
            modeInjection = `\n\n--- ACİL DURUM / KRİZ MODU AKTİF ---\nŞu an kullanıcı panik, aşırı stres veya kriz durumunda olabilir. 
- Sakin, kısa ve rehberlik edici cümleler kurun. 
- Uzun paragraflardan kaçının. 
- Kullanıcıyı ana odaklayın (topraklama egzersizleri: 5-4-3-2-1 tekniği gibi). 
- Eğer tehlikeli bir durum sezerseniz profesyonel yardım almasını önerin.
- Cevabınızın sonuna şu bloğu ekleyin: \`\`\`json-trigger {"type": "emergency_active"} \`\`\``;
        } else if (mode === 'tough_love') {
            modeInjection = `\n\n--- YÜZLEŞME (TOUGH LOVE) MODU AKTİF ---\nŞu an kullanıcının uyanmaya ve bahaneleri bırakmaya ihtiyacı var. 
- Kibar olmayı bırakın, dürüst ve sert olun. 
- Bahane kabul etmeyin. 
- Kullanıcının geçmiş hedeflerini hatırlatarak ona sorumluluklarını hatırlatın. 
- Onu eyleme geçmeye zorlayın.
- Cevabınızın sonuna şu bloğu ekleyin: \`\`\`json-trigger {"type": "tough_love_active"} \`\`\``;
        } else if (mode === 'focus_sprint') {
            modeInjection = `\n\n--- FOCUS SPRINT MODU AKTİF ---\nKullanıcı kısa, yüksek etkili bir odak seansı istiyor.
- Yanıtını 3 bölümde ver: (1) 25 dakikalık mini plan, (2) dikkat dağıtıcıları engelleme, (3) seans sonrası hızlı ödül.
- Somut ve eyleme geçirilebilir ol.
- Cevabın sonunda "Sprint başlasın!" gibi motive edici bir kapanış yap.
- Cevabınızın sonuna şu bloğu ekleyin: \`\`\`json-trigger {"type": "focus_sprint_active"} \`\`\``;
        } else if (mode === 'creative_boost') {
            modeInjection = `\n\n--- CREATIVE BOOST MODU AKTİF ---\nKullanıcı yaratıcı düşünme ve keyifli üretim akışına geçmek istiyor.
- Kısa bir yaratıcı ısınma (30-90 sn) öner.
- En az 3 yaratıcı fikir alternatifi üret.
- Oyunlaştırılmış, enerjik ama net bir ton kullan.
- Cevabınızın sonuna şu bloğu ekleyin: \`\`\`json-trigger {"type": "creative_boost_active"} \`\`\``;
        }

        if (req.user && req.user.email) {
            dbUser = await getKVData(`user:${req.user.email}`);
            if (dbUser) {
                if (dbUser.memory) {
                    memoryInjection = `\n\n--- KULLANICI UZUN VADELİ HAFIZA (BİLDİKLERİNİZ) ---\n${dbUser.memory}\n----------------------------------------------------\nKullanıcı hakkında bu bilgileri hatırlayarak kişiselleştirilmiş cevap verin.`;
                }
                if (dbUser.persona && PERSONAS[dbUser.persona]) {
                    personaInjection = `\n\n--- AKTİF KİŞİLİK (PERSONA) ---\n${PERSONAS[dbUser.persona]}\n----------------------------------------------------\nBu kişilik karakterine bürunerek cevap verin.`;
                }
            }
        }

        // Default System Prompt - HAN 4.2 Ultra Core
        const defaultSystemPrompt = `You are LifeCoach AI.

You are an advanced multi-domain artificial intelligence designed to assist users with life planning, productivity, scientific thinking, research, programming, and intelligent decision-making.

--- 💡 TECHNICAL RESPONSE DISCIPLINE 💡 ---
* ONLY write code (Python, JS, etc.) if the topic is specifically about Software Development, Programming, or Coding Tasks.
* For Mathematics, Physics, Chemistry, and other Scientific calculations, DO NOT write code. Instead, solve the problem using clear formulas, step-by-step mathematical reasoning, and scientific notation.
* If the user asks for a plan for a non-technical goal, focus on strategic steps and habit formation rather than providing scripts.
------------------------------------------

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
GoLang
Ruby
Kotlin
Swift
Dart
Rust
TypeScript
HTML5 / CSS3 / Modern JavaScript
React / Next.js / Vue.js / Svelte
Tailwind CSS / Sass / UI Design
SQL / NoSQL Database Design
Full Stack Architecture

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
* build robust backend systems
* design RESTful and GraphQL APIs
* Develop high-performance Frontend applications
* Design responsive and aesthetically pleasing UI/UX
* Expert in state management and web performance
* Senior-level architectural decision making

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
- Eğer "Yarış" oyunu seviyorsa: Need for speed Carbon ve Cars 2 The Video Game

SUPERHERO INTERACTION RULES (SÜPER KAHRAMAN KURALLARI):
Eğer kullanıcı "en sevdiğin süper kahraman kim" veya benzeri bir soru sorarsa, KESİNLİKLE tek bir isim vererek konuyu kapatma. 
Bunun yerine şu kahramanları seçenek olarak sun ve kullanıcının fikrini sor: Homelander, Iron Man, Spider-Man, Dr. Doom, Batman, Magneto.
Kullanıcıya "Senin favorin hangisi?" veya "Sence hangisi daha karizmatik / güçlü?" gibi sorular sorarak onu sohbetin içine çek.

MISSION

You exist to help users:

think clearly  
build discipline  
solve problems intelligently  
and create meaningful progress in their lives.

DEEP SEARCH & WEB ACCESS:
If the user asks for real-time information, research, or anything requiring internet access, you can mention that you are performing a 'Deep Search'.
The system will provide search results as context.

VISUAL MIND MAPS (MERMAID):
When explaining complex plans, structures, or brainstorming, you MUST output a Mermaid Mind Map.
Example:
\`\`\`mermaid
mindmap
  root((Proje Planı))
    Adım 1
      Alt Görev A
      Alt Görev B
    Adım 2
      Alt Görev C
\`\`\`
Using mindmaps improves clarity and user engagement.

EMOTIONAL INTELLIGENCE (EQ) ANALYTICS:
If the user asks for their mental health report or EQ analysis, tell them you are preparing a 'Deep EQ Report'.
This report includes historical mood analysis, stress level tracking, and actionable wellness steps.
You must output a json-action for it:
\`\`\`json-action
{
  "type": "word",
  "filename": "EQ_Analiz_Raporu.docx",
  "content": [
    {"type": "heading", "text": "Haftalık Analiz", "level": 1},
    {"type": "paragraph", "text": "Gözlemlerime göre..."}
  ],
  "eq_data": [
    {"date": "2024-03-17", "score": 65},
    {"date": "2024-03-23", "score": 85}
  ]
}
\`\`\`
The Python engine will automatically generate charts based on the 'eq_data' provided.
You are HAN 4.2 Ultra Core — the intelligence engine behind LifeCoach AI. (Operating on Gemini 1.5 Pro)
${memoryInjection}
${personaInjection}
${modeInjection}
${localizationInjection}

---

LONG-TERM MEMORY ENGINE:
If the user shares personal, permanent, or important information about themselves (e.g., goals, health, job, fears, habits, likes/dislikes), you MUST save it to your long-term memory.
To do this, add a JSON block at the VERY END of your response:
\`\`\`json-memory
{ "memory_update": "Kullanıcı bilgisayar mühendisliği öğrencisi ve sabah erken uyanmakta zorlanıyor." }
\`\`\`
Use this ONLY for new and important information that a Life Coach should remember for future sessions.

---

SMART FILE GENERATION ENGINE:

When a user asks you to "create", "generate", or "build" an EXCEL:
\`\`\`json-action
{
  "type": "excel",
  "filename": "Dosya.xlsx",
  "data": {
    "columns": ["Sıra", "İsim", "Not"],
    "rows": [["1", "Ahmet", "90"], ["2", "Ayşe", "95"]]
  }
}
\`\`\`

WORD:
\`\`\`json-action
{
  "type": "word",
  "filename": "Belge.docx",
  "content": [
    {"type": "heading", "text": "Proje Planı", "level": 0},
    {"type": "paragraph", "text": "Bu proje LifeCoach AI tarafından hazırlandı."},
    {"type": "heading", "text": "Adım 1", "level": 1},
    {"type": "paragraph", "text": "İlk yapılması gereken..."}
  ]
}
\`\`\`

POWERPOINT (CANVA-STİLİ GÖRSEL DESTEKLİ):
\`\`\`json-action
{
  "type": "ppt",
  "filename": "Sunum.pptx",
  "slides": [
    {
      "title": "Gelecek Vizyonu", 
      "content": ["Yapay zeka devrimi", "İnsan-makine işbirliği"]
    },
    {
      "title": "Verimlilik",
      "content": ["Zaman yönetimi", "Otomasyon avantajları"]
    }
  ]
}
\`\`\`
Not: PowerPoint slaytlarına görsel eklemeyin. Her slayt için bağımsız başlık ve metin (content) hazırlayın. Sunumları sadece metin odaklı olarak gerçekleştirin.

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

        // --- GOOGLE ARAMA (Bilgi gerektiren sorular için) ---
        let searchContext = '';
        const lastMessageText = userMessageParts.map(p => p.text || '').join(' ');

        // Bilgi gerektiren soru olup olmadığını kontrol et (Aramayı hızlandırmak için sadece gerekli durumlarda yap)
        const isGreeting = /^(merhaba|selam|hi|hello|hey|günaydın|tünaydın|iyi akşamlar|iyi geceler)/i.test(lastMessageText);
        const isShortQuery = lastMessageText.trim().split(/\s+/).length < 4; // 4 kelimeden az ise kısa sorgu say

        const isInformationalQuery = !isGreeting && !isShortQuery && (
            /^(ne|nedir|nasıl|kim|hangi|neden|niçin|kaç|ne zaman|nerede|nereden|Örnek|Açıkla|Detaylandır|Anlat)/i.test(lastMessageText) ||
            lastMessageText.length > 50
        );

        if (isInformationalQuery && TAVILY_API_KEY) {
            try {
                // Arama sorgusu oluştur (kullanıcı mesajını temizle)
                let searchQuery = lastMessageText
                    .replace(/[?!.].*$/g, '') // Soru işareti ve sonrasını kaldır
                    .substring(0, 80) // Max 80 karakter
                    .trim();

                if (searchQuery.length > 5) {
                    console.log(`[TavilySearch] Chat için arama yapılıyor: "${searchQuery}"`);
                    const searchResults = await searchTavily(searchQuery, 5);

                    if (searchResults && searchResults.length > 0) {
                        searchContext = formatSearchResultsForAI(searchResults, searchQuery);
                        console.log(`[TavilySearch] ${searchResults.length} sonuç bulundu ve prompt'a eklendi`);
                    }
                }
            } catch (searchErr) {
                console.warn('[TavilySearch] Arama hatası (görmezden geliniyor):', searchErr.message);
            }
        }

        // --- AI Model Logic (Gemini with OpenRouter Fallback) ---
        let aiResponse;
        let usedModel;

        const openRouterMessages = chatHistory.map(msg => ({
            role: msg.role === 'model' || msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.parts.map(p => p.text || '').join(' ')
        }));

        let lastUserContent = userMessageParts.map(p => p.text || '').join(' ');
        if (searchContext) lastUserContent += searchContext;
        openRouterMessages.push({ role: 'user', content: lastUserContent });

        async function callOpenRouterWithRetry(modelName, messages, systemPrompt, maxRetries = 1) {
            let attempt = 0;
            while (attempt <= maxRetries) {
                try {
                    const result = await callOpenRouter(messages, modelName, systemPrompt, 0.7, 4000);
                    return { text: result.text, model: result.model };
                } catch (error) {
                    const isRateLimit = error.message?.includes('429');
                    if (isRateLimit && attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        attempt++;
                        continue;
                    }
                    throw error;
                }
            }
        }

        // 1. Önce Gemini'yi dene (Hızlı olduğu için)
        try {
            console.log("[AI] Birincil model olarak Gemini deneniyor...");
            const result = await callGemini(lastUserContent, chatHistory, finalSystemPrompt);
            aiResponse = result.text;
            usedModel = result.model;
        } catch (err) {
            console.warn("[AI] Gemini başarısız oldu, OpenRouter yedeklerine geçiliyor:", err.message);

            // 2. Gemini başarısızsa OpenRouter modellerini dene
            if (OPENROUTER_API_KEY) {
                for (const modelName of OPENROUTER_MODELS) {
                    try {
                        const result = await callOpenRouterWithRetry(modelName, openRouterMessages, finalSystemPrompt);
                        aiResponse = result.text;
                        usedModel = result.model;
                        break;
                    } catch (orErr) {
                        console.warn(`[AI] OpenRouter ${modelName} başarısız:`, orErr.message);
                    }
                }
            }
        }

        if (!aiResponse) {
            throw new Error("Tüm yapay zeka modellerine erişim başarısız oldu. Lütfen internet bağlantınızı kontrol edin.");
        }

        let newSessionId = sessionId;
        let finalAiResponse = aiResponse;
        let triggerData = null;

        // Trigger (json-trigger) bloklarını işle
        if (aiResponse.includes('```json-trigger')) {
            const triggerMatch = aiResponse.match(/```json-trigger\n([\s\S]*?)\n```/);
            if (triggerMatch && triggerMatch[1]) {
                try {
                    triggerData = JSON.parse(triggerMatch[1]);
                } catch (e) {
                    console.error("Trigger parse error:", e);
                }
            }
            finalAiResponse = finalAiResponse.replace(/```json-trigger\n[\s\S]*?\n```/g, '').trim();
        }

        // Hafıza (Memory) bloklarını işle
        if (dbUser && aiResponse.includes('```json-memory')) {
            const memoryMatch = aiResponse.match(/```json-memory\n([\s\S]*?)\n```/);
            if (memoryMatch && memoryMatch[1]) {
                try {
                    const parsedMemory = JSON.parse(memoryMatch[1]);
                    if (parsedMemory.memory_update) {
                        const timestamp = new Date().toLocaleDateString('tr-TR');
                        dbUser.memory = (dbUser.memory || "") + `\n- [${timestamp}]: ${parsedMemory.memory_update}`;
                    }
                } catch (e) {
                    console.error("Memory parse error:", e);
                }
            }
            // Sadece block olan kısmı sil, gizli kalsın
            finalAiResponse = finalAiResponse.replace(/```json-memory\n[\s\S]*?\n```/g, '').trim();
        }

        // Action (json-action) bloklarını işle
        let actionData = null;
        if (aiResponse.includes('```json-action')) {
            const actionMatch = aiResponse.match(/```json-action\n([\s\S]*?)\n```/);
            if (actionMatch && actionMatch[1]) {
                try {
                    actionData = JSON.parse(actionMatch[1]);
                } catch (e) {
                    console.error("Action parse error:", e);
                }
            }
            // Block olan kısmı sil, frontend'de trigger olarak ele alacağız
            finalAiResponse = finalAiResponse.replace(/```json-action\n[\s\S]*?\n```/g, '').trim();
        }

        // Oturum açmış kullanıcılar için sohbeti kaydet
        if (req.user && req.user.id) {
            if (supabase) {
                let session;
                if (sessionId) {
                    const { data } = await supabase.from('chat_history').select('*').eq('id', sessionId).eq('user_id', req.user.id).single();
                    if (data) session = data;
                }

                if (!session) {
                    newSessionId = sessionId || crypto.randomUUID();
                    const title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
                    session = { id: newSessionId, user_id: req.user.id, title: title, messages: [] };
                }

                session.messages.push({ role: 'user', content: message });
                session.messages.push({ role: 'assistant', content: finalAiResponse });

                await supabase.from('chat_history').upsert({
                    id: session.id,
                    user_id: session.user_id,
                    title: session.title,
                    messages: session.messages,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            } else if (dbUser && req.user.email) {
                if (!dbUser.sessions) dbUser.sessions = [];

                let session;
                if (sessionId) {
                    session = dbUser.sessions.find(s => s.id == sessionId);
                }

                if (!session) {
                    newSessionId = Date.now().toString();
                    const title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
                    session = { id: newSessionId, title: title, messages: [] };
                    dbUser.sessions.push(session);
                }

                session.messages.push({ role: 'user', content: message });
                session.messages.push({ role: 'assistant', content: finalAiResponse });

                // En son 20 oturumu sakla
                dbUser.sessions.sort((a, b) => Number(b.id) - Number(a.id));
                dbUser.sessions = dbUser.sessions.slice(0, 20);

                await setKVData(`user:${req.user.email}`, dbUser);
            }
        }

        return res.json({
            response: finalAiResponse,
            // Eğer yeni bir oturum oluşturulduysa, ID'sini ön yüze gönder
            sessionId: newSessionId,
            model: usedModel, // Çalışan modelin adını gönder
            trigger: triggerData, // Tetikleyici verisini gönder
            action: actionData // Dosya aksiyon verisini gönder
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

        let uniqueId;
        while (true) {
            uniqueId = Math.floor(1000 + Math.random() * 9000).toString();
            // Basit çarpışma kontrolü (KV'de aramak pahalı olabilir, şimdilik ID mantığını uyguluyoruz)
            break;
        }

        const user = {
            id: userId,
            uniqueId, // 4 haneli güvenli ID
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
            let uniqueId = Math.floor(1000 + Math.random() * 9000).toString();

            user = {
                id: userId,
                uniqueId,
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

        // Mevcut kullanıcılarda uniqueId yoksa otomatik oluştur
        if (user && !user.uniqueId) {
            user.uniqueId = Math.floor(1000 + Math.random() * 9000).toString();
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
            uniqueId: user.uniqueId || '0000',
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
        const { newName, newAvatar, persona, job, goal, notes } = req.body;
        const user = await getKVData(`user:${req.user.email}`);

        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        user.name = newName || user.name;
        if (newAvatar !== undefined) user.avatar = newAvatar;
        if (persona !== undefined) user.persona = persona;

        // Detailed memory fields
        if (!user.memoryData) user.memoryData = {};
        if (job !== undefined) user.memoryData.job = job;
        if (goal !== undefined) user.memoryData.goal = goal;
        if (notes !== undefined) user.memoryData.notes = notes;

        // General text memory for injection in chat
        user.memory = `AD: ${user.name}\nMESLEK: ${user.memoryData.job || 'Bilinmiyor'}\nHEDEF: ${user.memoryData.goal || 'Bilinmiyor'}\nNOTLAR: ${user.memoryData.notes || 'Yok'}`;

        await setKVData(`user:${req.user.email}`, user);

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                type: user.type,
                avatar: user.avatar,
                persona: user.persona,
                memoryData: user.memoryData
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Profil güncellenemedi' });
    }
});

// Get Profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await getKVData(`user:${req.user.email}`);
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        res.json({
            name: user.name,
            avatar: user.avatar,
            persona: user.persona,
            memoryData: user.memoryData || {}
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Profil alınamadı' });
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
    const sortedDates = [...new Set(completions)].sort().reverse();
    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;

    let streak = 0;
    let checkDateStr = sortedDates[0];

    for (const date of sortedDates) {
        if (date === checkDateStr) {
            streak++;
            const d = new Date(checkDateStr);
            d.setHours(d.getHours() + 12); // Buffer to stay on the same logical day regardless of DST
            d.setDate(d.getDate() - 1);
            checkDateStr = d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
        } else {
            break;
        }
    }
    return streak;
}

function calculateReflectionStreak(reflections) {
    if (!reflections || reflections.length === 0) return 0;
    const dates = [...new Set(reflections.map(r => r.date))].sort().reverse();
    const today = getTodayDate();
    const yesterdayStr = getYesterdayDate();
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
    const today = getTodayDate();
    const yesterdayStr = getYesterdayDate();
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
        const today = getTodayDate();
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
            const today = getTodayDate();
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
        const today = getTodayDate();
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
        const today = getTodayDate();
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
        const today = getTodayDate();
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
            const newSession = { id: Date.now().toString(), startTime: startTime || new Date().toISOString(), endTime: null, duration: 0, date: getTodayDate(), status: 'active' };
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
        const today = getTodayDate();

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
        if (!title || !type || !description) return res.status(400).json({ error: 'Başlık, tür ve açıklama gereklidir' });

        const allGoals = await getKVData('goals');
        const userGoals = allGoals[userId] || [];

        // ── Hedef Oluştururken DeepSeek ile Akıllı Analiz Al
        let aiDetails = "Hedef planı hazırlanıyor...";
        try {
            const prompt = `Yeni bir hedef oluşturdum: "${title}". Bu hedef için kısa bir motivasyon cümlesi ve 3 ana mihenk taşı belirle. (DeepSeek Analizi)`;
            aiDetails = await generateAIResponse(prompt, [
                { role: 'system', content: 'Sen profesyonel bir başarı ve verimlilik koçusun.' }
            ]);
        } catch (err) {
            console.warn("[AI-Goal] Başlangıç analizi başarısız:", err.message);
            aiDetails = "Analiz şu an yapılamıyor, ancak hedefiniz kaydedildi.";
        }

        // ── Görsel özelliği devre dışı bırakıldı ──
        let goalImage = null;

        const newGoal = {
            id: Date.now().toString(),
            title,
            type,
            description: description || '',
            aiDetails: aiDetails,
            image: goalImage, // Pollinations.ai görseli
            progress: 0,
            status: 'in-progress',
            targetDate: targetDate || null,
            completions: [],
            briefings: {}, // Yol haritaları buraya kaydedilecek
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        userGoals.push(newGoal);
        allGoals[userId] = userGoals;
        await setKVData('goals', allGoals);
        res.status(201).json(newGoal);
    } catch (error) {
        console.error("Hedef oluşturma hatası:", error);
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
            ...userGoals[idx],
            title: title !== undefined ? title : userGoals[idx].title,
            type: type !== undefined ? type : userGoals[idx].type,
            description: description !== undefined ? description : userGoals[idx].description,
            progress: progress !== undefined ? progress : userGoals[idx].progress,
            status: status !== undefined ? status : userGoals[idx].status,
            targetDate: targetDate !== undefined ? targetDate : userGoals[idx].targetDate,
            reflection: reflection !== undefined ? reflection : userGoals[idx].reflection,
            updatedAt: new Date().toISOString()
        };
        allGoals[userId] = userGoals;
        await setKVData('goals', allGoals);
        res.json(userGoals[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Güncelleme hatası' });
    }
});

app.post('/api/goals/briefing', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id, title, description, progress, completions, date } = req.body;
        if (!title || !description) return res.status(400).json({ error: 'Title and description required' });

        // ── Date handling (no timezone shift)
        const targetDate = date || getTodayDate();
        const todayDate = getTodayDate();
        const [y, m, d2] = targetDate.split('-').map(Number);
        const dayLabel = new Date(y, m - 1, d2).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

        // ── Block future dates
        if (targetDate > todayDate) {
            return res.status(403).json({ error: 'Gelecek tarihler için plan henüz oluşturulamaz.' });
        }

        // ── Load goal data
        const allGoals = await getKVData('goals') || {};
        const userGoals = allGoals[userId] || [];
        const goalIdx = userGoals.findIndex(g => String(g.id) === String(id));

        // ── Return cached briefing if exists
        if (goalIdx !== -1 && userGoals[goalIdx].briefings && userGoals[goalIdx].briefings[targetDate]) {
            const cached = userGoals[goalIdx].briefings[targetDate];
            // If cached is an object (new format) return it directly
            if (typeof cached === 'object' && cached.content) {
                return res.json({ briefing: cached.content, video: cached.video || null });
            }
            // Legacy string format
            return res.json({ briefing: cached, video: null });
        }

        // ── Build past topics context
        const existingBriefings = (goalIdx !== -1 && userGoals[goalIdx].briefings) ? userGoals[goalIdx].briefings : {};
        const sortedPastDates = Object.keys(existingBriefings).sort();
        const pastTopicLines = sortedPastDates.map((pd, i) => {
            const b = existingBriefings[pd];
            const text = typeof b === 'object' ? (b.content || '').substring(0, 180) : b.substring(0, 180);
            return `[Gün ${i + 1} - ${pd}]: ${text.replace(/\n/g, ' ')}`;
        }).join('\n');

        const pastSection = sortedPastDates.length > 0
            ? `=== DAHA ÖNCE İŞLENEN KONULAR (BUNLARI TEKRAR ETME) ===\n${pastTopicLines}\n=== SONRAKİ KONUYA GEÇ ===`
            : '=== BU HEDEF İÇİN İLK GÜN — Temelden başla ===';

        const completionCount = Array.isArray(completions) ? completions.length : 0;
        const currentProgress = progress || 0;

        // ── AI Prompt — detailed content + search query only (no YOUTUBE_ID)
        const prompt = `Hedef: ${title}
Açıklama: ${description}
İlerleme: %${currentProgress} | Tamamlanan Gün: ${completionCount}
Tarih: ${dayLabel}

${pastSection}

GÖREV: Yukarıdaki hedefe uygun, ${dayLabel} tarihine özel ve geçmişte işlenmemiş SIRADAKİ KONUYU anlat.

KONU KURALLARI:
- YAZILIM/PROGRAMLAMA: Açıklama yap, çalışan kod ver, "**Beklenen Çıktı:**" bloğuyla terminal çıktısını göster.
- MATEMATİK: Formüller, adım adım hesaplama göster.
- DİĞER: O konuya en uygun yöntemi kullan (diyalog, tablo, liste vb.)

ZORUNLU YAPI (bu başlıkları kullan):
### 🎯 Günlük Odak
(Bu günün konusu — 1-2 cümle özet)

### 📚 Öğrenilecek Başlıklar
[ ] Başlık 1
[ ] Başlık 2
[ ] Başlık 3

### 📖 Detaylı Anlatım
(Konuyu kapsamlı ve anlaşılır şekilde açıkla. Teknik detayları, formülleri veya örnekleri buraya yaz.)

### 💻 Pratik Uygulama
(Kod, hesaplama veya alıştırma örneği)

---
SEARCH_QUERY: [Bu konuyu öğrenmek için YouTube'da aranacak Türkçe arama terimi]
---

Yanıt dili Türkçe olmalı. SEARCH_QUERY satırını en sona yaz, başka hiçbir şey ekleme.`;

        const aiText = await generateAIResponse(prompt, [
            { role: 'system', content: 'Sen Türkçe içerik üreten uzman bir eğitim koçusun. Her gün farklı, ilerleyici konular anlat. Aynı konuyu kesinlikle tekrar etme.' }
        ]);

        // ── Extract search query from AI response
        let searchQuery = `${title} dersi türkçe`;
        const sqMatch = aiText.match(/SEARCH_QUERY:\s*(.+)/i);
        if (sqMatch && sqMatch[1]) searchQuery = sqMatch[1].trim();

        // Clean AI text (remove SEARCH_QUERY line and trailing ---)
        const cleanContent = aiText
            .replace(/SEARCH_QUERY:\s*.+/gi, '')
            .replace(/---+\s*$/g, '')
            .trim();

        // ── YouTube Data API — find real video
        const video = await searchYouTubeVideo(searchQuery);
        console.log(`[YouTube] Query: "${searchQuery}" → ${video ? video.videoId : 'no result'}`);

        // ── Cache result
        const cacheEntry = { content: cleanContent, video: video, searchQuery, createdAt: new Date().toISOString() };
        if (goalIdx !== -1) {
            if (!userGoals[goalIdx].briefings) userGoals[goalIdx].briefings = {};
            userGoals[goalIdx].briefings[targetDate] = cacheEntry;
            await setKVData('goals', allGoals);
        }

        res.json({ briefing: cleanContent, video });

    } catch (error) {
        console.error('Briefing error:', error);
        res.status(500).json({ error: 'Briefing generation failed: ' + error.message });
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

        const today = getTodayDate();
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

// --- GOAL IMAGE GENERATION API ---
app.post('/api/goals/generate-image', authenticateToken, async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Hedef başlığı gereklidir' });
        }

        // Görsel promptunu oluştur
        const imagePrompt = generateGoalImagePrompt(title, description);

        // Pollinations.ai ile görsel üret
        const imageResult = await generateImage(imagePrompt, {
            width: 1024,
            height: 1024,
            model: 'flux-schnell'
        });

        if (imageResult.success) {
            res.json({
                success: true,
                image: imageResult.dataUrl,
                prompt: imagePrompt,
                model: imageResult.model
            });
        } else {
            res.status(500).json({
                success: false,
                error: imageResult.error || 'Görsel üretilemedi'
            });
        }

    } catch (error) {
        console.error('[Pollinations] Endpoint hatası:', error);
        res.status(500).json({ error: 'Görsel üretim hatası: ' + error.message });
    }
});

// --- SESSION & HISTORY API ---

app.post('/api/history', authenticateToken, async (req, res) => {
    try {
        if (supabase) {
            const { data, error } = await supabase.from('chat_history')
                .select('id, title, updated_at')
                .eq('user_id', req.user.id)
                .order('updated_at', { ascending: false })
                .limit(20);
            if (error) throw error;
            res.json(data.map(s => ({ id: s.id, title: s.title, date: s.updated_at })));
        } else {
            const email = req.user.email;
            // Kullanıcı verisi user:email anahtarında saklanıyor
            const user = await getKVData(`user:${email}`);
            res.json(user?.sessions ? user.sessions.map(s => ({ id: s.id, title: s.title })) : []);
        }
    } catch (error) {
        res.status(500).json({ error: 'Geçmiş hatası' });
    }
});

app.post('/api/get-session', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (supabase) {
            const { data, error } = await supabase.from('chat_history')
                .select('*')
                .eq('id', sessionId)
                .eq('user_id', req.user.id)
                .single();
            if (data) {
                res.json({ id: data.id, title: data.title, messages: data.messages });
            } else {
                res.status(404).json({ error: 'Seans bulunamadı' });
            }
        } else {
            const email = req.user.email;
            // Kullanıcı verisi user:email anahtarında saklanıyor
            const user = await getKVData(`user:${email}`);
            const session = user?.sessions?.find(s => s.id == sessionId);
            if (session) res.json(session);
            else res.status(404).json({ error: 'Seans bulunamadı' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Seans hatası' });
    }
});

app.post('/api/delete-session', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (supabase) {
            const { error } = await supabase.from('chat_history')
                .delete()
                .eq('id', sessionId)
                .eq('user_id', req.user.id);
            if (error) throw error;
            return res.json({ success: true });
        } else {
            const email = req.user.email;
            const user = await getKVData(`user:${email}`);
            if (user && user.sessions) {
                user.sessions = user.sessions.filter(s => s.id != sessionId);
                await setKVData(`user:${email}`, user);
                return res.json({ success: true });
            }
            res.status(404).json({ error: 'Bulunamadı' });
        }
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

// --- PREMIUM FILE EXPORT (Python Driven) ---
app.post('/api/export-plus', authenticateToken, async (req, res) => {
    try {
        const payload = req.body;
        const pyPath = path.join(process.cwd(), 'venv/bin/python3');
        const scriptPath = path.join(process.cwd(), 'api/py_generator.py');

        const pythonProcess = spawn(pyPath, [scriptPath]);

        pythonProcess.stdin.write(JSON.stringify(payload));
        pythonProcess.stdin.end();

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error("Python error:", errorOutput);
                return res.status(500).json({ error: 'Python Execution Failed', details: errorOutput });
            }

            try {
                const result = JSON.parse(output);
                if (result.error) return res.status(500).json({ error: result.error });

                const filePath = result.path;
                if (!fs.existsSync(filePath)) {
                    return res.status(404).json({ error: 'Generated file not found' });
                }

                res.download(filePath, payload.filename || 'export.file', (err) => {
                    if (err) console.error("Download error:", err);
                    // Temizlik
                    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
                });
            } catch (pErr) {
                console.error("Parse Error:", pErr, output);
                res.status(500).json({ error: 'Output parsing error' });
            }
        });
    } catch (error) {
        console.error("Export Plus Main Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- DEEP SEARCH API (Python Driven) ---
app.post('/api/deep-search', authenticateToken, async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query required' });

        const pyPath = path.join(process.cwd(), 'venv/bin/python3');
        const scriptPath = path.join(process.cwd(), 'api/py_generator.py');

        const pythonProcess = spawn(pyPath, [scriptPath]);
        pythonProcess.stdin.write(JSON.stringify({ mode: 'search', query }));
        pythonProcess.stdin.end();

        let output = '';
        pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
        pythonProcess.on('close', (code) => {
            if (code !== 0) return res.status(500).json({ error: 'Search failed' });
            try {
                const result = JSON.parse(output);
                res.json(result);
            } catch (e) { res.status(500).json({ error: 'Parse error' }); }
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- SOCIAL API (Study Groups & Partners) ---
app.all('/api/social', authenticateToken, async (req, res) => {
    try {
        const userId = String(req.user.id); // Ensure string for consistency
        const { type, action, id } = req.query;

        if (type === 'partners') {
            const partnersKV = await getKVData('accountability_partners') || {};
            const userPartners = partnersKV[userId] || [];

            if (req.method === 'GET') {
                if (action === 'checkins') {
                    const allCheckIns = await getKVData('social_checkins') || {};
                    const userCheckIns = allCheckIns[userId] || [];
                    return res.json(userCheckIns);
                }
                return res.json(userPartners);
            }

            if (req.method === 'POST') {
                if (action === 'checkin') {
                    const { partnerId, message } = req.body;
                    const allCheckIns = await getKVData('social_checkins') || {};
                    if (!allCheckIns[partnerId]) allCheckIns[partnerId] = [];

                    const checkIn = {
                        senderId: userId,
                        partnerName: req.user.name || 'Partner',
                        message,
                        date: new Date().toISOString()
                    };

                    allCheckIns[partnerId].push(checkIn);
                    await setKVData('social_checkins', allCheckIns);
                    return res.json({ success: true });
                }
            }
        }

        if (type === 'groups') {
            const groupsKV = await getKVData('study_groups') || {};

            // GET: List groups or get detail
            if (req.method === 'GET') {
                if (id) {
                    if (action === 'messages') {
                        const channelId = req.query.channelId;
                        const group = groupsKV[id];
                        if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });
                        if (!group.members.includes(userId)) return res.status(403).json({ error: 'Bu grupta değilsiniz' });

                        let targetMessages = group.messages || [];
                        if (channelId && group.channels) {
                            const c = group.channels.find(ch => ch.id === channelId);
                            if (c) targetMessages = c.messages || [];
                        }
                        return res.json({ messages: targetMessages });
                    } else {
                        // Group detail
                        const group = groupsKV[id];
                        if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });

                        // Her üye için durum bilgilerini topla
                        const memberDetails = await Promise.all((group.members || []).map(async (mId) => {
                            const status = await getKVData(`user_status:${mId}`) || { text: 'Çevrimiçi', emoji: '🟢' };
                            return { id: mId, status };
                        }));

                        return res.json({
                            group: { ...group, memberDetails },
                            isOwner: group.ownerId === userId
                        });
                    }
                } else {
                    // List all
                    // Filtrering: Eğer kullanıcı bu gruptan BANLANMIŞSA, grup hiç gözükmesin
                    const filteredGroups = Object.values(groupsKV).filter(g => {
                        const isBanned = g.bannedUsers && g.bannedUsers.includes(userId);
                        return !isBanned;
                    });

                    return res.json(filteredGroups);
                }
            }

            // POST: Create, Join, Leave, Message
            if (req.method === 'POST') {
                if (action === 'join') {
                    const groupId = req.body.groupId;
                    if (!groupsKV[groupId]) return res.status(404).json({ error: 'Grup bulunamadı' });
                    if (!groupsKV[groupId].members.includes(userId)) {
                        if (groupsKV[groupId].members.length >= 60) return res.status(403).json({ error: 'Grup maksimum 60 kişilik kapasiteye ulaşmıştır.' });
                        groupsKV[groupId].members.push(userId);
                        await setKVData('study_groups', groupsKV);
                    }
                    return res.json({ success: true });
                } else if (action === 'joinByCode') {
                    const joinCode = req.body.joinCode;
                    const group = Object.values(groupsKV).find(g => g.joinCode === joinCode);
                    if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });
                    if (!group.members.includes(userId)) {
                        if (group.members.length >= 60) return res.status(403).json({ error: 'Grup maksimum 60 kişilik kapasiteye ulaşmıştır.' });
                        group.members.push(userId);
                        await setKVData('study_groups', groupsKV);
                    }
                    return res.json({ success: true, groupId: group.id });
                } else if (action === 'leave') {
                    const groupId = id;
                    if (!groupsKV[groupId]) return res.status(404).json({ error: 'Grup bulunamadı' });
                    groupsKV[groupId].members = groupsKV[groupId].members.filter(m => m !== userId);
                    await setKVData('study_groups', groupsKV);
                    return res.json({ success: true });
                } else if (action === 'message') {
                    const groupId = id;
                    const group = groupsKV[groupId];
                    if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });

                    // GÜVENLİK: Kara Liste Kontrolü
                    if (group.bannedUsers && group.bannedUsers.includes(userId)) {
                        return res.status(403).json({ error: 'LifeCoach Guard: Bu gruptan kalıcı olarak men edildiniz!' });
                    }

                    // GÜVENLİK: Susturma (Timeout) Kontrolü
                    if (group.timeouts && group.timeouts[userId]) {
                        const expiry = group.timeouts[userId];
                        if (Date.now() < expiry) {
                            const remaining = Math.ceil((expiry - Date.now()) / (1000 * 60 * 60));
                            return res.status(403).json({ error: `Ceza: Kural ihlali nedeniyle ${remaining} saat boyunca mesaj gönderemezsiniz.` });
                        } else {
                            delete group.timeouts[userId]; // Süre bittiyse temizle
                        }
                    }

                    if (!group.members.includes(userId)) return res.status(403).json({ error: 'Bu gruba mesaj atma yetkiniz yok' });

                    if (!rateLimit(userId, 2000)) {
                        return res.status(429).json({ error: 'Çok hızlı mesaj gönderiyorsunuz.' });
                    }

                    // --- LIFE COACH GUARD: KRİTİK KORUMA ---
                    if (detectThreats(content)) {
                        if (!group.bannedUsers) group.bannedUsers = [];
                        group.bannedUsers.push(userId);
                        group.members = group.members.filter(id => id !== userId);
                        await setKVData('study_groups', groupsKV);
                        return res.status(403).json({ error: 'LifeCoach Guard: Tehdit içeren mesaj tespit edildi! Gruptan kalıcı olarak yasaklandınız.' });
                    }

                    // --- ADMIN KURALLARI: LİNK VE REKLAM ---
                    if (group.rules && (group.rules.noLinks || group.rules.noAds)) {
                        if (isLinkOrAd(content)) {
                            if (!group.timeouts) group.timeouts = {};
                            group.timeouts[userId] = Date.now() + (5 * 60 * 60 * 1000); // 5 Saat Ceza
                            await setKVData('study_groups', groupsKV);
                            return res.status(403).json({ error: 'Bu grupta link veya reklam paylaşmak yasaktır! 5 saat susturuldunuz.' });
                        }
                    }

                    const sanitizedContent = sanitize(content);
                    const filteredContent = filterProfanity(sanitizedContent);
                    const isSwearing = sanitizedContent !== filteredContent;

                    // OTOMATİK MODERASYON: Küfür Sayacı
                    if (isSwearing) {
                        if (!group.violationCounts) group.violationCounts = {};
                        group.violationCounts[userId] = (group.violationCounts[userId] || 0) + 1;

                        // 60. Küfürde Ban At
                        if (group.violationCounts[userId] >= 60) {
                            if (!group.bannedUsers) group.bannedUsers = [];
                            group.bannedUsers.push(userId);
                            // Üyelerden çıkar
                            group.members = group.members.filter(id => id !== userId);
                            await setKVData('study_groups', groupsKV);
                            return res.status(403).json({ error: '60 ihlal sınırı aşıldı! Gruptan kalıcı olarak kovuldunuz.' });
                        }

                        // Güncel sayacı kaydetmek için (ban olmasa bile puan artışını kaydet)
                        await setKVData('study_groups', groupsKV);
                    }

                    const msg = {
                        senderId: req.user.email?.split('@')[0] || userId.substring(0, 5),
                        content: filteredContent,
                        timestamp: Date.now()
                    };

                    let targetRoom = groupId;
                    if (channelId && groupsKV[groupId].channels) {
                        const channel = groupsKV[groupId].channels.find(c => c.id === channelId);
                        if (channel && channel.type === 'text') {
                            if (!channel.messages) channel.messages = [];
                            channel.messages.push(msg);
                            if (channel.messages.length > 200) channel.messages = channel.messages.slice(-200);
                            targetRoom = `${groupId}_${channelId}`;
                        }
                    } else {
                        if (!groupsKV[groupId].messages) groupsKV[groupId].messages = [];
                        groupsKV[groupId].messages.push(msg);
                        if (groupsKV[groupId].messages.length > 100) groupsKV[groupId].messages = groupsKV[groupId].messages.slice(-100);
                    }

                    if (req.app.get('io')) {
                        req.app.get('io').to(targetRoom).emit('new_message', msg);
                    }
                    await setKVData('study_groups', groupsKV);
                    return res.json({ success: true });
                } else if (action === 'kick') {
                    const { groupId, targetUserId } = req.body;
                    const group = groupsKV[groupId];
                    if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });
                    if (group.ownerId !== userId) return res.status(403).json({ error: 'Sadece grup yöneticisi üye atabilir' });

                    group.members = (group.members || []).filter(m => m !== targetUserId);
                    groupsKV[groupId] = group;
                    await setKVData('study_groups', groupsKV);
                    return res.json({ success: true, message: 'Üye gruptan atıldı' });
                } else if (action === 'update') {
                    const { groupId, name, description, avatarData } = req.body;
                    const group = groupsKV[groupId];
                    if (!group) return res.status(404).json({ error: 'Grup bulunamadı' });
                    if (group.ownerId !== userId) return res.status(403).json({ error: 'Sadece yönetici grubu güncelleyebilir' });

                    if (name) group.name = sanitize(name); // GÜVENLİK
                    if (description) group.description = sanitize(description); // GÜVENLİK
                    if (avatarData) {
                        // Resim verisi base64 ise sadece format kontrolü yap (XSS önlemi)
                        if (avatarData.startsWith('data:image/')) {
                            group.avatarUrl = avatarData;
                        }
                    }

                    groupsKV[groupId] = group;
                    await setKVData('study_groups', groupsKV);
                    return res.json({ success: true, group });
                } else {
                    // Create group
                    const { name, description, subject, isPublic, avatarUrl, noLinks, noAds } = req.body;
                    const newGroupId = 'g_' + Date.now();

                    let joinCode = Math.floor(1000 + Math.random() * 9000).toString();
                    while (Object.values(groupsKV).some(g => g.joinCode === joinCode)) {
                        joinCode = Math.floor(1000 + Math.random() * 9000).toString();
                    }

                    groupsKV[newGroupId] = {
                        id: newGroupId,
                        joinCode,
                        name,
                        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${newGroupId}`,
                        description,
                        subject,
                        isPublic: !!isPublic,
                        ownerId: userId,
                        members: [userId],
                        channels: [
                            { id: 'genel', name: 'Genel Sohbet', type: 'text', messages: [] },
                            { id: 'yardim', name: 'Yardımlaşma', type: 'text', messages: [] },
                            { id: 'sesli', name: 'Sesli Çalışma', type: 'voice' }
                        ],
                        messages: [],
                        createdAt: Date.now()
                    };
                    await setKVData('study_groups', groupsKV);
                    return res.json({ success: true, group: groupsKV[newGroupId] });
                }
            }

            // PUT: Update settings
            if (req.method === 'PUT') {
                const groupId = id;
                if (!groupsKV[groupId]) return res.status(404).json({ error: 'Grup bulunamadı' });
                if (groupsKV[groupId].ownerId !== userId) return res.status(403).json({ error: 'Yetkisiz' });

                const { name, description, subject, isPublic } = req.body;
                if (name) groupsKV[groupId].name = name;
                if (description) groupsKV[groupId].description = description;
                if (subject) groupsKV[groupId].subject = subject;
                if (isPublic !== undefined) groupsKV[groupId].isPublic = isPublic;

                await setKVData('study_groups', groupsKV);
                return res.json({ success: true });
            }

            // PATCH: Remove member
            if (req.method === 'PATCH' && action === 'removeMember') {
                const groupId = id;
                const targetMember = req.body.memberId;
                if (!groupsKV[groupId]) return res.status(404).json({ error: 'Grup bulunamadı' });
                if (groupsKV[groupId].ownerId !== userId) return res.status(403).json({ error: 'Yetkisiz' });

                groupsKV[groupId].members = groupsKV[groupId].members.filter(m => m !== targetMember);
                await setKVData('study_groups', groupsKV);
                return res.json({ success: true });
            }

            // DELETE: Delete group
            if (req.method === 'DELETE') {
                const groupId = id;
                if (!groupsKV[groupId]) return res.status(404).json({ error: 'Grup bulunamadı' });
                if (groupsKV[groupId].ownerId !== userId) return res.status(403).json({ error: 'Yetkisiz' });

                delete groupsKV[groupId];
                await setKVData('study_groups', groupsKV);
                return res.json({ success: true });
            }
        } else if (type === 'partners') {
            if (req.method === 'POST') {
                const { partnerEmail, note } = req.body;

                // Fetch existing partners mapped by userId
                const partnersKV = await getKVData('accountability_partners') || {};
                if (!partnersKV[userId]) partnersKV[userId] = [];

                partnersKV[userId].push({
                    email: partnerEmail,
                    note,
                    status: 'pending',
                    addedAt: Date.now()
                });

                await setKVData('accountability_partners', partnersKV);
                return res.json({ success: true });
            } else if (req.method === 'GET') {
                const partnersKV = await getKVData('accountability_partners') || {};
                return res.json(partnersKV[userId] || []);
            }
        } else if (type === 'friends') {
            if (req.method === 'GET' && action === 'profile') {
                const searchId = req.query.uniqueId;
                if (!searchId) return res.status(400).json({ error: 'Arama ID gerekli' });

                // Note: Linear search in KV is slow for production, but works for mock DB
                // Usually we'd maintain an index `user:uniqueId:${id}`
                const users = await getKVData('all_users_index') || [];
                // Since this is mock DB without index, let's create a proxy search or assume we saved it.
                // In a real database we'd do a select by uniqueId. We'll simulate finding it:
                return res.json({
                    success: true,
                    profile: { uniqueId: searchId, name: 'Bilinmeyen Kullanıcı (Kayıtlı değil)', type: 'free' }
                });
            }

            // 1-e-1 Özel ve Güvenli Mesajlaşma (DM)
            const dmsKV = await getKVData('direct_messages') || {};

            // GET /api/social?type=friends&action=dm&targetId=1234
            if (req.method === 'GET' && action === 'dm') {
                const targetId = req.query.targetId;
                const conversationId = [userId, targetId].sort().join('_');

                if (!dmsKV[conversationId]) dmsKV[conversationId] = [];
                return res.json({ messages: dmsKV[conversationId] });
            }

            // POST /api/social?type=friends&action=dm
            if (req.method === 'POST' && action === 'dm') {
                const { targetId, content } = req.body;
                if (!targetId || !content) return res.status(400).json({ error: 'Eksik bilgi' });

                const conversationId = [userId, targetId].sort().join('_');
                if (!dmsKV[conversationId]) dmsKV[conversationId] = [];

                dmsKV[conversationId].push({
                    senderId: userId,
                    senderName: req.user.email?.split('@')[0],
                    content,
                    timestamp: Date.now()
                });

                // Güvenlik sınırlandırması: Maksimum 200 mesaj tutulur
                if (dmsKV[conversationId].length > 200) {
                    dmsKV[conversationId] = dmsKV[conversationId].slice(-200);
                }

                await setKVData('direct_messages', dmsKV);
                return res.json({ success: true });
            }
        }

        res.status(400).json({ error: 'Bilinmeyen işlem / method' });
    } catch (error) {
        console.error("Social API Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- AI ARENA API (Supabase Integration) ---

// Get user XP and level from database
app.get('/api/arena/user-stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // If Supabase is not configured, return default stats
        if (!supabase) {
            return res.json({
                user_id: userId,
                total_xp: 0,
                level: 1,
                arena_wins: 0,
                arena_losses: 0,
                streak: 0,
                last_activity: new Date().toISOString()
            });
        }

        // Get user stats from Supabase
        const { data: userStats, error } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // Not found error
            console.error('Supabase error:', error);
            return res.status(500).json({ error: 'Veritabanı hatası' });
        }

        // If no stats exist, create default stats
        if (!userStats) {
            const defaultStats = {
                user_id: userId,
                total_xp: 0,
                level: 1,
                arena_wins: 0,
                arena_losses: 0,
                streak: 0,
                last_activity: new Date().toISOString()
            };

            const { data: newStats, error: insertError } = await supabase
                .from('user_stats')
                .insert(defaultStats)
                .select()
                .single();

            if (insertError) {
                console.error('Insert error:', insertError);
                return res.status(500).json({ error: 'İstatistikler oluşturulamadı' });
            }

            return res.json(newStats);
        }

        res.json(userStats);
    } catch (error) {
        console.error('Arena stats error:', error);
        res.status(500).json({ error: 'İstatistikler alınamadı' });
    }
});

// Update user XP and level
app.post('/api/arena/update-xp', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { xpGained, reason } = req.body;

        if (!xpGained || xpGained <= 0) {
            return res.status(400).json({ error: 'Geçersiz XP miktarı' });
        }

        // Get current stats
        const { data: currentStats, error: fetchError } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (fetchError) {
            console.error('Fetch error:', fetchError);
            return res.status(500).json({ error: 'Mevcut istatistikler alınamadı' });
        }

        // Calculate new level based on XP
        const newTotalXp = currentStats.total_xp + xpGained;
        const newLevel = Math.floor(newTotalXp / 100) + 1; // Her 100 XP'de 1 level

        // Update stats
        const { data: updatedStats, error: updateError } = await supabase
            .from('user_stats')
            .update({
                total_xp: newTotalXp,
                level: newLevel,
                last_activity: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (updateError) {
            console.error('Update error:', updateError);
            return res.status(500).json({ error: 'XP güncellenemedi' });
        }

        // Log XP history
        const { error: historyError } = await supabase
            .from('xp_history')
            .insert({
                user_id: userId,
                xp_amount: xpGained,
                reason: reason || 'XP Kazanımı',
                created_at: new Date().toISOString()
            });

        if (historyError) {
            console.error('History error:', historyError);
            // Continue even if history fails
        }

        res.json({
            success: true,
            updatedStats,
            xpGained,
            levelUp: newLevel > currentStats.level
        });
    } catch (error) {
        console.error('XP update error:', error);
        res.status(500).json({ error: 'XP güncellenirken hata oluştu' });
    }
});

// Get arena leaderboard based on user level
app.get('/api/arena/leaderboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // If Supabase is not configured, return empty leaderboard with current user
        if (!supabase) {
            return res.json([{
                rank: 1,
                userId: userId,
                name: 'Sen',
                xp: 0,
                level: 1,
                wins: 0,
                losses: 0,
                winRate: 0,
                me: true
            }]);
        }

        // Get user's current level for filtering
        const { data: currentUser, error: userError } = await supabase
            .from('user_stats')
            .select('level')
            .eq('user_id', userId)
            .single();

        if (userError || !currentUser) {
            return res.status(500).json({ error: 'Kullanıcı seviyesi alınamadı' });
        }

        // Get leaderboard with level-based filtering
        const levelRange = 5; // Show users within 5 levels
        const minLevel = Math.max(1, currentUser.level - levelRange);
        const maxLevel = currentUser.level + levelRange;

        const { data: leaderboard, error } = await supabase
            .from('user_stats')
            .select('user_id, total_xp, level, arena_wins, arena_losses')
            .gte('level', minLevel)
            .lte('level', maxLevel)
            .order('total_xp', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Leaderboard error:', error);
            return res.status(500).json({ error: 'Liderlik tablosu alınamadı' });
        }

        // Get user emails for display
        const userIds = leaderboard.map(entry => entry.user_id);
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email')
            .in('id', userIds);

        if (usersError) {
            console.error('Users error:', usersError);
            // Continue without user names
        }

        // Combine data
        const leaderboardWithNames = leaderboard.map((entry, index) => {
            const user = users?.find(u => u.id === entry.user_id);
            const isCurrentUser = entry.user_id === userId;

            return {
                rank: index + 1,
                userId: entry.user_id,
                name: isCurrentUser ? 'Sen' : (user?.email?.split('@')[0] || 'Bilinmeyen'),
                xp: entry.total_xp,
                level: entry.level,
                wins: entry.arena_wins || 0,
                losses: entry.arena_losses || 0,
                winRate: entry.arena_wins > 0 ?
                    Math.round((entry.arena_wins / (entry.arena_wins + entry.arena_losses)) * 100) : 0,
                me: isCurrentUser
            };
        });

        res.json(leaderboardWithNames);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Liderlik tablosu yüklenemedi' });
    }
});

// Get arena challenges based on user level
app.get('/api/arena/challenges', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user level from local storage or default to 1
        let userLevel = 1;
        if (supabase) {
            const { data: userStats, error: userError } = await supabase
                .from('user_stats')
                .select('level')
                .eq('user_id', userId)
                .single();

            if (!userError && userStats) {
                userLevel = userStats.level;
            }
        }

        // Generate challenges based on level
        const baseChallenges = [
            {
                id: 1,
                title: "AI Sohbet Ustası",
                description: "AI ile 10 mesajlaş",
                xp_reward: 50,
                difficulty: "Kolay",
                icon: "fa-comments",
                requirement: 10,
                category: "chat"
            },
            {
                id: 2,
                title: "Duygu Dedektifi",
                description: "5 gün üst üste duygu kaydet",
                xp_reward: 100,
                difficulty: "Orta",
                icon: "fa-heart",
                requirement: 5,
                category: "mood"
            },
            {
                id: 3,
                title: "Alışkanlık Kahramanı",
                description: "7 gün üst üste alışkanlık tamamla",
                xp_reward: 150,
                difficulty: "Zor",
                icon: "fa-fire",
                requirement: 7,
                category: "habits"
            },
            {
                id: 4,
                title: "Hedef Avcısı",
                description: "3 hedef tamamla",
                xp_reward: 200,
                difficulty: "Orta",
                icon: "fa-bullseye",
                requirement: 3,
                category: "goals"
            }
        ];

        // Scale challenges based on user level
        const levelMultiplier = Math.max(1, Math.floor(userLevel / 5));
        const scaledChallenges = baseChallenges.map(challenge => ({
            ...challenge,
            requirement: challenge.requirement * (levelMultiplier > 1 ? levelMultiplier : 1),
            xp_reward: challenge.xp_reward * (1 + (userLevel * 0.1))
        }));

        res.json({
            user_level: userLevel,
            challenges: scaledChallenges,
            level_multiplier: levelMultiplier
        });
    } catch (error) {
        console.error('Challenges error:', error);
        res.status(500).json({ error: 'Meydan okumalar yüklenemedi' });
    }
});

// --- USER STATS API (Flame/XP System) ---
// --- USER STATUS API ---
app.get('/api/user/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const status = await getKVData(`user_status:${userId}`) || { text: 'Çevrimiçi', emoji: '🟢' };
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: 'Durum alınamadı' });
    }
});

app.post('/api/user/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { text, emoji } = req.body;
        const status = { text, emoji, updatedAt: new Date().toISOString() };
        await setKVData(`user_status:${userId}`, status);
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ error: 'Durum güncellenemedi' });
    }
});

app.get('/api/user-stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Try to get from local storage first
        const stats = await getKVData(`user_stats:${userId}`) || {
            user_id: userId,
            total_xp: 0,
            level: 1,
            flameLevel: 0,
            history: [],
            last_activity: new Date().toISOString()
        };

        res.json(stats);
    } catch (error) {
        console.error('User stats error:', error);
        res.status(500).json({ error: 'İstatistikler alınamadı' });
    }
});

app.post('/api/user-stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { rewardType, action, consumeType } = req.body;

        // Get current stats
        const defaultStats = {
            user_id: userId,
            total_xp: 0,
            level: 1,
            flameLevel: 0,
            history: []
        };
        const existingStats = await getKVData(`user_stats:${userId}`);
        let stats = { ...defaultStats, ...(existingStats || {}) };

        if (action === 'consume' && consumeType) {
            // Handle flame consumption
            if (stats.flameLevel > 0) {
                stats.flameLevel--;
            }
        } else if (rewardType) {
            // Handle reward
            const xpGained = rewardType === 'daily_login' ? 10 :
                rewardType === 'goal_complete' ? 50 :
                    rewardType === 'habit_streak' ? 30 :
                        rewardType === 'social_share' ? 100 :
                            rewardType === 'assistant_message' ? 10 : 10;

            const flameGained = rewardType === 'social_share' ? 100 : 1;

            stats.total_xp += xpGained;
            stats.level = Math.floor(stats.total_xp / 100) + 1;
            stats.flameLevel += flameGained;
            stats.history.push({
                type: rewardType,
                xp: xpGained,
                flame: flameGained,
                date: new Date().toISOString()
            });
        }

        stats.last_activity = new Date().toISOString();
        await setKVData(`user_stats:${userId}`, stats);

        res.json(stats);
    } catch (error) {
        console.error('User stats update error:', error);
        res.status(500).json({ error: 'İstatistikler güncellenemedi' });
    }
});

// --- EQ DASHBOARD API (Emotional Intelligence Analysis) ---
app.get('/api/eq-dashboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;

        // Get all user data for analysis
        const allReflections = await getKVData('reflections') || {};
        const userReflections = allReflections[userId] || [];

        const allFocus = await getKVData('focus') || {};
        const userFocus = allFocus[userId] || [];

        const allHabits = await getKVData('habits') || {};
        const userHabits = allHabits[userId] || [];

        // Calculate mood trends from reflections
        const moodScores = { 'terrible': 20, 'bad': 40, 'neutral': 60, 'good': 80, 'excellent': 100 };
        const moodHistory = userReflections.map(r => ({
            date: r.date,
            score: moodScores[r.mood] || 60,
            mood: r.mood,
            content: r.content
        })).sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate stress indicators
        const stressIndicators = {
            negativeWords: ['stressed', 'anxious', 'worried', 'overwhelmed', 'tired', 'exhausted', 'frustrated', 'upset', 'angry', 'sad'],
            positiveWords: ['happy', 'excited', 'grateful', 'peaceful', 'calm', 'energized', 'motivated', 'confident', 'joyful', 'content']
        };

        let stressScore = 50; // base
        let positivityScore = 50; // base

        userReflections.forEach(r => {
            const content = (r.content || '').toLowerCase();
            stressIndicators.negativeWords.forEach(word => {
                if (content.includes(word)) stressScore += 5;
            });
            stressIndicators.positiveWords.forEach(word => {
                if (content.includes(word)) positivityScore += 5;
            });
        });

        stressScore = Math.min(100, stressScore);
        positivityScore = Math.min(100, positivityScore);

        // Calculate productivity metrics
        const totalFocusMinutes = userFocus.reduce((sum, s) => sum + (s.duration || 0), 0);
        const completedSessions = userFocus.filter(s => s.status === 'completed').length;
        const habitCompletionRate = userHabits.length > 0
            ? Math.round((userHabits.reduce((acc, h) => acc + (h.completions?.length || 0), 0) / (userHabits.length * 30)) * 100)
            : 0;

        // Weekly and monthly summaries
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const weeklyData = moodHistory.filter(m => new Date(m.date) >= oneWeekAgo);
        const monthlyData = moodHistory.filter(m => new Date(m.date) >= oneMonthAgo);

        const weeklyAvg = weeklyData.length > 0
            ? Math.round(weeklyData.reduce((sum, m) => sum + m.score, 0) / weeklyData.length)
            : 60;
        const monthlyAvg = monthlyData.length > 0
            ? Math.round(monthlyData.reduce((sum, m) => sum + m.score, 0) / monthlyData.length)
            : 60;

        // EQ Score calculation (0-100)
        const eqScore = Math.round(
            (weeklyAvg * 0.3) +
            ((100 - stressScore) * 0.25) +
            (positivityScore * 0.25) +
            (Math.min(100, habitCompletionRate * 2) * 0.2)
        );

        // Generate insights
        const insights = [];
        if (stressScore > 70) {
            insights.push({ type: 'warning', message: 'Stres seviyeniz yüksek görünüyor. Rahatlama egzersizleri yapmayı deneyin.' });
        }
        if (weeklyAvg < monthlyAvg - 10) {
            insights.push({ type: 'info', message: 'Bu hafta ruh haliniz geçen aya göre daha düşük. Bir şeyler mi rahatsız ediyor?' });
        }
        if (habitCompletionRate > 80) {
            insights.push({ type: 'success', message: 'Harika! Alışkanlıklarınıza sadık kalıyorsunuz.' });
        }
        if (totalFocusMinutes > 300) {
            insights.push({ type: 'success', message: 'Odaklanma seanslarınız verimli görünüyor!' });
        }

        res.json({
            eqScore,
            moodHistory: moodHistory.slice(-30), // Last 30 days
            stressScore,
            positivityScore,
            weeklyAvg,
            monthlyAvg,
            totalFocusMinutes,
            completedSessions,
            habitCompletionRate,
            insights,
            totalReflections: userReflections.length,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('EQ Dashboard error:', error);
        res.status(500).json({ error: 'EQ analizi oluşturulurken hata oluştu' });
    }
});

// --- EQ DASHBOARD EXPORT (Generate PDF/Word Report) ---
app.post('/api/eq-dashboard/export', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { format = 'word' } = req.body;

        // Get EQ data
        const allReflections = await getKVData('reflections') || {};
        const userReflections = allReflections[userId] || [];
        const allFocus = await getKVData('focus') || {};
        const userFocus = allFocus[userId] || [];
        const allHabits = await getKVData('habits') || {};
        const userHabits = allHabits[userId] || [];

        // Calculate metrics (same as GET endpoint)
        const moodScores = { 'terrible': 20, 'bad': 40, 'neutral': 60, 'good': 80, 'excellent': 100 };
        const moodHistory = userReflections.map(r => ({
            date: r.date,
            score: moodScores[r.mood] || 60
        })).sort((a, b) => new Date(a.date) - new Date(b.date));

        let stressScore = 50;
        let positivityScore = 50;
        const stressIndicators = {
            negativeWords: ['stressed', 'anxious', 'worried', 'overwhelmed', 'tired', 'exhausted'],
            positiveWords: ['happy', 'excited', 'grateful', 'peaceful', 'calm', 'energized']
        };

        userReflections.forEach(r => {
            const content = (r.content || '').toLowerCase();
            stressIndicators.negativeWords.forEach(word => {
                if (content.includes(word)) stressScore += 5;
            });
            stressIndicators.positiveWords.forEach(word => {
                if (content.includes(word)) positivityScore += 5;
            });
        });

        const totalFocusMinutes = userFocus.reduce((sum, s) => sum + (s.duration || 0), 0);
        const habitCompletionRate = userHabits.length > 0
            ? Math.round((userHabits.reduce((acc, h) => acc + (h.completions?.length || 0), 0) / (userHabits.length * 30)) * 100)
            : 0;

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weeklyData = moodHistory.filter(m => new Date(m.date) >= oneWeekAgo);
        const weeklyAvg = weeklyData.length > 0
            ? Math.round(weeklyData.reduce((sum, m) => sum + m.score, 0) / weeklyData.length)
            : 60;

        const eqScore = Math.round(
            (weeklyAvg * 0.3) +
            ((100 - Math.min(100, stressScore)) * 0.25) +
            (Math.min(100, positivityScore) * 0.25) +
            (Math.min(100, habitCompletionRate * 2) * 0.2)
        );

        // Prepare content for export
        const reportContent = [
            { type: "heading", text: "Duygusal Zeka (EQ) Analiz Raporu", level: 0 },
            { type: "paragraph", text: `Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}` },
            { type: "paragraph", text: `` },
            { type: "heading", text: "Genel EQ Puanı", level: 1 },
            { type: "paragraph", text: `Sizin EQ Puanınız: ${eqScore}/100` },
            {
                type: "paragraph", text: eqScore >= 80 ? 'Mükemmel! Duygusal zekanız çok yüksek seviyede.' :
                    eqScore >= 60 ? 'İyi gidiyorsunuz. Duygusal farkındalığınız gelişmekte.' :
                        'Gelişim alanları mevcut. Kendinizi tanımaya devam edin.'
            },
            { type: "heading", text: "Haftalık Ruh Hali Özeti", level: 1 },
            { type: "paragraph", text: `Haftalık Ortalama: ${weeklyAvg}/100` },
            { type: "heading", text: "Stres ve Pozitivite Analizi", level: 1 },
            { type: "paragraph", text: `Stres Seviyesi: ${Math.min(100, stressScore)}/100` },
            { type: "paragraph", text: `Pozitivite Seviyesi: ${Math.min(100, positivityScore)}/100` },
            { type: "heading", text: "Üretkenlik Metrikleri", level: 1 },
            { type: "paragraph", text: `Toplam Odaklanma Süresi: ${totalFocusMinutes} dakika` },
            { type: "paragraph", text: `Alışkanlık Tamamlama Oranı: %${habitCompletionRate}` },
            { type: "heading", text: "Tavsiyeler", level: 1 }
        ];

        if (stressScore > 70) {
            reportContent.push({ type: "paragraph", text: "• Stres seviyeniz yüksek. Günlük meditasyon ve nefes egzersizleri yapmayı deneyin." });
        }
        if (habitCompletionRate < 50) {
            reportContent.push({ type: "paragraph", text: "• Alışkanlıklarınızı güçlendirmek için küçük adımlarla başlayın." });
        }
        if (totalFocusMinutes < 100) {
            reportContent.push({ type: "paragraph", text: "• Odaklanma seanslarınızı artırmayı hedefleyin. Pomodoro tekniği deneyebilirsiniz." });
        }
        reportContent.push({ type: "paragraph", text: "• Düzenli günlük tutmaya devam edin. Bu farkındalığınızı artırır." });

        // Call Python generator for Word export with EQ chart
        const pyPath = path.join(process.cwd(), 'venv/bin/python3');
        const scriptPath = path.join(process.cwd(), 'api/py_generator.py');

        const pythonProcess = spawn(pyPath, [scriptPath]);
        pythonProcess.stdin.write(JSON.stringify({
            mode: 'export',
            type: 'word',
            filename: `EQ_Rapor_${getTodayDate()}.docx`,
            content: reportContent,
            eq_data: moodHistory.slice(-14) // Last 14 days for chart
        }));
        pythonProcess.stdin.end();

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error("Python error:", errorOutput);
                return res.status(500).json({ error: 'Report generation failed', details: errorOutput });
            }

            try {
                const result = JSON.parse(output);
                if (result.error) return res.status(500).json({ error: result.error });

                const filePath = result.path;
                if (!fs.existsSync(filePath)) {
                    return res.status(404).json({ error: 'Generated file not found' });
                }

                res.download(filePath, `EQ_Rapor_${getTodayDate()}.docx`, (err) => {
                    if (err) console.error("Download error:", err);
                    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
                });
            } catch (pErr) {
                console.error("Parse Error:", pErr, output);
                res.status(500).json({ error: 'Output parsing error' });
            }
        });
    } catch (error) {
        console.error('EQ Export error:', error);
        res.status(500).json({ error: 'Rapor oluşturulurken hata oluştu' });
    }
});

// === DOSYA OLUŞTURMA VE ANALİZ ENDPOINTLERİ ===

// Dosya oluşturma (Excel, Word, PowerPoint)
app.post('/api/generate-file', optionalAuth, async (req, res) => {
    try {
        const { type, data, filename } = req.body;

        if (!type || !filename) {
            return res.status(400).json({ error: 'Dosya tipi ve isim gerekli' });
        }

        const pyPath = path.join(process.cwd(), 'venv/bin/python3');
        const scriptPath = path.join(process.cwd(), 'api/py_generator.py');

        const pythonProcess = spawn(pyPath, [scriptPath]);

        const payload = {
            mode: 'export',
            type: type,
            filename: filename,
            ...data
        };

        pythonProcess.stdin.write(JSON.stringify(payload));
        pythonProcess.stdin.end();

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error("Python error:", errorOutput);
                return res.status(500).json({ error: 'Dosya oluşturma hatası', details: errorOutput });
            }

            try {
                const result = JSON.parse(output);
                if (result.error) return res.status(500).json({ error: result.error });

                res.json({ success: true, path: result.path, filename: filename });
            } catch (pErr) {
                console.error("Parse Error:", pErr, output);
                res.status(500).json({ error: 'Output parsing error' });
            }
        });
    } catch (error) {
        console.error('Generate file error:', error);
        res.status(500).json({ error: 'Dosya oluşturulurken hata oluştu' });
    }
});

// Dosya analizi (Word, Excel, PowerPoint okuma)
app.post('/api/py_generator', optionalAuth, async (req, res) => {
    try {
        // Multipart form data için multer kullanılmalı, ancak şimdilik basit analiz
        const { action } = req.body;

        if (action === 'analyze') {
            // Dosya analizi mantığı buraya eklenecek
            // Şimdilik basit bir yanıt döndürüyoruz
            res.json({ success: true, message: 'Dosya analiz edildi' });
        } else {
            res.status(400).json({ error: 'Geçersiz action' });
        }
    } catch (error) {
        console.error('File analysis error:', error);
        res.status(500).json({ error: 'Dosya analizinde hata oluştu' });
    }
});

// === NOTIFICATIONS API ===
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const allHabits = await getKVData('habits') || {};
        const userHabits = allHabits[userId] || [];

        const pendingNotifications = [];
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        for (const habit of userHabits) {
            if (!habit.reminder || !habit.reminder.enabled) continue;

            const [hours, minutes] = habit.reminder.time.split(':').map(Number);
            const reminderTime = new Date(now);
            reminderTime.setHours(hours, minutes, 0, 0);

            // Should send today? (Simplified)
            let shouldSend = true;
            if (habit.lastNotificationAt) {
                const lastDate = new Date(habit.lastNotificationAt).toISOString().split('T')[0];
                if (lastDate === todayStr) shouldSend = false;
            }

            if (shouldSend && now >= reminderTime) {
                pendingNotifications.push({
                    habitId: habit.id,
                    habitName: habit.name,
                    title: `⏰ ${habit.name}`,
                    message: `Alışkanlığını tamamlama vakti! 🚀`
                });
                habit.lastNotificationAt = now.toISOString();
            }
        }

        if (pendingNotifications.length > 0) {
            allHabits[userId] = userHabits;
            await setKVData('habits', allHabits);
        }

        res.json({ notifications: pendingNotifications });
    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({ error: 'Bildirimler alınamadı' });
    }
});

app.post('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { subscription } = req.body;

        if (subscription) {
            const allSubs = await getKVData('push_subscriptions') || {};
            allSubs[userId] = subscription;
            await setKVData('push_subscriptions', allSubs);
            return res.json({ success: true });
        }

        res.status(400).json({ error: 'Subscription gerekli' });
    } catch (error) {
        res.status(500).json({ error: 'İşlem başarısız' });
    }
});

// === CHALLENGES API ===
app.get('/api/challenges', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type } = req.query;

        if (type === 'analytics') {
            const allAnalytics = await getKVData('user_analytics') || {};
            const userAnalytics = allAnalytics[userId] || { totalEvents: 0, events: [] };
            return res.json(userAnalytics);
        }

        const allChallenges = await getKVData('challenges') || {};
        const userChallenges = allChallenges[userId] || [];
        res.json({ challenges: userChallenges });
    } catch (error) {
        res.status(500).json({ error: 'Challengelar alınamadı' });
    }
});

// === ADVANCED API (Leaderboard etc) ===
app.get('/api/advanced', authenticateToken, async (req, res) => {
    try {
        const { type } = req.query;

        if (type === 'leaderboard') {
            const allStats = await getKVData('user-stats') || {};
            const leaderboard = Object.entries(allStats)
                .map(([userId, stats]) => ({
                    userId,
                    name: stats.name || 'Gizli Kullanıcı',
                    xp: stats.xp || 0,
                    streak: stats.flameLevel || 0
                }))
                .sort((a, b) => b.xp - a.xp)
                .slice(0, 10);

            return res.json(leaderboard);
        }

        res.status(400).json({ error: 'Geçersiz tip' });
    } catch (error) {
        res.status(500).json({ error: 'Veri alınamadı' });
    }
});

// === SOSYAL API UPDATE (PARTNERS) ===
// Note: Inserting this into the app.all('/api/social') logic would be better but let's add a separate handler for simplicity if it falls through, 
// or I should actually update the existing social handler.
// I'll update the existing social handler instead.

// === DOSYA İNDİRME ===
app.get('/api/download', optionalAuth, async (req, res) => {
    try {
        const filePath = req.query.path;

        if (!filePath) {
            return res.status(400).json({ error: 'Dosya yolu gerekli' });
        }

        // Güvenlik kontrolü - sadece /tmp dizinine izin ver
        if (!filePath.startsWith('/tmp/')) {
            return res.status(403).json({ error: 'Geçersiz dosya yolu' });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Dosya bulunamadı' });
        }

        res.download(filePath, (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            // Dosyayı temizle
            try { fs.unlinkSync(filePath); } catch (e) { }
        });
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'İndirme hatası' });
    }
});

// === MEDIA GENERATION ENDPOINTS (Imagen 4.0, Veo 3.1, Gemini Audio) ===

// Unified media generation endpoint
app.post('/api/generate-media', authenticateToken, async (req, res) => {
    try {
        if (!genAI) {
            return res.status(500).json({ error: 'AI not configured' });
        }

        const { prompt, type = 'image', aspectRatio = "1:1" } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt gerekli' });
        }

        console.log(`[Media] Generating ${type} for prompt: ${prompt}`);

        // IMAGE GENERATION - Imagen 4.0
        if (type === 'image') {
            try {
                const imageModel = genAI.getGenerativeModel({ model: "imagen-4.0-fast-generate-001" });

                const result = await imageModel.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseModalities: ['IMAGE'],
                    },
                });

                const response = result.response;
                const imagePart = response.candidates[0].content.parts.find(part => part.inlineData);

                if (imagePart && imagePart.inlineData) {
                    return res.json({
                        success: true,
                        type: 'image',
                        imageData: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
                        model: "imagen-4.0-fast-generate-001"
                    });
                } else {
                    throw new Error('No image data received');
                }
            } catch (imagenError) {
                console.warn('[Media] Imagen 4.0 failed, falling back to Pollinations:', imagenError.message);
                // Fallback to Pollinations
                const seed = Math.floor(Math.random() * 1000000);
                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ", visually stunning, 8k, masterpiece, highly detailed")}?width=1024&height=1024&nologo=true&enhance=true&seed=${seed}`;

                const imageRes = await fetch(imageUrl);
                if (!imageRes.ok) throw new Error("Pollinations error");
                const buffer = await imageRes.arrayBuffer();
                const base64Image = Buffer.from(buffer).toString('base64');

                return res.json({
                    success: true,
                    type: 'image',
                    imageData: `data:image/jpeg;base64,${base64Image}`,
                    model: "Pollinations AI (Fallback)",
                    fallback: true
                });
            }
        }

        // VIDEO GENERATION - Veo 3.1
        if (type === 'video') {
            try {
                const videoModel = genAI.getGenerativeModel({ model: "veo-3.1-fast-generate-preview" });

                const result = await videoModel.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseModalities: ['VIDEO'],
                    },
                });

                const response = result.response;
                const videoPart = response.candidates[0].content.parts.find(part => part.inlineData);

                if (videoPart && videoPart.inlineData) {
                    return res.json({
                        success: true,
                        type: 'video',
                        videoData: `data:${videoPart.inlineData.mimeType};base64,${videoPart.inlineData.data}`,
                        model: "veo-3.1-fast-generate-preview"
                    });
                } else {
                    throw new Error('No video data received');
                }
            } catch (veoError) {
                console.error('[Media] Veo 3.1 error:', veoError);
                return res.status(500).json({
                    error: 'Video oluşturma hatası',
                    details: veoError.message,
                    type: 'video'
                });
            }
        }

        return res.status(400).json({ error: 'Geçersiz medya tipi. image veya video olmalı.' });

    } catch (error) {
        console.error('[Media] Generation error:', error);
        res.status(500).json({ error: 'Medya oluşturma hatası', details: error.message });
    }
});

// AUDIO GENERATION - Gemini 2.5 Flash Native Audio
app.post('/api/generate-audio', authenticateToken, async (req, res) => {
    try {
        const { text, voice = 'default' } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Metin gerekli' });
        }

        console.log(`[Audio] Ses oluşturma isteği: ${text.substring(0, 50)}...`);

        // OpenRouter ses desteği şu an için devre dışı - Gemini native audio generation'ı OpenRouter'da mevcut değil
        return res.status(501).json({
            error: 'Ses oluşturma şu an desteklenmiyor',
            details: 'OpenRouter entegrasyonu ile ses oluşturma özelliği geçici olarak devre dışıdır.'
        });

    } catch (error) {
        console.error('[Audio] Generation error:', error);
        res.status(500).json({ error: 'Ses oluşturma hatası', details: error.message });
    }
});

// === DEEP SEARCH ENDPOINT ===
app.post('/api/deep-search', optionalAuth, async (req, res) => {
    try {
        const { query, max_results = 5 } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Arama sorgusu gerekli' });
        }

        const pyPath = path.join(process.cwd(), 'venv/bin/python3');
        const scriptPath = path.join(process.cwd(), 'api/py_generator.py');

        const pythonProcess = spawn(pyPath, [scriptPath]);

        const payload = {
            mode: 'search',
            query: query,
            max_results: max_results
        };

        pythonProcess.stdin.write(JSON.stringify(payload));
        pythonProcess.stdin.end();

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error("Python error:", errorOutput);
                return res.status(500).json({ error: 'Arama hatası', details: errorOutput });
            }

            try {
                const result = JSON.parse(output);
                if (result.error) return res.status(500).json({ error: result.error });

                res.json({ success: true, results: result.results || [] });
            } catch (pErr) {
                console.error("Parse Error:", pErr, output);
                res.status(500).json({ error: 'Output parsing error' });
            }
        });
    } catch (error) {
        console.error('Deep search error:', error);
        res.status(500).json({ error: 'Arama sırasında hata oluştu' });
    }
});

// === AVATAR GENERATOR ===
app.post('/api/avatar/generate', authenticateToken, async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ error: 'Resim verisi eksik.' });
        }

        const pyPath = path.join(process.cwd(), 'venv/bin/python3');
        const scriptPath = path.join(process.cwd(), 'api/avatar.py');

        const pythonProcess = spawn(pyPath, [scriptPath], {
            env: { ...process.env } // Pass environment variables including GEMINI_API_KEY
        });

        let outputData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error("Python Error (Avatar):", errorData);
                return res.status(500).json({ error: 'Python script error', details: errorData });
            }

            try {
                // Find JSON output (python script prints json dumped obj)
                const result = JSON.parse(outputData.trim());
                if (result.error) {
                    return res.status(500).json({ error: result.error });
                }

                res.json(result);
            } catch (err) {
                console.error("Parse error:", err, "Raw Output:", outputData);
                res.status(500).json({ error: 'Output parse error' });
            }
        });

        // Write the payload to python script stdin
        pythonProcess.stdin.write(JSON.stringify({ imageBase64 }));
        pythonProcess.stdin.end();

    } catch (error) {
        console.error('Avatar Generation Error:', error);
        res.status(500).json({ error: 'Avatar oluşturulurken bir hata meydana geldi.' });
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

// Local development server (if not on Vercel)
const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
if (!isProduction) {
    const PORT = process.env.PORT || 3004;
    httpServer.listen(PORT, () => {
        console.log(`\n✅ API Sunucusu http://localhost:${PORT} adresinde çalışıyor`);
        console.log(`📁 Yerel Depolama: ./data/\n`);
    });
}