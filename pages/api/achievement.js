import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';

// Predefined achievements
const AVAILABLE_ACHIEVEMENTS = [
  // Streak-based
  { id: 'streak7', title: '🔥 Haftalık Kazanç', description: '7 gün streak', points: 100, category: 'streak' },
  { id: 'streak30', title: '🌟 Aylık Efsane', description: '30 gün streak', points: 500, category: 'streak' },
  { id: 'streak100', title: '💎 Yüzyıl Savaşçısı', description: '100 gün streak', points: 2000, category: 'streak' },
  
  // Habit-based
  { id: 'habit5', title: '👥 Alışkanlık Üreticisi', description: '5 alışkanlık oluştur', points: 250, category: 'habit' },
  { id: 'habit_master', title: '🏆 Alışkanlık Ustası', description: '10 alışkanlık oluştur', points: 1000, category: 'habit' },
  
  // Goal-based
  { id: 'goal1', title: '🎯 Hedef Belirleyen', description: '1. hedef oluştur', points: 50, category: 'goal' },
  { id: 'goal5', title: '🚀 Hayalci', description: '5 hedef oluştur', points: 300, category: 'goal' },
  { id: 'goal_achieved', title: '✨ Başarı Kutlaması', description: '1 hedef tamamla', points: 400, category: 'goal' },
  
  // Social-based
  { id: 'share1', title: '📢 Paylaşıcı', description: 'İlk paylaşım yap', points: 100, category: 'social' },
  { id: 'partner', title: '🤝 Hesap Verme Partneri', description: 'Accountability partner bul', points: 200, category: 'social' },
  { id: 'group', title: '👨‍👩‍👧‍👦 Grup Lideri', description: 'Çalışma grubu oluştur', points: 300, category: 'social' },
  
  // Engagement-based
  { id: 'chat50', title: '💬 Sohbetçi', description: '50 sohbet mesajı', points: 150, category: 'engagement' },
  { id: 'daily_login7', title: '⏰ Konsistent Katılımcı', description: '7 gün art arda login', points: 200, category: 'engagement' }
];

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

// In-memory store (production'da Prisma kullan)
const userAchievements = {};

export default async function handler(req, res) {
  const user = authenticateToken(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }
  
  const userId = user.id;
  
  // GET /api/achievements - Get user achievements
  if (req.method === 'GET') {
    try {
      const achievements = userAchievements[userId] || [];
      const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0);
      
      return res.status(200).json({
        success: true,
        achievements: achievements,
        totalPoints: totalPoints,
        totalCount: achievements.length,
        message: 'Başarılar başarıyla alındı'
      });
    } catch (err) {
      console.error('Achievements GET error:', err);
      return res.status(500).json({ error: 'Başarılar alınamadı' });
    }
  }
  
  // POST /api/achievements - Unlock achievement
  if (req.method === 'POST') {
    try {
      const { achievementId } = req.body;
      
      if (!achievementId) {
        return res.status(400).json({ error: 'Achievement ID gerekli' });
      }
      
      const achievementDef = AVAILABLE_ACHIEVEMENTS.find(a => a.id === achievementId);
      
      if (!achievementDef) {
        return res.status(404).json({ error: 'Achievement bulunamadı' });
      }
      
      // Check if already unlocked
      if (!userAchievements[userId]) {
        userAchievements[userId] = [];
      }
      
      const alreadyUnlocked = userAchievements[userId].find(a => a.id === achievementId);
      if (alreadyUnlocked) {
        return res.status(400).json({ error: 'Bu başarı zaten açıldı' });
      }
      
      // Unlock achievement
      const newAchievement = {
        ...achievementDef,
        unlockedAt: new Date()
      };
      
      userAchievements[userId].push(newAchievement);
      
      return res.status(200).json({
        success: true,
        message: `Başarı açıldı: ${achievementDef.title}`,
        achievement: newAchievement,
        pointsEarned: achievementDef.points
      });
    } catch (err) {
      console.error('Achievements POST error:', err);
      return res.status(500).json({ error: 'Başarı açılamadı' });
    }
  }
  
  // GET /api/achievements/available - Get all available achievements
  if (req.method === 'GET' && req.query.type === 'available') {
    try {
      const userAchievementIds = (userAchievements[userId] || []).map(a => a.id);
      const locked = AVAILABLE_ACHIEVEMENTS.filter(a => !userAchievementIds.includes(a.id));
      const unlocked = AVAILABLE_ACHIEVEMENTS.filter(a => userAchievementIds.includes(a.id));
      
      return res.status(200).json({
        success: true,
        available: {
          unlocked: unlocked,
          locked: locked,
          progress: `${unlocked.length}/${AVAILABLE_ACHIEVEMENTS.length} Başarı Açıldı`
        }
      });
    } catch (err) {
      console.error('Available achievements error:', err);
      return res.status(500).json({ error: 'Başarılar alınamadı' });
    }
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
