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

// Basit suggestion engine
function generateSuggestions(input, userContext = {}) {
  const suggestions = [];
  const lowerInput = input.toLowerCase();
  
  // Hedef-based suggestions
  if (lowerInput.includes('hedef') || lowerInput.includes('goal')) {
    suggestions.push({
      type: 'goal',
      title: 'SMART Hedef Oluştur',
      description: 'Özel, Ölçülebilir, Ulaşılabilir, İlgili ve Zamanlı hedef yaz',
      example: '30 gün içinde 3 gün/haftada egzersiz yap'
    });
  }
  
  // Alışkanlık-based suggestions
  if (lowerInput.includes('alışkanlık') || lowerInput.includes('habit')) {
    suggestions.push({
      type: 'habit',
      title: 'Alışkanlık Döngüsü (Cue → Routine → Reward)',
      description: 'Tetik, rutini, ödülü belirle',
      example: 'Uyandığında (Cue) → 10 min egzersiz (Routine) → Kahve (Reward)'
    });
  }
  
  // Stres-based suggestions
  if (lowerInput.includes('stres') || lowerInput.includes('stress') || lowerInput.includes('korku') || lowerInput.includes('kaygı')) {
    suggestions.push({
      type: 'stress',
      title: 'Stres Management Tekniği',
      description: '4-7-8 Nefes Alma Tekniği: 4 saniye tutturunun girenin, 7 saniye tutun, 8 saniye tutturun',
      example: 'Endişeli hissettiğinde bunu deneyin'
    });
  }
  
  // Motivasyon-based suggestions
  if (lowerInput.includes('motivasyon') || lowerInput.includes('motivation') || lowerInput.includes('faydası')) {
    suggestions.push({
      type: 'motivation',
      title: 'Motivasyon Artırıcı Sorular',
      description: 'Kendinize sorun: "Bu neden benim için önemli? Başarısı nasıl görünecek?"',
      example: 'Daha derinlemesine düşünmek motivasyonu artırır'
    });
  }
  
  // Zaman yönetimi
  if (lowerInput.includes('zaman') || lowerInput.includes('time') || lowerInput.includes('planlama') || lowerInput.includes('planning')) {
    suggestions.push({
      type: 'time_management',
      title: 'Pomodoro Tekniği',
      description: '25 min yoğunlaşma + 5 min mola = 1 Pomodoro',
      example: '4 pomodoro çalış, sonra daha uzun bir mola ver'
    });
  }
  
  // Ders çalışma
  if (lowerInput.includes('ders') || lowerInput.includes('study') || lowerInput.includes('sınav')) {
    suggestions.push({
      type: 'study',
      title: 'Spaced Repetition',
      description: 'Aynı materyali zamanlar boyunca tekrar et (Gün 1, Gün 3, Gün 7, Gün 30)',
      example: 'Yeni bir dil veya konsepti öğrenmek için ideal'
    });
  }
  
  // Genel tavsiye
  if (suggestions.length === 0) {
    suggestions.push({
      type: 'general',
      title: 'Başla Küçükten',
      description: 'Büyük hedefleri küçük, yönetilebilir adımlara böl',
      example: '"100 kitap oku" yerine "bu hafta 2 kitap başla"'
    });
  }
  
  return suggestions;
}

export default async function handler(req, res) {
  const user = authenticateToken(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }
  
  // POST /api/suggestions - Get real-time AI suggestions
  if (req.method === 'POST') {
    try {
      const { input, userContext } = req.body;
      
      if (!input || input.trim().length === 0) {
        return res.status(400).json({ error: 'Input metin gerekli' });
      }
      
      // Generate suggestions
      const suggestions = generateSuggestions(input, userContext);
      
      return res.status(200).json({
        success: true,
        suggestions: suggestions,
        count: suggestions.length,
        message: `${suggestions.length} tavsiye üretildi`
      });
    } catch (err) {
      console.error('Suggestions POST error:', err);
      return res.status(500).json({ error: 'Tavsiyeler üretilemedi' });
    }
  }
  
  // GET /api/suggestions?type=habit - Get suggestions by type
  if (req.method === 'GET') {
    try {
      const { type = 'general' } = req.query;
      
      const allSuggestions = {
        goal: {
          title: 'SMART Hedef Oluştur',
          strategies: ['Specific (Spesifik)', 'Measurable (Ölçülebilir)', 'Achievable (Ulaşılabilir)', 'Relevant (İlgili)', 'Time-bound (Zamanlı)']
        },
        habit: {
          title: 'Alışkanlık Oluşturma',
          strategies: ['Tetik tanımla', 'Rutini basit tut', 'Ödülü net belirle', 'Progresif artış', '21+ gün tutarlılık']
        },
        stress: {
          title: 'Stres Yönetimi',
          strategies: ['4-7-8 nefes', 'Meditasyon', 'Egzersiz', 'Yazma', 'Yürüyüş']
        },
        motivation: {
          title: 'Motivasyon Artırma',
          strategies: ['Neden\'i hatırla', 'Küçük kazanımları kutla', 'İlerlemeyi takip et', 'Mentorla ilişki kur']
        },
        general: {
          title: 'Genel Tavsiyeler',
          strategies: ['Başla küçükten', 'Sistematik ol', 'Düzenli ölçüm yap', 'Esnek kal', 'Kendine merhamet göster']
        }
      };
      
      return res.status(200).json({
        success: true,
        suggestion: allSuggestions[type] || allSuggestions['general'],
        availableTypes: Object.keys(allSuggestions)
      });
    } catch (err) {
      console.error('Suggestions GET error:', err);
      return res.status(500).json({ error: 'Tavsiyeler alınamadı' });
    }
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
