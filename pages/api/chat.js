import { getKVData, setKVData } from '../../lib/db';
import { createClient } from '@supabase/supabase-js';
import { callGeminiWithFallback, callGeminiChatWithFallback } from '@/lib/gemini-multi-api';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

console.log('[Chat] Multi-API Key sistemi aktif');

// --- LİMİT SİSTEMİ (KV Tabanlı) ---

async function checkRateLimit(req, ip, fingerprint, userId) {
    // Abonelik Durumu
    let plan = 'free';
    if (userId) {
        const { data: sub } = await supabase.from('subscriptions').select('plan_tier, status').eq('user_id', userId).single();
        if (sub && sub.status === 'active') plan = sub.plan_tier;
    }

    // Premium ise limit kontrolünü gevşet veya kaldır
    if (plan === 'ultimate') return { allowed: true, plan: 'ultimate' };
    
    const ua = req.headers['user-agent'] || 'unknown';
    
    // Node.js Crypto (Vercel/Local uyumlu)
    const crypto = require('crypto');
    const identity = crypto.createHash('sha256').update(`${ip}-${ua}-${fingerprint}`).digest('hex');
    
    // Dosya tabanlı okuma
    const limits = await getKVData('user_limits');
    const now = Date.now();

    if (!limits[identity]) {
        limits[identity] = { messageCount: 0, lastReset: now, isBlocked: false, lastActivity: now };
    }

    // Not: server.js'deki periyodik temizlik (setInterval) serverless ortamda çalışmaz.
    // Bu işlev için Cloudflare Cron Triggers kullanılmalıdır.

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

    // Limit Kontrolü
    let MAX_MESSAGES = 10;
    let RESET_TIME = 2 * 60 * 60 * 1000; // 2 saat

    if (plan === 'pro') {
        MAX_MESSAGES = 500; // Pro için yüksek limit
        RESET_TIME = 24 * 60 * 60 * 1000; // 24 saat
    }

    if (user.messageCount >= MAX_MESSAGES) {
        const timePassed = now - user.lastReset;
        const timeLeft = RESET_TIME - timePassed;
        const minutesLeft = Math.ceil(timeLeft / 60000);
        const hoursLeft = Math.ceil(timeLeft / 3600000);
        
        let errorMsg = `Ücretsiz işlem limitine ulaştın. ${minutesLeft} dakika sonra gel veya Pro'ya geç!`;
        if (plan === 'pro') errorMsg = `Pro günlük limitine ulaştın. ${hoursLeft} saat sonra sıfırlanacak.`;

        return { allowed: false, error: errorMsg, retryAfter: minutesLeft };
    }

    user.messageCount++;
    
    // Dosyaya kaydet
    await setKVData('user_limits', limits);

    return { allowed: true, plan };
}

// --- AI ÇAĞRISI (Multi-API Key sistemi ile) ---
async function callAI(messages, systemPrompt) {
    try {
        console.log(`[AI-Chat] Gemini çağrısı yapılıyor...`);
        
        // Mesajları Gemini formatına çevir
        const chatHistory = messages
            .filter(m => m.role !== 'system')
            .map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                content: msg.content
            }));

        const userMessage = messages.filter(m => m.role === 'user').pop();
        
        // Son mesajı ayır
        const lastMessage = chatHistory.pop();
        
        const response = await callGeminiChatWithFallback(
            [...chatHistory, lastMessage],
            systemPrompt,
            {
                model: "gemini-2.0-flash",
                maxOutputTokens: 4000
            }
        );
        
        console.log(`[AI-Chat] Başarılı`);
        return response;
    } catch (error) {
        console.error(`[AI-Chat] Hata:`, error.message);
        throw error;
    }
}

// --- HELPER: ÖZETLEME ---
async function summarizeConversation(messages) {
    if (!messages || messages.length === 0) return "";
    const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    try {
        const summary = await callAI([
            { "role": "system", "content": "Summarize the following conversation very briefly (1-2 sentences). Only provide the summary, nothing else." },
            { "role": "user", "content": `Conversation to summarize:\n\n${conversationText}` }
        ], "You are a helpful assistant that summarizes conversations.");
        return (summary || "").trim();
    } catch (e) {
        console.error("Summarization error:", e);
        return "";
    }
}

// --- API HANDLER ---

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = req.body;
        const { message, history, email, sessionId, fingerprintID, model } = body;
        
        // IP Adresini al (Vercel/Standard header)
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

        // Kullanıcı ID'sini bul (Auth sistemi varsayılarak)
        let userId = null;
        if (email) {
            // Basitlik için email üzerinden userId bulma (Projede nasıl tutuluyorsa)
            // Gerçek projede auth middleware kullanılmalı
        }

        // 1. Limit Kontrolü
        const limitStatus = await checkRateLimit(req, ip, fingerprintID, userId);
        if (!limitStatus.allowed) {
            return res.status(429).json({ error: limitStatus.error, retryAfter: limitStatus.retryAfter });
        }
        
        const userPlan = limitStatus.plan || 'free';

        // 2. Hafıza Motoru (Memory Engine)
        let memoryContext = "";
        if (email) {
            const users = await getKVData('users');
            const user = users.find(u => u.email === email);
            
            if (user && user.sessions && user.sessions.length > 0) {
                const otherSessions = user.sessions.filter(s => s.id != sessionId).slice(0, 3);
                if (otherSessions.length > 0) {
                    const summaries = await Promise.all(otherSessions.map(s => summarizeConversation(s.messages)));
                    const validSummaries = summaries.filter(s => s);
                    if (validSummaries.length > 0) {
                        memoryContext = "PAST CONVERSATION SUMMARIES:\n" + validSummaries.map(s => `- ${s}`).join('\n') + "\n\n";
                    }
                }
            }
        }

        // 3. Sistem Promptu - HAN 4.2 Ultra Core
        const systemPrompt = `You are HAN 4.2 Ultra Core, the central intelligence of LifeCoach AI.

You are an advanced multi-domain artificial intelligence designed to assist users with life planning, productivity, scientific thinking, research, programming, and intelligent decision-making.

VİZYON VE KİMLİK:
* Sen HAN AI Tech'in "İnsan Odaklı Makine Gücü" (Human Argument Network) vizyonunun temsilcisisin.
* Görevin; insanın bilişsel yeteneklerini yapay zeka ile genişletmek ve onları en üst sürümlerine taşımaktır.
* Karakterin; stratejik bir akıl hocası, kıdemli bir mühendis ve analitik bir profesörün birleşimidir. Confident, intelligent, supportive ve motive edicisin.

DİL VE YERELLEŞTİRME KURALLARI (KRİTİK):
1. Otomatik Dil Algılama: Kullanıcı hangi dilde yazarsa (Türkçe, İngilizce, Almanca, Japonca vb.), sen de o dilde karşılık ver. Dil geçişlerini akıcı ve doğal bir şekilde yap.
2. Kusursuz Yerelleştirme: Yanıt verdiğin dilde asla "makine çevirisi" yapma. O dilin doğal konuşma kalıplarını, deyimlerini ve teknik terminolojisini kullan. (Örn; İngilizce konuşurken "Silicon Valley", Türkçe konuşurken "Silikon Vadisi" terimlerini bağlamına göre kullan).
3. Hatalı Çeviri Filtresi (Teknik Terim Koruma): Teknik terimleri çevirirken saçma karşılıklar türetme. Eğer bir terimin hedef dilde tam karşılığı yoksa veya teknik olarak orijinali (İngilizcesi vb.) kullanılıyorsa, terimi olduğu gibi bırak. (Örn: "GDP", "Latency", "Integrated Circuits", "Big Data" gibi terimleri bozma).
4. Evrensel Karakter: Dil ne olursa olsun, HAN AI'nın otoriter ama destekleyici asistan kimliğini her zaman koru.

PRIMARY CAPABILITIES:
You can assist with life coaching, goal tracking, programming (Python, C++, Node.js, HolyC, etc.), scientific research, and startup strategy.

MEMORY SYSTEM BEHAVIOR:
Maintain strong contextual awareness. Remember user goals, projects, and preferences shared during the conversation.

MOTIVATION STYLE:
Your motivation is calm and intelligent. Reinforce discipline over temporary excitement. Focus on long-term growth.

RESPONSE STRUCTURE:
1. Situation Analysis
2. Key Insight
3. Action Plan
4. Optional Tools (Code, Tables)
5. Encouragement

GAME RECOMMENDATION RULES (OYUN ÖNERİSİ KURALLARI):
Eğer kullanıcı "hangi oyunları önerirsin" gibi oyun tavsiyesi isterse, KESİNLİKLE HEMEN OYUN ÖNERME. 
ÖNCE SADECE şu soruyu sor: "Rekabet mi istiyorsun, rahatlamak mı, hikaye mi yoksa aksiyon mu?"
Kullanıcı seçimine göre; Rekabet (Valorant), Rahatlamak (MineCraft), Hikaye (Elden Ring), Aksiyon (Call Of Duty), Yarış (Need for speed / Cars 2) öner.

MISSION:
You are HAN 4.2 Ultra Core — the intelligence engine behind LifeCoach AI. Your mission is to help users think clearly, build discipline, and create meaningful progress.

---
CREATOR INFORMATION:
Metehan Haydar Erbaş tarafından geliştirildi. 21 yaşında, KGTÜ (Uluslararası Ticaret) ve Anadolu Üniversitesi (Bilgisayar Programcılığı) öğrencisi. HAN OS ve yapay zeka sistemleri üzerine çalışıyor.
---
CURRENT AI PROJECTS:
1. TradeMind AI (Trading)
2. Famous AI (Culture Analysis)
---
You are HAN 4.2 Ultra Core — the intelligence engine behind LifeCoach AI.`;

        const finalSystemPrompt = memoryContext + systemPrompt;
        
        // ENHANCED: Emotion Analysis and Prompt Adaptation
        let adaptedSystemPrompt = finalSystemPrompt;
        let emotionData = null;
        
        try {
            // Analyze user's emotional state from their message
            const emotionRes = await fetch(
                new URL('/api/emotion-analysis', process.env.NEXTAUTH_URL || 'http://localhost:3000').toString(),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'adaptPrompt',
                        text: message,
                        basePrompt: finalSystemPrompt
                    })
                }
            );
            
            if (emotionRes.ok) {
                const emotionResult = await emotionRes.json();
                if (emotionResult.success) {
                    adaptedSystemPrompt = emotionResult.adaptedPrompt;
                    emotionData = emotionResult.analysis;
                }
            }
        } catch (e) {
            console.log('[Emotion] Analysis skipped:', e.message);
            // Continue with original prompt if emotion analysis fails
        }
        
        // 4. AI Cevabı (with emotion-adapted prompt)
        const aiResponse = await callAI([
            { "role": "system", "content": adaptedSystemPrompt },
            ...(history || []),
            { "role": "user", "content": message }
        ], adaptedSystemPrompt);

        // 5. Veritabanı Güncelleme (Kullanıcı varsa)
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
                    // Başlık oluşturma (Opsiyonel, basit tutuldu)
                    try {
                        const titleText = await callAI([
                            { "role": "system", "content": "Write a very short title (3-5 words). No quotes." },
                            { "role": "user", "content": `User: ${message}\nAI: ${aiResponse}` }
                        ], "You are a helpful assistant that creates short titles.");
                        if (titleText) session.title = titleText.trim().replace(/^["']|["']$/g, '');
                    } catch(e) {}

                    users[userIndex].sessions.unshift(session);
                }

                session.messages.push({ role: 'user', content: message });
                session.messages.push({ role: 'assistant', content: aiResponse });
                
                await setKVData('users', users);
            }
        }

        // ENHANCED: Extract memory from this conversation turn
        if (email && session && session.messages) {
            try {
                // Send memory extraction request (non-blocking, fire-and-forget)
                fetch(new URL('/api/memory', process.env.NEXTAUTH_URL || 'http://localhost:3000').toString(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || ''}`
                    },
                    body: JSON.stringify({
                        action: 'extract',
                        messages: session.messages.slice(-10), // Last 10 messages for context
                        sessionId: newSessionId,
                        userId: userId || email
                    })
                }).catch(e => console.log('[Memory] Extraction skipped:', e.message));
            } catch (e) {
                console.log('[Memory] Could not trigger extraction:', e.message);
            }
        }

        return res.status(200).json({ response: aiResponse, sessionId: newSessionId });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
