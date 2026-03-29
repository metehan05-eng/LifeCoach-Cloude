import { GoogleGenerativeAI } from '@google/generative-ai';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI;
if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
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
        const { title, description } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: 'Hedef başlığı gereklidir' });
        }
        
        // If Gemini is not configured, return fallback advice
        if (!genAI) {
            const fallbackBriefing = generateFallbackBriefing(title, description);
            return res.status(200).json({ briefing: fallbackBriefing });
        }
        
        const gemini31FlashLite = "gemini-3.1-flash-lite-preview";
        
        const systemPrompt = `Sen bir yaşam koçu ve hedef uzmanısın. Kullanıcının hedefi için kısa, pratik ve motive edici bir öneri sunmalısın.

Yanıt formatı (Markdown kullan, maksimum 3-4 cümle):
1. Hedefi önce kısa bir cümleyle onayla/öv
2. Spesifik, uygulanabilir bir ilk adım öner
3. Motive edici bir kapanış cümlesi

Örnek yanıtlar:
- "Harika bir hedef! Başlamak için yarın sabah 15 dakika erken kalkıp ilk görevini belirle. Küçük adımlar büyük başarıları getirir!"
- "Bu hedef seni ileriye taşıyacak! Bugün kendine 20 dakika ayırıp bir plan oluştur. Her uzman bir gün başlangıç yaptı!"

Kullanıcının hedefini analiz et ve özelleştirilmiş öneri sun.`;

        const userPrompt = `Hedef: ${title}
${description ? `Açıklama: ${description}` : ''}

Bu hedef için kısa, pratik ve motive edici bir öneri ver.`;

        try {
            const model = genAI.getGenerativeModel({
                model: gemini31FlashLite,
                systemInstruction: systemPrompt,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 300
                }
            });
            
            const result = await model.generateContent(userPrompt);
            const briefing = result.response.text().trim();
            
            return res.status(200).json({ briefing });
            
        } catch (aiError) {
            console.error('AI briefing generation error:', aiError);
            // Fallback to static advice
            const fallbackBriefing = generateFallbackBriefing(title, description);
            return res.status(200).json({ briefing: fallbackBriefing });
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
