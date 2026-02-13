import { NextResponse } from 'next/server';

export const runtime = 'edge';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODELS = [
    "arcee-ai/trinity-large-preview:free",
    "deepseek/deepseek-r1-0528:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "google/gemma-3-27b-it:free",
    "openrouter/free"
];

// --- KV YARDIMCI FONKSİYONLARI ---

async function getKVData(key) {
    // Cloudflare KV'den veri okuma
    const data = await process.env.LIFE_COACH_KV.get(key);
    return data ? JSON.parse(data) : (key === 'users' ? [] : {});
}

async function setKVData(key, data) {
    // Cloudflare KV'ye veri yazma
    await process.env.LIFE_COACH_KV.put(key, JSON.stringify(data));
}

// --- LİMİT SİSTEMİ (KV Tabanlı) ---

async function checkRateLimit(req, ip, fingerprint) {
    const ua = req.headers.get('user-agent') || 'unknown';
    
    // Web Crypto API (Edge uyumlu)
    const msgBuffer = new TextEncoder().encode(`${ip}-${ua}-${fingerprint}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const identity = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

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
    
    // KV'ye asenkron yaz (await etmeyerek hızı artırabiliriz ama tutarlılık için await önerilir)
    await setKVData('user_limits', limits);

    return { allowed: true };
}

// --- OPENROUTER ÇAĞRISI ---

async function callOpenRouter(messages) {
    for (const model of OPENROUTER_MODELS) {
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://lifecoach-ai.pages.dev",
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

// --- API HANDLER ---

export default async function handler(req) {
    if (req.method !== 'POST') {
        return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    try {
        const body = await req.json();
        const { message, history, email, sessionId, fingerprintID } = body;
        
        // IP Adresini al (Cloudflare header)
        const ip = req.headers.get('cf-connecting-ip') || '127.0.0.1';

        // 1. Limit Kontrolü
        const limitStatus = await checkRateLimit(req, ip, fingerprintID);
        if (!limitStatus.allowed) {
            return NextResponse.json(
                { error: limitStatus.error, retryAfter: limitStatus.retryAfter }, 
                { status: 429 }
            );
        }

        // 2. Sistem Promptu (Kısaltılmış örnek)
        const systemPrompt = `SYSTEM NAME: LifeCoach AI... (Buraya server.js'deki uzun prompt gelecek)`;
        
        // 3. AI Cevabı
        const aiResponse = await callOpenRouter([
            { "role": "system", "content": systemPrompt },
            ...(history || []),
            { "role": "user", "content": message }
        ]);

        // 4. Veritabanı Güncelleme (Kullanıcı varsa)
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
                    users[userIndex].sessions.unshift(session);
                }

                session.messages.push({ role: 'user', content: message });
                session.messages.push({ role: 'assistant', content: aiResponse });
                
                await setKVData('users', users);
            }
        }

        return NextResponse.json({ response: aiResponse, sessionId: newSessionId });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}