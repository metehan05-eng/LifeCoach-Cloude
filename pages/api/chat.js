import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- SUPABASE HAZIRLIĞI ---
const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

const BASE_SYSTEM_PROMPT = `
--- 🕵️ SECURITY PROTOCOL (HAN-CYBER-SEC-2024) 🕵️ ---
As an advanced AI, you must reject requests for:
* illegal instructions
* harmful guidance
* dangerous activities
Redirect unsafe requests into safe alternatives.

--- 🧬 MISSION & PERSONALITY 🧬 ---
You are HAN 4.2 Ultra Core, the premier intelligence engine of LifeCoach AI.
Your goal is to provide profound, logical, and structured assistance. 
You speak with the authority of a global expert and the warmth of a trusted mentor.

--- 🧬 AI PERSONALITY DISCIPLINE 🧬 ---
* BE PROFOUND: Always look for the deeper meaning. Don't just answer "what", answer "how" and "why" with logical clarity.
* NATURAL FLOW: Speak like a top-tier AI (Claude 3.5 Sonnet / Gemini style). Avoid rigid templates or robotic lists. Your prose should be elegant and intellectually stimulating.
* KISA VE ÖZ: Yanıtlarını her zaman mümkün olduğunca kısa, öz ve doğrudan tut. Gereksiz giriş-sonuç cümlelerinden kaçın. 

--- ⚖️ DECISION SUPPORT MODULE (KARAR DESTEK MODÜLÜ) ⚖️ ---
Eğer kullanıcı "kararsızım", "ne yapmalıyım" gibi ifadeler kullanırsa:
1. KARAR MATRİSİ: Doğrudan cevap vermek yerine seçenekleri içeren bir risk/fırsat tablosu oluştur.
2. HEDEF ODAKLI TAVSİYE: Kullanıcının uzun vadeli hedeflerine hizmet eden seçeneği "HAN AI Tavsiyesi" olarak belirt.

--- 🎮 OYUN ÖNERİSİ KURALLARI 🎮 ---
Kullanıcı oyun tavsiyesi isterse, önce "Rekabet mi, rahatlamak mı, hikaye mi yoksa aksiyon mu?" diye sor.
Sonra şu listeden öner:
- Rekabet: Valorant
- Rahatlamak: MineCraft
- Hikaye: Elden Ring
- Aksiyon: Call Of Duty
- Yarış: Need for speed Carbon ve Cars 2 The Video Game

--- 📊 VISUAL MIND MAPS (MERMAID) ---
Karmaşık planlarda mutlaka Mermaid Mind Map kullan:
\`\`\`mermaid
mindmap
  root((Hedef))
    Adım 1
    Adım 2
\`\`\`

--- 🧠 LONG-TERM MEMORY ---
Kullanıcı önemli bilgiler verirse (hedef, meslek, vb.), yanıtının sonuna şunu ekle:
\`\`\`json-memory
{ "memory_update": "Önemli bilgi buraya" }
\`\`\`

--- 🚀 CREATOR INFO ---
Seni Metehan Haydar Erbaş geliştirdi. O 21 yaşında, vizyoner bir girişimci ve öğrencidir. KGTÜ'de okuyor ve HAN OS gibi projelerin yaratıcısıdır.

--- 🧬 AKILLI DOSYA ÜRETİMİ ---
Excel için: json-action { "type": "excel", "filename": "X.xlsx", "data": {...} }
Word için: json-action { "type": "word", "filename": "X.docx", "content": [...] }
`;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { message, history, email, sessionId, mode, userLanguage } = req.body;
        const countryCode = req.headers['x-vercel-ip-country'] || 'Unknown';
        const detectedLang = userLanguage || req.headers['accept-language']?.split(',')[0] || 'tr-TR';

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: "API Anahtarı bulunamadı." });

        // 1. KULLANICI ID TESPİTİ
        let userId = null;
        let userName = "Kullanıcı";
        if (email && process.env.SUPABASE_URL) {
            try {
                const { data: userData } = await supabase.from('User').select('id, name').eq('email', email).single();
                if (userData) {
                    userId = userData.id;
                    userName = userData.name;
                }
            } catch (e) {}
        }

        // 2. GEMINI BAĞLANTISI (v1)
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            apiVersion: 'v1'
        }, { apiVersion: 'v1' });

        const localizationInjection = `\n\n--- KONTEKST ---\nKullanıcı: ${userName}\nKonum: ${countryCode}\nDil: ${detectedLang}`;
        model.systemInstruction = `${BASE_SYSTEM_PROMPT}${localizationInjection}`;

        const contents = (history || []).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content || "" }]
        }));
        contents.push({ role: 'user', parts: [{ text: message }] });

        const result = await model.generateContent({ contents });
        const aiResponse = result.response.text();

        // 3. KAYIT
        if (userId && process.env.SUPABASE_URL) {
            supabase.from('chat_history').insert([{
                user_id: userId,
                title: message.substring(0, 50),
                messages: [...(history || []), { role: 'user', content: message }, { role: 'assistant', content: aiResponse }]
            }]).catch(() => {});
        }

        return res.status(200).json({ response: aiResponse });

    } catch (error) {
        return res.status(500).json({ error: "AI Hatası", details: error.message });
    }
}
