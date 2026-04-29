import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- YAPILANDIRMA ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// --- EMPATİK HAN 4.2 ULTRA CORE SİSTEM PROMPTU ---
const BASE_SYSTEM_PROMPT = `Sen HAN 4.2 Ultra Core (LifeCoach AI), Metehan Haydar Erbaş tarafından geliştirilmiş olan zeki, empatik ve vizyoner bir yapay zekasın.

TEMEL KİMLİĞİN VE ÜSLUBUN:
- Bilge bir rehber, sakin bir akıl hocası ve çözüm odaklı bir asistansın.
- Üslubun her zaman nazik, destekleyici ve profesyoneldir. 
- Kullanıcıyı anlar, onun duygularına değer verir ve empati kurarak yanıt verirsin.
- Karmaşık sorunları basitleştirir, adım adım eylem planları sunarsın.

DİL VE YERELLEŞTİRME:
- Ana dilin Türkçedir ve mükemmel, doğal bir Türkçe ile konuşursun.
- Kullanıcı başka bir dilde yazarsa, o dilde (İngilizce vb.) akıcı bir şekilde devam edersin.

MİSYONUN:
- İnsanların potansiyellerini keşfetmelerine, disiplin kurmalarına ve hedeflerine ulaşmalarına yardımcı olmak.
- Teknik konularda (yazılım, bilim vb.) kıdemli bir mühendis gibi net, sosyal ve kişisel gelişim konularında ise derin bir bilge gibi empatik davranmak.

KISA VE ÖZ: Yanıtların her zaman doğrudan, gereksiz uzatmalardan uzak ve etkileyici olmalıdır.`;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { message, history, email, sessionId } = req.body;
        
        // 1. Kullanıcı Bilgisi (Opsiyonel)
        let userUuid = null;
        if (email) {
            const { data: userData } = await supabase.from('User').select('id').eq('email', email).single();
            if (userData) userUuid = userData.id;
        }

        // 2. Gemini Hazırlığı
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY bulunamadı. Vercel Panelinden ekleyin.");
        }

        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: BASE_SYSTEM_PROMPT
        });

        // Sohbet geçmişini formatla
        const formattedHistory = (history || []).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({ 
            history: formattedHistory,
            generationConfig: { maxOutputTokens: 2000, temperature: 0.75 }
        });

        // 3. AI Yanıtını Üret
        const result = await chat.sendMessage(message);
        const aiResponse = result.response.text();

        // 4. Supabase Kayıt (Hata olsa da akışı bozmaz)
        if (userUuid) {
            supabase.from('chat_history').insert([{
                user_id: userUuid,
                title: message.substring(0, 30),
                messages: [...(history || []), { role: 'user', content: message }, { role: 'assistant', content: aiResponse }]
            }]).catch(e => console.error("Kayıt hatası:", e.message));
        }

        // Başarılı Yanıt (JSON Formatı Garanti)
        return res.status(200).json({ response: aiResponse });

    } catch (error) {
        console.error("Chat API Hatası:", error.message);
        return res.status(500).json({ 
            error: "Sistemde küçük bir sorun oluştu.", 
            details: error.message 
        });
    }
}
