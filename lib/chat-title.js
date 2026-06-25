import OpenAI from 'openai';
import { getQwenConfig } from './qwen-api';

export async function generateChatTitle(userMessage, aiReply, dbHistory = []) {
  const config = getQwenConfig();
  if (config.provider === 'mock') {
    const fallback = userMessage?.slice(0, 50) || 'Sohbet';
    return fallback;
  }

  const apiKey = config.apiKey;
  const baseURL = config.baseURL;

  let conversationPreview = '';
  if (dbHistory && dbHistory.length > 0) {
    const lastPairs = dbHistory.slice(-6);
    conversationPreview = lastPairs.map(m =>
      `${m.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${(m.content || '').slice(0, 200)}`
    ).join('\n');
  } else {
    conversationPreview = `Kullanıcı: ${(userMessage || '').slice(0, 300)}\nAsistan: ${(aiReply || '').slice(0, 300)}`;
  }

  const messages = [
    {
      role: 'system',
      content: `Bu bir sohbet başlığı oluşturma asistanıdır. Görevin, bir konuşma özetine bakarak en fazla 5 kelimelik, Türkçe, anlamlı ve açıklayıcı bir başlık üretmektir.

Kurallar:
- Sadece başlık metnini yaz, başka hiçbir şey yazma
- Maksimum 5 kelime, minimum 2 kelime
- Konuşmanın ana konusunu yansıt
- "Sohbet", "Konuşma" gibi genel kelimeler kullanma
- Soru şeklinde değil, düz başlık şeklinde olmalı
- Türkçe olmalı

Örnekler:
- "Haftalık Çalışma Planı"
- "Startup Yatırım Stratejisi"
- "Karar Verememe Sorunu"
- "Kariyer Değişikliği Analizi"
- "Pomodoro Tekniği Uyarlaması"`,
    },
    {
      role: 'user',
      content: `Konuşma:\n${conversationPreview}\n\nBaşlık:`,
    },
  ];

  try {
    const client = new OpenAI({ apiKey, baseURL });
    const completion = await client.chat.completions.create({
      model: 'qwen-flash',
      messages,
      temperature: 0.3,
      max_tokens: 30,
    });
    const title = completion.choices?.[0]?.message?.content?.trim().replace(/^"+|"+$/g, '') || '';
    if (title && title.length <= 60 && title.length >= 4) {
      return title;
    }
    return userMessage?.slice(0, 50) || 'Sohbet';
  } catch (err) {
    console.error('[ChatTitle] Hata:', err.message);
    return userMessage?.slice(0, 50) || 'Sohbet';
  }
}
