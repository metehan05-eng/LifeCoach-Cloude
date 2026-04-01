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

// In-memory stores
const leaderboards = {};
const integrations = {};
const stressLogs = {};
const languagePreferences = {};

// Stress detection keywords (Turkish)
const STRESS_KEYWORDS = ['stres', 'kaygı', 'korku', 'endişe', 'sıkıntı', 'sorun', 'zorluk', 'başaramıyorum'];

export default async function handler(req, res) {
  const user = authenticateToken(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }
  
  const userId = user.id;
  
  // === LEADERBOARDS API ===
  
  // GET /api/advanced?type=leaderboard - Get leaderboard
  if (req.method === 'GET' && req.query.type === 'leaderboard') {
    try {
      const period = req.query.period || 'weekly'; // daily, weekly, monthly
      
      // For now, return mock data
      const leaderboard = [
        { rank: 1, name: 'Ali', xp: 5000, streak: 30 },
        { rank: 2, name: 'Ayşe', xp: 4500, streak: 28 },
        { rank: 3, name: 'Mehmet', xp: 4200, streak: 25 },
        { rank: 4, name: 'Fatima', xp: 3800, streak: 21 }
      ];
      
      return res.status(200).json({
        success: true,
        leaderboard: leaderboard,
        period: period,
        message: 'Leaderboard başarıyla alındı'
      });
    } catch (err) {
      console.error('Leaderboard GET error:', err);
      return res.status(500).json({ error: 'Leaderboard alınamadı' });
    }
  }
  
  // === INTEGRATIONS API ===
  
  // GET /api/advanced?type=integrations - Get connected integrations
  if (req.method === 'GET' && req.query.type === 'integrations') {
    try {
      const userIntegrations = integrations[userId] || [];
      
      return res.status(200).json({
        success: true,
        integrations: userIntegrations,
        availableIntegrations: ['google_calendar', 'todoist', 'spotify', 'notion', 'slack'],
        message: 'Entegrasyonlar alındı'
      });
    } catch (err) {
      console.error('Integrations GET error:', err);
      return res.status(500).json({ error: 'Entegrasyonlar alınamadı' });
    }
  }
  
  // POST /api/advanced?type=integrations - Connect integration
  if (req.method === 'POST' && req.query.type === 'integrations') {
    try {
      const { integrationType, accessToken, refreshToken } = req.body;
      
      if (!integrationType || !accessToken) {
        return res.status(400).json({ error: 'İntegrasyon tipi ve token gerekli' });
      }
      
      if (!integrations[userId]) {
        integrations[userId] = [];
      }
      
      const newIntegration = {
        id: Math.random().toString(36).substr(2, 9),
        type: integrationType,
        accessToken,
        refreshToken: refreshToken || null,
        connectedAt: new Date().toISOString(),
        status: 'active'
      };
      
      integrations[userId].push(newIntegration);
      
      return res.status(201).json({
        success: true,
        message: `${integrationType} entegrasyonu başarıyla bağlandı`,
        integration: newIntegration
      });
    } catch (err) {
      console.error('Integration POST error:', err);
      return res.status(500).json({ error: 'Entegrasyon bağlanamadı' });
    }
  }
  
  // === STRESS DETECTION API ===
  
  // POST /api/advanced?type=stress - Log and detect stress
  if (req.method === 'POST' && req.query.type === 'stress') {
    try {
      const { message, level } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Mesaj gerekli' });
      }
      
      if (!stressLogs[userId]) {
        stressLogs[userId] = [];
      }
      
      // Detect stress from message
      const lowerMessage = message.toLowerCase();
      const stressDetected = STRESS_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
      const calculatedLevel = level || (stressDetected ? Math.random() * 100 : Math.random() * 50);
      
      // Determine triggers
      const triggers = [];
      if (lowerMessage.includes('ders') || lowerMessage.includes('sınav')) triggers.push('akademik');
      if (lowerMessage.includes('ev') || lowerMessage.includes('aile')) triggers.push('kişisel');
      if (lowerMessage.includes('zaman') || lowerMessage.includes('deadline')) triggers.push('zaman_yönetimi');
      
      const stressLog = {
        id: Math.random().toString(36).substr(2, 9),
        level: Math.round(calculatedLevel),
        triggers: triggers.length > 0 ? triggers : ['genel'],
        message: message,
        timestamp: new Date().toISOString(),
        aiAnalysis: generateStressAnalysis(lowerMessage, calculatedLevel),
        recommendations: generateStressRecommendations(triggers)
      };
      
      stressLogs[userId].push(stressLog);
      
      return res.status(201).json({
        success: true,
        stressLog: stressLog,
        stressDetected: stressDetected,
        message: 'Stres seviyesi kaydedildi'
      });
    } catch (err) {
      console.error('Stress detection error:', err);
      return res.status(500).json({ error: 'Stres kaydedilemedi' });
    }
  }
  
  // GET /api/advanced?type=stress - Get stress history
  if (req.method === 'GET' && req.query.type === 'stress') {
    try {
      const history = stressLogs[userId] || [];
      const avgStress = history.length > 0 ? Math.round(history.reduce((sum, log) => sum + log.level, 0) / history.length) : 0;
      
      return res.status(200).json({
        success: true,
        history: history,
        averageStress: avgStress,
        message: 'Stres geçmişi alındı'
      });
    } catch (err) {
      console.error('Stress history error:', err);
      return res.status(500).json({ error: 'Stres geçmişi alınamadı' });
    }
  }
  
  // === MULTI-LANGUAGE API ===
  
  // GET /api/advanced?type=language - Get language preference
  if (req.method === 'GET' && req.query.type === 'language') {
    try {
      const language = languagePreferences[userId] || 'tr';
      
      // Define supported languages
      const supportedLanguages = {
        'tr': { name: 'Türkçe', flag: '🇹🇷' },
        'en': { name: 'English', flag: '🇬🇧' },
        'es': { name: 'Español', flag: '🇪🇸' },
        'fr': { name: 'Français', flag: '🇫🇷' },
        'de': { name: 'Deutsch', flag: '🇩🇪' },
        'ja': { name: '日本語', flag: '🇯🇵' }
      };
      
      return res.status(200).json({
        success: true,
        currentLanguage: language,
        supportedLanguages: supportedLanguages,
        message: 'Dil bilgisi alındı'
      });
    } catch (err) {
      console.error('Language GET error:', err);
      return res.status(500).json({ error: 'Dil bilgisi alınamadı' });
    }
  }
  
  // POST /api/advanced?type=language - Set language preference
  if (req.method === 'POST' && req.query.type === 'language') {
    try {
      const { language } = req.body;
      
      if (!language) {
        return res.status(400).json({ error: 'Dil seçimi gerekli' });
      }
      
      const supportedLangs = ['tr', 'en', 'es', 'fr', 'de', 'ja'];
      if (!supportedLangs.includes(language)) {
        return res.status(400).json({ error: 'Desteklenmeyen dil' });
      }
      
      languagePreferences[userId] = language;
      
      return res.status(200).json({
        success: true,
        message: `Dil ${language} olarak ayarlandı`,
        language: language
      });
    } catch (err) {
      console.error('Language POST error:', err);
      return res.status(500).json({ error: 'Dil ayarlanamadı' });
    }
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}

// Helper functions
function generateStressAnalysis(message, level) {
  if (level > 80) {
    return 'Yüksek stres seviyesi detected. Hemen rahatlama tekniği uygulanması önerilir.';
  } else if (level > 50) {
    return 'Orta düzeyde stres. Biraz hareket ve mola vermeyi dene.';
  }
  return 'Stres seviyed düşük gözüküyor. Durabilirsin!';
}

function generateStressRecommendations(triggers = []) {
  const recommendations = [];
  
  if (triggers.includes('akademik')) {
    recommendations.push('📚 Dersi parçala ve Pomodoro tekniği kullan');
  }
  if (triggers.includes('zaman_yönetimi')) {
    recommendations.push('⏰ Prioriteleri belirle ve zaman bloğu yönetimi yap');
  }
  if (triggers.includes('kişisel')) {
    recommendations.push('🧘 5 dakika meditasyon veya derin nefes al');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('💪 Kendine merhamet göster ve yardım iste');
  }
  
  return recommendations;
}
