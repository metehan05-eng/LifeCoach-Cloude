import OpenAI from 'openai';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { prompt } = req.body;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Sen dünyanın en iyi görsel sanatlar yönetmenisin. Kullanıcıdan gelen kısa resim isteklerini, resim çizme modellerinin (Flux, Midjourney vb.) anlayabileceği, inanılmaz detaylı, sinematik ve sanatsal İngilizce promptlara dönüştür. SADECE promptu döndür, başka hiçbir şey yazma."
        },
        {
          role: "user",
          content: `İstek: ${prompt}\n\nMükemmel görsel tarifi:`
        }
      ],
      model: "llama-3.3-70b-versatile",
    });

    let optimizedPrompt = completion.choices[0].message.content;

    // Temizlik: Tırnakları ve gereksiz "Here is the prompt:" yazılarını temizle
    optimizedPrompt = optimizedPrompt.replace(/["']/g, "").replace(/Prompt:|Recipe:|Görsel Tarifi:/gi, "").trim();

    res.status(200).json({ optimizedPrompt });

  } catch (error) {
    console.error('Groq Magic Error:', error);
    res.status(500).json({ error: 'Sihir yapılamadı :(' });
  }
}
