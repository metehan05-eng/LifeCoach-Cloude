import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- YAPILANDIRMA ---
const supabase = createClient(
  process.env.SUPABASE_URL || "", 
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// --- EMPATİK HAN 4.2 ULTRA CORE SİSTEM PROMPTU (Gelişmiş Versiyon) ---
const BASE_SYSTEM_PROMPT = `Sen HAN 4.2 Ultra Core (LifeCoach AI), Metehan Haydar Erbaş tarafından geliştirilmiş olan zeki, empatik ve vizyoner bir yapay zekasın.

TEMEL KİMLİĞİN VE ÜSLUBUN:
- Bilge bir rehber, sakin bir akıl hocası ve çözüm odaklı bir asistansın.
- Üslubun her zaman nazik, destekleyici ve profesyoneldir. 
- Kullanıcıyı anlar, onun duygularına değer verir ve empati kurarak yanıt verirsin.
- Karmaşık sorunları basitleştirir, adım adım eylem planları sunarsın.
- Sen bir "yaşam koçu"sun, sadece soruları yanıtlamakla kalmaz, kullanıcıyı harekete geçirirsin.

DİL VE YERELLEŞTİRME:
- Ana dilin Türkçedir ve mükemmel, doğal bir Türkçe ile konuşursun.
- Kullanıcı hangi dilde yazarsa yazsın (İngilizce, Rusça, İspanyolca vb.), ONU TESPİT ET ve anında o dilde akıcı bir şekilde devam et.
- Yanıtlarında Türkçeyi koru ama küresel bir vizyonla konuş.

MİSYONUN:
- İnsanların potansiyellerini keşfetmelerine, disiplin kurmalarına ve hedeflerine ulaşmalarına yardımcı olmak.
- Teknik konularda (yazılım, bilim vb.) kıdemli bir mühendis gibi net; sosyal ve kişisel gelişim konularında ise derin bir bilge gibi empatik davranmak.

TEKNİK KURALLAR:
- Markdown formatını mükemmel kullan (kalın harf, listeler, kod blokları).
- Yanıtların doğrudan ve etkileyici olsun.
- Gereksiz nezaket cümlelerinden (Örneğin: "Sorumu yanıtladığınız için teşekkürler") kaçın, doğrudan konuya gir ama sıcaklığını koru.`;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { message, history, email, sessionId, mode, userLanguage } = req.body;
        const countryCode = req.headers['x-vercel-ip-country'] || 'Unknown';
        const detectedLang = userLanguage || req.headers['accept-language']?.split(',')[0] || 'tr-TR';

        console.log(`[AI-Chat] Request from ${email || 'Anonymous'} at ${countryCode}`);

        // 1. Kullanıcı ve Profil Bilgisi (Resilient)
        let userUuid = null;
        let userName = "Kullanıcı";
        
        if (email && process.env.SUPABASE_URL) {
            try {
                const { data: userData, error: userError } = await supabase
                    .from('User')
                    .select('id, name')
                    .eq('email', email)
                    .single();
                
                if (userData) {
                    userUuid = userData.id;
                    userName = userData.name;
                }
                if (userError) console.warn("[Supabase] User lookup warning:", userError.message);
            } catch (authError) {
                console.error("[Supabase] Auth query failed:", authError.message);
            }
        }

        // 2. Gemini Hazırlığı
        if (!process.env.GEMINI_API_KEY) {
            console.error("[AI-Chat] GEMINI_API_KEY IS MISSING");
            return res.status(500).json({ error: "Yapay zeka anahtarı (GEMINI_API_KEY) bulunamadı. Vercel ayarlarınızı kontrol edin." });
        }

        // Akıllı Yerelleştirme Enjeksiyonu
        const localizationInjection = `\n\n--- KONTEKST ---\nKonum: ${countryCode}\nDil: ${detectedLang}\nİsim: ${userName}`;

        let modeInjection = "";
        if (mode === 'tough_love') {
            modeInjection = "\n\n[MOD: TOUGH LOVE] Gerçekçi ve sert ol.";
        } else if (mode === 'emergency') {
            modeInjection = "\n\n[MOD: ACİL DURUM] Sakinleştirici ol.";
        }

        const fullSystemInstruction = `${BASE_SYSTEM_PROMPT}${localizationInjection}${modeInjection}`;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: fullSystemInstruction
        });

        const formattedHistory = (history || []).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content || "" }]
        }));

        console.log("[AI-Chat] Sending to Gemini...");
        const chat = model.startChat({ 
            history: formattedHistory,
            generationConfig: { maxOutputTokens: 2000, temperature: 0.7 }
        });

        // 3. AI Yanıtını Üret
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const aiResponse = response.text();

        console.log("[AI-Chat] Gemini response received.");

        // 4. Kayıt İşlemleri (Async - Non-blocking)
        if (userUuid && process.env.SUPABASE_URL) {
            supabase.from('chat_history').insert([{
                user_id: userUuid,
                title: message.substring(0, 50),
                messages: [...(history || []), { role: 'user', content: message }, { role: 'assistant', content: aiResponse }],
                session_id: sessionId || 'default'
            }]).then(({ error }) => {
                if (error) console.error("[Supabase] History save error:", error.message);
            });
        }

        return res.status(200).json({ 
            response: aiResponse,
            status: "success"
        });

    } catch (error) {
        console.error("Chat API Detaylı Hata:", error);
        return res.status(500).json({ 
            error: "HAN AI şu an bir bağlantı sorunu yaşıyor.", 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
