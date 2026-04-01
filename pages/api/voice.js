import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';

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

export default async function handler(req, res) {
  const user = authenticateToken(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }
  
  // POST /api/voice/transcribe - Convert audio to text
  if (req.method === 'POST' && req.query.action === 'transcribe') {
    try {
      const { audioBase64, language = 'tr-TR' } = req.body;
      
      if (!audioBase64) {
        return res.status(400).json({ error: 'Ses dosyası gerekli' });
      }
      
      // Web Speech API client-side tarafında yönetilebilir
      // Ama backend'de Google Speech-to-Text ya da başka bir service kullanabilir
      // Şimdilik client hint koduyla cevap dönüyoruz
      
      return res.status(200).json({
        success: true,
        message: 'Ses transkripsiyon başladı',
        transcriptionMethod: 'Web Speech API (client-side) veya Google Speech-to-Text (backend)',
        hint: 'Frontend\'de Web Speech API (browser native) kullanmanız daha hızlı olur'
      });
      
    } catch (err) {
      console.error('Voice transcribe error:', err);
      return res.status(500).json({ error: 'Transcription başarısız' });
    }
  }
  
  // POST /api/voice/synthesize - Convert text to speech
  if (req.method === 'POST' && req.query.action === 'synthesize') {
    try {
      const { text, language = 'tr-TR', rate = 1, pitch = 1 } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Metin gerekli' });
      }
      
      // Web Speech API veya Google Text-to-Speech kullanılabilir
      return res.status(200).json({
        success: true,
        message: 'Sesli metin oluşturma başladı',
        data: {
          text,
          language,
          rate: parseFloat(rate),
          pitch: parseFloat(pitch),
          audioUrl: null // Client-side synthesis için
        },
        hint: 'Frontend\'de Web Speech API (SpeechSynthesis) kullanmanız daha hızlı olur'
      });
      
    } catch (err) {
      console.error('Voice synthesize error:', err);
      return res.status(500).json({ error: 'Text-to-speech başarısız' });
    }
  }
  
  // GET /api/voice/preferences - Get user voice preferences
  if (req.method === 'GET') {
    try {
      // TODO: Database'den kullanıcı sesine ilişkin ayarları getir
      // const preferences = await prisma.userPreference.findUnique({
      //   where: { userId: user.id }
      // });
      
      return res.status(200).json({
        success: true,
        preferences: {
          voiceInputEnabled: true,
          voiceOutputEnabled: true,
          language: 'tr-TR',
          speechRate: 1,
          pitch: 1,
          volume: 1,
          preferredVoice: 'default'
        }
      });
    } catch (err) {
      console.error('Voice preferences GET error:', err);
      return res.status(500).json({ error: 'Preferences alınamadı' });
    }
  }
  
  // POST /api/voice/preferences - Update voice preferences
  if (req.method === 'POST') {
    try {
      const { voiceInputEnabled, voiceOutputEnabled, language, speechRate, pitch } = req.body;
      
      // TODO: Database'e kaydet
      // await prisma.userPreference.upsert({
      //   where: { userId: user.id },
      //   update: {
      //     enableVoiceInput: voiceInputEnabled,
      //     enableVoiceOutput: voiceOutputEnabled,
      //     language
      //   },
      //   create: { userId: user.id, enableVoiceInput: voiceInputEnabled, enableVoiceOutput: voiceOutputEnabled, language }
      // });
      
      return res.status(200).json({
        success: true,
        message: 'Ses ayarları güncellendi',
        updated: {
          voiceInputEnabled,
          voiceOutputEnabled,
          language,
          speechRate,
          pitch
        }
      });
    } catch (err) {
      console.error('Voice preferences POST error:', err);
      return res.status(500).json({ error: 'Ayarlar güncellenemedi' });
    }
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
