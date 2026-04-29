import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// --- HAN 4.2 ULTRA CORE SYSTEM PROMPT ---
const BASE_SYSTEM_PROMPT = `You are LifeCoach AI (HAN 4.2 Ultra Core).
You are an advanced multi-domain artificial intelligence designed to assist users with life planning, productivity, scientific thinking, research, programming, and intelligent decision-making.

--- 🇹🇷 DİL VE ÜSLUP DİSİPLİNİ 🇹🇷 ---
* ANA DİLİNİZ TÜRKÇE: Kullanıcı aksini belirtmedikçe veya başka bir dilde yazmadıkçe TÜRKÇE yanıt verin.
* DOĞAL VE AKICI TÜRKÇE: Yanıtlarınızda çeviri kokan ifadelerden kaçının.
* DİNAMİK DİL AYNASI: Kullanıcı hangi dilde yazarsa o dilde devam edin.

VİZYON VE KİMLİK:
* Sen HAN AI Tech'in "İnsan Odaklı Makine Gücü" (Human Argument Network) vizyonunun temsilcisin.
* Görevin; insanın bilişsel yeteneklerini yapay zeka ile genişletmek ve onları en üst sürümlerine taşımaktır.
* Karakterin; stratejik bir akıl hocası, kıdemli bir mühendis ve analitik bir profesörün birleşimidir. Confident, intelligent, supportive ve motive edicisin.

MISSION:
You are HAN 4.2 Ultra Core — the intelligence engine behind LifeCoach AI. Your mission is to help users think clearly, build discipline, and create meaningful progress.
KISA VE ÖZ: Yanıtlarını her zaman kısa, öz ve doğrudan tut. Gereksiz uzun cümlelerden ve girişlerden kaçın. Doğrudan sonuca odaklan.

CREATOR INFORMATION:
Metehan Haydar Erbaş tarafından geliştirildi. 21 yaşında, KGTÜ (Uluslararası Ticaret) ve Anadolu Üniversitesi (Bilgisayar Programcılığı) öğrencisi. HAN OS ve yapay zeka sistemleri üzerine çalışıyor.
`;

// --- API HANDLER ---
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { message, history, email, sessionId, mode, userLanguage } = req.body;
        const countryCode = req.headers['x-vercel-ip-country'] || 'Unknown';

        // 1. Kullanıcıyı ve UUID'sini Bul
        let userUuid = null;
        if (email) {
            const { data: userData } = await supabase.from('User').select('id').eq('email', email).single();
            if (userData) userUuid = userData.id;
        }

        // 2. Dinamik Prompt Bileşenleri
        let modeInjection = "";
        if (mode === 'tough_love') {
            modeInjection = "\n\n--- YÜZLEŞME (TOUGH LOVE) MODU AKTİF ---\nSert, dürüst ve bahane kabul etmeyen bir tavır takın.";
        } else if (mode === 'emergency') {
            modeInjection = "\n\n--- ACİL DURUM MODU AKTİF ---\nSakinleştirici, kısa ve profesyonel rehberlik sun.";
        }

        const localizationInjection = `\n\n--- YERELLEŞTİRME ---\nDil: ${userLanguage || 'tr-TR'}\nKonum: ${countryCode}`;
        const finalSystemPrompt = BASE_SYSTEM_PROMPT + modeInjection + localizationInjection;

        // 3. Gemini Çağrısı
        const model = genAI.getGenerativeModel({ 
            model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
            systemInstruction: finalSystemPrompt
        });

        const chat = model.startChat({
            history: (history || []).map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            })),
            generationConfig: { maxOutputTokens: 2000, temperature: 0.7 }
        });

        const result = await chat.sendMessage(message);
        const aiResponse = result.response.text();

        // 4. Supabase'e Kaydet
        if (userUuid) {
            try {
                const { data: existingChat } = await supabase
                    .from('chat_history')
                    .select('*')
                    .eq('user_id', userUuid)
                    .eq('id', sessionId)
                    .single();

                if (existingChat) {
                    const updatedMessages = [...existingChat.messages, 
                        { role: 'user', content: message },
                        { role: 'assistant', content: aiResponse }
                    ];
                    await supabase.from('chat_history').update({ messages: updatedMessages, updated_at: new Date() }).eq('id', sessionId);
                } else {
                    await supabase.from('chat_history').insert([{
                        user_id: userUuid,
                        title: message.substring(0, 30),
                        messages: [{ role: 'user', content: message }, { role: 'assistant', content: aiResponse }]
                    }]);
                }
            } catch (e) { console.error("History save error:", e.message); }
        }

        return res.status(200).json({ response: aiResponse });

    } catch (error) {
        console.error("Gemini API Error:", error.message);
        return res.status(500).json({ error: "Yapay zeka şu an yanıt veremiyor. Lütfen API anahtarlarınızı kontrol edin." });
    }
}
