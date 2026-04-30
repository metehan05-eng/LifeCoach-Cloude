import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- SUPABASE HAZIRLIĞI ---
const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { message, history, email, sessionId } = req.body;

        // 1. API ANAHTARI KONTROLÜ
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ 
                error: "Sistem Hatası: API Anahtarı Bulunamadı.", 
                details: "Vercel üzerinde GEMINI_API_KEY tanımlanmamış olabilir." 
            });
        }

        // 2. KULLANICI ID TESPİTİ (Supabase için)
        let userId = null;
        if (email && process.env.SUPABASE_URL) {
            try {
                // Prisma tablonuzda 'User' olarak geçtiği için 'User' tablosuna bakıyoruz
                const { data: userData } = await supabase
                    .from('User')
                    .select('id')
                    .eq('email', email)
                    .single();
                
                if (userData) userId = userData.id;
            } catch (e) {
                console.warn("[Supabase] Kullanıcı tespit edilemedi:", e.message);
            }
        }

        // 3. GEMINI BAĞLANTISI
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: "Sen HAN 4.2 Ultra Core, Metehan tarafından geliştirilen zeki bir AI yaşam koçusun. Kullanıcıya profesyonel, motive edici ve çözüm odaklı yaklaş. Claude AI stiline benzer, temiz ve akıllı yanıtlar ver."
        });

        // Sohbet geçmişini formatla (Gemini 1.5 standardı)
        const contents = (history || []).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content || "" }]
        }));
        
        // Yeni mesajı ekle
        contents.push({ role: 'user', parts: [{ text: message }] });

        // 4. CEVAP ÜRETME
        const result = await model.generateContent({ contents });
        const response = await result.response;
        const aiResponse = response.text();

        // 5. KAYIT (Hata olsa da chat'i bozmaz)
        if (userId && process.env.SUPABASE_URL) {
            supabase.from('chat_history').insert([{
                user_id: userId,
                title: message.substring(0, 50),
                messages: [...(history || []), { role: 'user', content: message }, { role: 'assistant', content: aiResponse }]
            }]).then(({ error }) => { 
                if (error) console.error("[Supabase] Kayıt Hatası:", error.message); 
            });
        }

        return res.status(200).json({ response: aiResponse });

    } catch (error) {
        console.error("KRİTİK CHAT HATASI:", error);
        return res.status(500).json({
            error: "HAN AI şu an bir sorun yaşıyor.",
            details: error.message,
            code: error.status || "UNKNOWN_ERROR"
        });
    }
}
