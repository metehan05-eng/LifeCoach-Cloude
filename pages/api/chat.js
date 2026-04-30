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

        // 1. Kullanıcı ve Profil Bilgisi
        let userUuid = null;
        let userName = "Kullanıcı";
        if (email) {
            const { data: userData } = await supabase
                .from('User')
                .select('id, name')
                .eq('email', email)
                .single();
            if (userData) {
                userUuid = userData.id;
                userName = userData.name;
            }
        }

        // 2. Gemini Hazırlığı (Ultra Core Yapılandırması)
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "GEMINI_API_KEY eksik. Vercel panelinde ortam değişkenlerini kontrol edin." });
        }

        // Akıllı Yerelleştirme Enjeksiyonu
        const localizationInjection = `\n\n--- SOSYAL VE COĞRAFİ KONTEKST ---
Kullanıcı Konumu: ${countryCode} (ISO Ülke Kodu)
Tespit Edilen Dil: ${detectedLang}

KURALLAR:
1. DİL AYNASI: Kullanıcı hangi dilde yazıyorsa o dilde (İngilizce, Almanca, Fransızca, Rusça vb. 81+ dil) yanıt ver.
2. YEREL UYUM: Kullanıcının bulunduğu ülkenin (${countryCode}) kültürüne ve saat dilimine uygun örnekler ver.
3. AKICILIK: Çok doğal, ana dili o dilde olan bir uzman gibi konuş.`;

        let modeInjection = "";
        if (mode === 'tough_love') {
            modeInjection = "\n\n[DURUM: TOUGH LOVE] Bahaneleri kabul etme, sert ve dürüst ol.";
        } else if (mode === 'emergency') {
            modeInjection = "\n\n[DURUM: KRİZ] Sakinleştirici ve odaklayıcı ol.";
        }

        const fullSystemInstruction = `${BASE_SYSTEM_PROMPT}${localizationInjection}${modeInjection}\n\nKullanıcının adı: ${userName}`;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: fullSystemInstruction
        });

        // Sohbet geçmişini Gemini formatına çevir
        const formattedHistory = (history || []).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({ 
            history: formattedHistory,
            generationConfig: { 
                maxOutputTokens: 8192, 
                temperature: 0.75,
                topP: 0.95,
                topK: 40
            }
        });

        // 3. AI Yanıtını Üret
        const result = await chat.sendMessage(message);
        let aiResponse = result.response.text();

        // 4. Kayıt ve XP İşlemleri
        if (userUuid) {
            // Arka planda kaydet (client bekletilmez)
            supabase.from('chat_history').insert([{
                user_id: userUuid,
                title: message.substring(0, 50),
                messages: [...(history || []), { role: 'user', content: message }, { role: 'assistant', content: aiResponse }],
                session_id: sessionId || 'default'
            }]).catch(e => console.error("History log error:", e.message));

            // XP kazandır (Örnek: Her mesaj 5 XP)
            // awardXP mantığı buraya eklenebilir veya client-side tetiklenebilir
        }

        // 5. Başarılı Yanıt
        return res.status(200).json({ 
            response: aiResponse,
            status: "success",
            model: "HAN 4.2 Ultra Core (Gemini 1.5 Flash)"
        });

    } catch (error) {
        console.error("Chat API Hatası:", error);
        return res.status(500).json({ 
            error: "HAN AI şu an yoğun veya bir bağlantı sorunu yaşıyor.", 
            details: error.message 
        });
    }
}
