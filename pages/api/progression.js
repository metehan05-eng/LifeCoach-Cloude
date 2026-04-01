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
const userStreaks = {};
const motivationScores = {};
const dailyQuests = {};

export default async function handler(req, res) {
  const user = authenticateToken(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }
  
  const userId = user.id;
  
  // === STREAKS API ===
  
  // GET /api/streaks - Get all streaks
  if (req.method === 'GET' && req.query.type === 'streaks') {
    try {
      const streaks = userStreaks[userId] || {};
      return res.status(200).json({
        success: true,
        streaks: streaks,
        message: 'Streaks başarıyla alındı'
      });
    } catch (err) {
      console.error('Streaks GET error:', err);
      return res.status(500).json({ error: 'Streaks alınamadı' });
    }
  }
  
  // POST /api/streaks - Increment streak
  if (req.method === 'POST' && req.query.type === 'streaks') {
    try {
      const { habitId } = req.body;
      
      if (!habitId) {
        return res.status(400).json({ error: 'Habit ID gerekli' });
      }
      
      if (!userStreaks[userId]) {
        userStreaks[userId] = {};
      }
      
      const today = new Date().toISOString().split('T')[0];
      const habitStreak = userStreaks[userId][habitId] || {
        current: 0,
        longest: 0,
        lastCompleted: null
      };
      
      const lastDate = habitStreak.lastCompleted ? new Date(habitStreak.lastCompleted).toISOString().split('T')[0] : null;
      const isConsecutive = lastDate === today ? false : (lastDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]);
      
      if (lastDate === today) {
        return res.status(400).json({ error: 'Bu alışkanlık bugün zaten tamamlandı' });
      }
      
      const newCurrent = isConsecutive ? habitStreak.current + 1 : 1;
      const newLongest = Math.max(newCurrent, habitStreak.longest);
      
      userStreaks[userId][habitId] = {
        current: newCurrent,
        longest: newLongest,
        lastCompleted: new Date().toISOString()
      };
      
      return res.status(200).json({
        success: true,
        message: `Streak güncelendi: ${newCurrent} gün`,
        streak: userStreaks[userId][habitId]
      });
    } catch (err) {
      console.error('Streaks POST error:', err);
      return res.status(500).json({ error: 'Streak güncellenemedi' });
    }
  }
  
  // === MOTIVATION SCORE API ===
  
  // GET /api/streaks?type=motivation - Get motivation score
  if (req.method === 'GET' && req.query.type === 'motivation') {
    try {
      const today = new Date().toISOString().split('T')[0];
      const score = motivationScores[userId]?.[today] || {
        score: 50,
        date: today,
        factors: {},
        trends: []
      };
      
      return res.status(200).json({
        success: true,
        motivationScore: score,
        message: 'Motivasyon skoru alındı'
      });
    } catch (err) {
      console.error('Motivation GET error:', err);
      return res.status(500).json({ error: 'Motivasyon skoru alınamadı' });
    }
  }
  
  // POST /api/streaks?type=motivation - Update motivation score
  if (req.method === 'POST' && req.query.type === 'motivation') {
    try {
      const { score, factors } = req.body;
      
      if (score === undefined || score < 0 || score > 100) {
        return res.status(400).json({ error: 'Skor 0-100 arasında olmalı' });
      }
      
      if (!motivationScores[userId]) {
        motivationScores[userId] = {};
      }
      
      const today = new Date().toISOString().split('T')[0];
      motivationScores[userId][today] = {
        score,
        date: today,
        factors: factors || {},
        timestamp: new Date().toISOString(),
        aiInsights: generateMotivationInsights(score, factors)
      };
      
      return res.status(200).json({
        success: true,
        message: 'Motivasyon skoru güncellendi',
        data: motivationScores[userId][today]
      });
    } catch (err) {
      console.error('Motivation POST error:', err);
      return res.status(500).json({ error: 'Motivasyon skoru güncellenemedi' });
    }
  }
  
  // === DAILY QUESTS API ===
  
  // GET /api/streaks?type=quests - Get daily quests
  if (req.method === 'GET' && req.query.type === 'quests') {
    try {
      const today = new Date().toISOString().split('T')[0];
      const quests = dailyQuests[userId]?.[today] || [];
      
      return res.status(200).json({
        success: true,
        quests: quests,
        message: 'Günlük görevler alındı'
      });
    } catch (err) {
      console.error('Quests GET error:', err);
      return res.status(500).json({ error: 'Görevler alınamadı' });
    }
  }
  
  // POST /api/streaks?type=quests - Create/Complete quest
  if (req.method === 'POST' && req.query.type === 'quests') {
    try {
      const { questId, action } = req.body; // action: 'create' or 'complete'
      
      if (!dailyQuests[userId]) {
        dailyQuests[userId] = {};
      }
      
      const today = new Date().toISOString().split('T')[0];
      if (!dailyQuests[userId][today]) {
        dailyQuests[userId][today] = [];
      }
      
      if (action === 'create') {
        const { title, description, difficulty = 'medium', xpReward = 50 } = req.body;
        
        const newQuest = {
          id: Math.random().toString(36).substr(2, 9),
          title,
          description,
          difficulty,
          xpReward,
          completed: false,
          createdAt: new Date().toISOString()
        };
        
        dailyQuests[userId][today].push(newQuest);
        
        return res.status(201).json({
          success: true,
          message: 'Görev oluşturuldu',
          quest: newQuest
        });
      } else if (action === 'complete') {
        const quest = dailyQuests[userId][today].find(q => q.id === questId);
        if (quest) {
          quest.completed = true;
          quest.completedAt = new Date().toISOString();
          
          return res.status(200).json({
            success: true,
            message: 'Görev tamamlandı',
            xpEarned: quest.xpReward,
            quest: quest
          });
        }
        return res.status(404).json({ error: 'Görev bulunamadı' });
      }
      
      return res.status(400).json({ error: 'Geçersiz action' });
    } catch (err) {
      console.error('Quests POST error:', err);
      return res.status(500).json({ error: 'Görev işlemi başarısız' });
    }
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}

// Helper function for motivation insights
function generateMotivationInsights(score, factors = {}) {
  if (score >= 80) {
    return 'Harika! Motivasyonun çok yüksek. Bu momentumu koru ve hedeflerine doğru ilerle!';
  } else if (score >= 60) {
    return 'İyi gidiyor! Motive kalarak devam et. Küçük kızılını kutla.';
  } else if (score >= 40) {
    return 'Biraz yorgun hissedebilirsin. Kısa bir mola ver, ama verdiğini yada devam etmeye bak.';
  } else {
    return 'Motivasyon düşük. Neden\'i hatırla ve başlangıcını bulmaya çalış. Başla burada.';
  }
}
