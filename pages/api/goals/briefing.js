import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY; // Tavily AI arama için

// Gemini API Ayarları (Tek AI - Sadece Gemini)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';

// Gemini Client (Tek AI)
let genAI = null;
if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log(`[Briefing] Gemini API aktif: ${GEMINI_MODEL}`);
} else {
    console.warn('[Briefing] GEMINI_API_KEY ayarlanmamış. AI özellikleri çalışmayabilir.');
}

// Timeout promise helper
function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)
        )
    ]);
}

// Tavily AI Search Helper - Hızlı versiyon
async function searchTavily(query, numResults = 3) {
    if (!TAVILY_API_KEY) {
        console.warn('[BriefingSearch] TAVILY_API_KEY ayarlanmamış');
        return null;
    }
    
    try {
        // 3 saniyelik timeout ile ara
        const response = await withTimeout(
            fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${TAVILY_API_KEY}`
                },
                body: JSON.stringify({
                    query: query,
                    search_depth: 'basic', // 'advanced' yerine 'basic' - daha hızlı
                    max_results: numResults,
                    include_answer: true,
                    include_images: false,
                    include_raw_content: false
                })
            }),
            3000, // 3 saniye timeout
            'Tavily search'
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[BriefingSearch] Tavily API error:', response.status, errorText);
            return null;
        }
        
        const data = await response.json();
        const results = [];
        
        // AI generated answer varsa ekle
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
        
        console.log(`[BriefingSearch] "${query}" için ${results.length} sonuç bulundu`);
        return results;
        
    } catch (err) {
        console.warn('[BriefingSearch] Arama hatası (timeout veya hata):', err.message);
        return null; // Hata durumunda null dön, fallback kullanılacak
    }
}

// Arama sonuçlarını formatla
function formatSearchResults(results, query) {
    if (!results || results.length === 0) return '';
    
    let formatted = `\n\n--- INTERNET ARAMA SONUÇLARI: "${query}" ---\n\n`;
    
    results.forEach((result, index) => {
        if (result.isFeatured) {
            formatted += `[ÖNE ÇIKAN BİLGİ] ${result.snippet}\n\n`;
        } else {
            formatted += `[${index + 1}] ${result.title}\n`;
            formatted += `Özet: ${result.snippet}\n\n`;
        }
    });
    
    formatted += '--- ARAMA SONUÇLARI BİTTİ ---\n';
    formatted += 'YUKARIDAKİ GÜNCEL BİLGİLERİ KULLANARAK DETAYLI BİR YOL HARİTASI OLUŞTUR.\n\n';
    
    return formatted;
}

// Gemini API çağrısı (Ana AI)
async function callGemini(prompt, systemInstruction = "") {
    if (!genAI) {
        throw new Error("Gemini API yapılandırılmamış");
    }
    
    const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.7,
        },
        ...(systemInstruction && {
            systemInstruction: { parts: [{ text: systemInstruction }] }
        })
    });

    const result = await model.generateContent({
        contents: [{
            role: 'user',
            parts: [{ text: prompt }]
        }]
    });
    
    const response = result.response;
    return {
        text: response.text(),
        model: GEMINI_MODEL
    };
}

// AI çağrısı - Sadece Gemini
async function generateAIContent(prompt, systemPrompt = "") {
    if (!genAI) {
        console.error('[AI-Briefing] Gemini API yapılandırılmamış');
        return null;
    }
    
    try {
        console.log(`[AI-Briefing] Gemini çalıştırılıyor: ${GEMINI_MODEL}`);
        const result = await callGemini(prompt, systemPrompt);
        console.log('[AI-Briefing] Gemini başarılı');
        return result.text;
    } catch (error) {
        console.error('[AI-Briefing] Gemini hatası:', error.message);
        return null;
    }
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
        
        // --- GOOGLE ARAMA (Hedef konusu hakkında güncel bilgi) ---
        let searchContext = '';
        const searchQuery = `${title} ${description || ''} ders eğitim`.substring(0, 100);
        
        try {
            console.log(`[BriefingSearch] Arama yapılıyor: "${searchQuery}"`);
            const searchResults = await searchTavily(searchQuery, 5);
            if (searchResults && searchResults.length > 0) {
                searchContext = formatSearchResults(searchResults, searchQuery);
                console.log(`[BriefingSearch] ${searchResults.length} sonuç bulundu`);
            }
        } catch (searchErr) {
            console.warn('[BriefingSearch] Arama hatası (görmezden geliniyor):', searchErr.message);
        }

        const systemPrompt = `Sen profesyonel ve teknik bir yaşam koçusun. Kullanıcının hedefi doğrultusunda teknik detaylar, yol haritası ve kod örnekleri içeren günlük rehberlik sağlarsın.

ÖNEMLİ: Aşağıdaki İNTERNET ARAMA SONUÇLARI bölümündeki güncel ve doğrulanmış bilgileri kullanarak yanıt ver. Eğer arama sonuçları varsa, bunları temel al; yoksa genel bilgilerini kullan.`;

        const userPrompt = `Hedef: ${title}
Açıklama: ${description || ''}
Kullanıcı İlerlemesi: %${currentProgress}
Tamamlanan Gün Sayısı: ${completionCount}
Bugünün Tarihi: ${today}
${searchContext}

Görev: Bu hedefe ulaşmak için bugün neler yapılabileceğini detaylandırın.
Kullanıcının mevcut ilerlemesini (%${currentProgress}) ve daha önce ${completionCount} gün çalıştığını göz önünde bulundurarak, "Yol Haritası"nın bir sonraki mantıklı adımını önerin.
Eğer birkaç gün geçmişse, konuları derinleştirin.

Yukarıdaki İNTERNET ARAMA SONUÇLARI varsa, bu güncel bilgileri kullanarak en doğru ve detaylı yol haritasını oluştur.

Yanıt formatı (Markdown kullan):
1. **Bugün çalışılması gereken ana konu** (Örn: PHP Temelleri - Koşullu İfadeler).
2. **Konunun açıklaması** (Arama sonuçlarından güncel bilgilerle zenginleştirilmiş).
3. **Kod Örneği** (Markdown formatında, hedefe uygunsa).
4. **Kod Örneğinin Açıklaması**.
7. **Günlük Motivasyon ve Görev** (Motive edici bir kapanış).

---
SEARCH_QUERY: [Bu konuyu öğrenmek için YouTube'da aranacak Türkçe arama terimi]
---

Yanıt dili Türkçe olmalı. En sona mutlaka SEARCH_QUERY ifadesini bırakıp konuya özel aranacak kelimeyi tam olarak verin.`;

        try {
            const aiText = await generateAIContent(userPrompt, systemPrompt);
            
            // AI başarısız olursa fallback kullan
            if (!aiText) {
                const fallback = generateFallbackBriefing(title, description);
                return res.status(200).json({ 
                    briefing: fallback,
                    video: null,
                    isFallback: true
                });
            }
            
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
            // Fallback döndür
            const fallback = generateFallbackBriefing(title, description);
            return res.status(200).json({
                briefing: fallback,
                video: null,
                isFallback: true,
                error: aiError.message
            });
        }
        
    } catch (error) {
        console.error('Goal briefing error:', error);
        const fallback = generateFallbackBriefing(title, description);
        return res.status(200).json({ 
            briefing: fallback,
            video: null,
            isFallback: true,
            error: error.message
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
