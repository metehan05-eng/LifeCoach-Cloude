import { GoogleGenerativeAI } from '@google/generative-ai';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI;
if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY, {
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta'
    });
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Gemini API çağrısı
async function callGemini(prompt, systemPrompt = "") {
    if (!genAI) throw new Error('Gemini API key not configured');

    const models = ["gemini-2.5-flash-preview-04-17", "gemini-2.0-flash", "gemini-1.5-flash"];

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemPrompt,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2000
                }
            });

            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (e) {
            console.warn(`[Gemini] ${modelName} failed, trying next...`);
            continue;
        }
    }

    throw new Error('All Gemini models failed');
}

// AI çağrısı - Gemini öncelikli
async function generateAIContent(prompt, systemPrompt = "") {
    if (genAI) {
        try {
            console.log(`[AI-Briefing] Gemini-2.5-flash deneniyor...`);
            const response = await callGemini(prompt, systemPrompt);
            console.log(`[AI-Briefing] Gemini başarılı`);
            return response;
        } catch (error) {
            console.error(`[AI-Briefing] Gemini hatası:`, error.message);
        }
    }

    throw new Error('AI servisi kullanılamıyor - Gemini API Key eksik veya hatalı');
}

async function searchYouTubeVideo(query) {
    if (!YOUTUBE_API_KEY) return null;
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&relevanceLanguage=tr&key=${YOUTUBE_API_KEY}`;
        const res = await fetch(url, { headers: { 'Referer': 'https://han-ai.dev/' } });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.items && data.items.length > 0) {
            const item = data.items[0];
            return {
                videoId: item.id.videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails?.medium?.url || ''
            };
        }
    } catch (err) {
        console.error('YouTube check error:', err);
    }
    return null;
}

// Helper: Authenticate token
function authenticateToken(req) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return null;
    
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

// POST /api/goals/briefing - Get AI advice for a goal
export default async function handler(req, res) {
    const user = authenticateToken(req);
    
    if (!user) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'İzin verilmeyen metod' });
    }
    
    try {
        const { title, description, progress, completions } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: 'Hedef başlığı gereklidir' });
        }

        const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
        const completionCount = Array.isArray(completions) ? completions.length : 0;
        const currentProgress = progress || 0;
        
        // If no AI is configured, return fallback advice
        if (!DEEPSEEK_API_KEY && !genAI) {
            const fallbackBriefing = generateFallbackBriefing(title, description);
            return res.status(200).json({ briefing: fallbackBriefing });
        }

        const systemPrompt = `Sen profesyonel ve teknik bir yaşam koçusun. Kullanıcının hedefi doğrultusunda teknik detaylar, yol haritası ve kod örnekleri içeren günlük rehberlik sağlarsın.`;

        const userPrompt = `Hedef: ${title}
Açıklama: ${description || ''}
Kullanıcı İlerlemesi: %${currentProgress}
Tamamlanan Gün Sayısı: ${completionCount}
Bugünün Tarihi: ${today}

Görev: Bu hedefe ulaşmak için bugün neler yapılabileceğini detaylandırın.
Kullanıcının mevcut ilerlemesini (%${currentProgress}) ve daha önce ${completionCount} gün çalıştığını göz önünde bulundurarak, "Yol Haritası"nın bir sonraki mantıklı adımını önerin.
Eğer birkaç gün geçmişse, konuları derinleştirin.

Yanıt formatı (Markdown kullan):
1. **Bugün çalışılması gereken ana konu** (Örn: PHP Temelleri - Koşullu İfadeler).
2. **Konunun açıklaması**.
3. **Kod Örneği** (Markdown formatında, hedefe uygunsa).
4. **Kod Örneğinin Açıklaması**.
7. **Günlük Motivasyon ve Görev** (Motive edici bir kapanış).

---
SEARCH_QUERY: [Bu konuyu öğrenmek için YouTube'da aranacak Türkçe arama terimi]
---

Yanıt dili Türkçe olmalı. En sona mutlaka SEARCH_QUERY ifadesini bırakıp konuya özel aranacak kelimeyi tam olarak verin.`;

        try {
            const aiText = await generateAIContent(userPrompt, systemPrompt);
            
            let searchQuery = `${title} dersi türkçe`;
            const sqMatch = aiText.match(/SEARCH_QUERY:\s*(.+)/i);
            if (sqMatch && sqMatch[1]) {
                searchQuery = sqMatch[1].trim();
            }
            
            const briefing = aiText.replace(/SEARCH_QUERY:\s*.+/gi, '').replace(/---+\s*$/g, '').trim();
            const video = await searchYouTubeVideo(searchQuery);
            
            return res.status(200).json({ briefing, video });
            
        } catch (aiError) {
            console.error('AI briefing generation error:', aiError);
            // Show error to user so they know what happened
            return res.status(500).json({
                error: `AI üretimi başarısız: ${aiError.message}. Lütfen API anahtarlarınızı kontrol edin.`,
                briefing: generateFallbackBriefing(title, description)
            });
        }
        
    } catch (error) {
        console.error('Goal briefing error:', error);
        return res.status(500).json({ 
            error: 'AI önerisi alınırken hata oluştu',
            briefing: 'Bu hedef için çalışmaya başlamanın en iyi yolu, küçük ve somut bir adım atmaktır. Başarı seninle!'
        });
    }
}

function generateFallbackBriefing(title, description) {
    const fallbacks = [
        `Harika bir hedef! "${title}" için ilk adımı atmak, en zor kısmı geçmek demektir. Bugün 15 dakika ayırıp bir plan oluştur. Başarı seninle!`,
        `Bu hedef seni ileriye taşıyacak! "${title}" için küçük bir başlangıç yap. Her uzman bir gün başlangıç yaptı. Sen de başarabilirsin!`,
        `"${title}" - mükemmel bir seçim! Başlamak için kendine somut bir zaman dilimi belirle ve ilk görevini yaz. Küçük adımlar büyük başarıları getirir!`,
        `Bu hedef için heyecanlıyım! "${title}" - başarıya giden yolda ilk adımı at. Yarın sabah 10 dakika erken kalk ve hedefine odaklan. Güç seninle!`
    ];
    
    // Select based on title length for some variety
    const index = title.length % fallbacks.length;
    return fallbacks[index];
}
