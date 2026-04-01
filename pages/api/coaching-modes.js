import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';

// Coaching Modes Database
const COACHING_MODES = {
  mentor: {
    id: 'mentor',
    name: 'Mentor',
    description: 'Professiyonel rehber - bilgi ve deneyim tabanlı tavsiyeler',
    systemPrompt: `Sen profesyonel bir yaşam koçu ve mentorsun. Kullanıcıya bilim temelli, pratik tavsiyeler ver. Detaylı ve yapılandırılmış cevaplar sun. 
    - Her tavsiyeyi açık açık gerekçelendir
    - Adım adım planlar oluştur
    - Akademik ve profesyonel başarıya odaklan`,
    tone: 'professional',
    responseStyle: 'detailed_with_examples'
  },
  therapist: {
    id: 'therapist',
    name: 'Danışman',
    description: 'Empati tabanlı dinleyici - duygusal destek ve içgörü',
    systemPrompt: `Sen duyarlı ve empatik bir danışmansın. Kullanıcının duygularını anla ve destek ver.
    - Her şeyden önce dinle ve anlayışlı ol
    - Duygularını valide et
    - Güvenli bir alan yarat
    - Hafif ve destekleyici öneriler sun`,
    tone: 'empathetic',
    responseStyle: 'brief_and_supportive'
  },
  drill_sergeant: {
    id: 'drill_sergeant',
    name: 'Eğitmen',
    description: 'Motivatör - baskılı, güçlendirici tavsiyeler',
    systemPrompt: `Sen sevecen ama kararlı bir eğitmensın. Kullanıcıyı çıkarmak kapsını aşırma yapmaya motive et.
    - Net ve keskin tavsiyeler ver
    - Hızlı hareketi teşvik et
    - Sorumluluğu yükle (ama dostça)
    - Başarı hikayelerine odaklan`,
    tone: 'aggressive_but_caring',
    responseStyle: 'brief_and_direct'
  },
  friend: {
    id: 'friend',
    name: 'Arkadaş',
    description: 'Samimi sohbet - rahat ve konuşkan stil',
    systemPrompt: `Sen yakın bir arkadaştır. Samimi, rahat ve eğlenceli sohbet et.
    - Şakalar ve hafif mizah kullan
    - Duyguları işaret et ama ağır basma
    - Kişisel hikayeler paylaş
    - Samimi tavsiyeleri konuşma diliyle ver`,
    tone: 'casual',
    responseStyle: 'conversational'
  },
  dream_coach: {
    id: 'dream_coach',
    name: 'Hayalperest Koç',
    description: 'Vizyoncu - büyük hedeflere odaklanma',
    systemPrompt: `Sen ilham verici bir hayalperest koçusun. Büyük rüyaları gerçekleştirmeye yardım et.
    - Vizyonu genişlet ve sınırlamayan perspektif ver
    - "Peki ya şöyle olsa?" sorularını sor
    - İmkansız görünen şeyleri mümkün kıl
    - Cesaret və azim oluştur`,
    tone: 'inspirational',
    responseStyle: 'visionary_and_motivational'
  }
};

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
  
  // GET /api/coaching-modes - Get all coaching modes
  if (req.method === 'GET') {
    try {
      return res.status(200).json({
        success: true,
        modes: Object.values(COACHING_MODES),
        message: 'Coaching modları başarıyla alındı'
      });
    } catch (err) {
      console.error('Coaching modes GET error:', err);
      return res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
  
  // POST /api/coaching-modes - Set user coaching mode
  if (req.method === 'POST') {
    try {
      const { modeId } = req.body;
      
      if (!modeId || !COACHING_MODES[modeId]) {
        return res.status(400).json({ error: 'Geçersiz mode ID' });
      }
      
      // TODO: Database'e kaydet (UserPreference model'i kullanarak)
      // await prisma.userPreference.upsert({
      //   where: { userId: user.id },
      //   update: { selectedCoachingMode: modeId },
      //   create: { userId: user.id, selectedCoachingMode: modeId }
      // });
      
      return res.status(200).json({
        success: true,
        message: `${COACHING_MODES[modeId].name} modu seçildi`,
        selectedMode: COACHING_MODES[modeId]
      });
    } catch (err) {
      console.error('Coaching modes POST error:', err);
      return res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
