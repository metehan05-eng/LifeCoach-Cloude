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
const challenges = {};
const analyticsLogs = {};

export default async function handler(req, res) {
  const user = authenticateToken(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }
  
  const userId = user.id;
  
  // === CHALLENGES API ===
  
  // GET /api/challenges - Get all challenges
  if (req.method === 'GET' && !req.query.type) {
    try {
      const userChallenges = Object.values(challenges).filter(c => c.creatorId === userId);
      const activeChallenges = userChallenges.filter(c => !c.isCompleted);
      
      return res.status(200).json({
        success: true,
        challenges: userChallenges,
        activeCount: activeChallenges.length,
        message: 'Challengeler alındı'
      });
    } catch (err) {
      console.error('Challenges GET error:', err);
      return res.status(500).json({ error: 'Challengeler alınamadı' });
    }
  }
  
  // POST /api/challenges - Create challenge
  if (req.method === 'POST' && !req.query.type) {
    try {
      const { title, description, type = 'personal', duration = 30, targetValue = 30, difficulty = 'medium' } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ error: 'Başlık ve açıklama gerekli' });
      }
      
      const challengeId = Math.random().toString(36).substr(2, 9);
      const daysToAdd = duration;
      const endsAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);
      
      const newChallenge = {
        id: challengeId,
        title,
        description,
        type,
        duration,
        targetValue,
        currentValue: 0,
        creatorId: userId,
        startedAt: new Date().toISOString(),
        endsAt: endsAt.toISOString(),
        difficulty,
        xpReward: difficulty === 'hard' ? 500 : difficulty === 'medium' ? 300 : 100,
        isCompleted: false
      };
      
      challenges[challengeId] = newChallenge;
      
      return res.status(201).json({
        success: true,
        message: 'Challenge oluşturuldu',
        challenge: newChallenge
      });
    } catch (err) {
      console.error('Challenge POST error:', err);
      return res.status(500).json({ error: 'Challenge oluşturulamadı' });
    }
  }
  
  // POST /api/challenges?action=progress - Update challenge progress
  if (req.method === 'POST' && req.query.action === 'progress') {
    try {
      const { challengeId, value } = req.body;
      
      if (!challenges[challengeId]) {
        return res.status(404).json({ error: 'Challenge bulunamadı' });
      }
      
      const challenge = challenges[challengeId];
      challenge.currentValue += value || 1;
      
      if (challenge.currentValue >= challenge.targetValue) {
        challenge.isCompleted = true;
      }
      
      return res.status(200).json({
        success: true,
        message: 'Challenge ilerleme güncellendi',
        challenge: challenge,
        progress: `${challenge.currentValue}/${challenge.targetValue}`
      });
    } catch (err) {
      console.error('Challenge progress error:', err);
      return res.status(500).json({ error: 'İlerleme güncellenemedi' });
    }
  }
  
  // === ANALYTICS API ===
  
  // GET /api/challenges?type=analytics - Get analytics
  if (req.method === 'GET' && req.query.type === 'analytics') {
    try {
      const userLogs = analyticsLogs[userId] || [];
      
      // Process logs into analytics
      const analytics = {
        totalEvents: userLogs.length,
        eventsByType: {},
        timeline: [],
        trends: {}
      };
      
      userLogs.forEach(log => {
        analytics.eventsByType[log.event] = (analytics.eventsByType[log.event] || 0) + 1;
      });
      
      return res.status(200).json({
        success: true,
        analytics: analytics,
        message: 'Analytics alındı'
      });
    } catch (err) {
      console.error('Analytics GET error:', err);
      return res.status(500).json({ error: 'Analytics alınamadı' });
    }
  }
  
  // POST /api/challenges?type=analytics - Log event
  if (req.method === 'POST' && req.query.type === 'analytics') {
    try {
      const { event, metadata = {} } = req.body;
      
      if (!event) {
        return res.status(400).json({ error: 'Event tipi gerekli' });
      }
      
      if (!analyticsLogs[userId]) {
        analyticsLogs[userId] = [];
      }
      
      const logEntry = {
        id: Math.random().toString(36).substr(2, 9),
        event,
        metadata,
        timestamp: new Date().toISOString()
      };
      
      analyticsLogs[userId].push(logEntry);
      
      // Keep only last 1000 logs
      if (analyticsLogs[userId].length > 1000) {
        analyticsLogs[userId] = analyticsLogs[userId].slice(-1000);
      }
      
      return res.status(201).json({
        success: true,
        message: 'Event kaydedildi',
        logEntry: logEntry
      });
    } catch (err) {
      console.error('Analytics POST error:', err);
      return res.status(500).json({ error: 'Event kaydedilemedi' });
    }
  }
  
  // GET /api/challenges?type=analytics&report=weekly - Get weekly report
  if (req.method === 'GET' && req.query.type === 'analytics' && req.query.report === 'weekly') {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const userLogs = analyticsLogs[userId] || [];
      const weeklyLogs = userLogs.filter(log => new Date(log.timestamp) > oneWeekAgo);
      
      return res.status(200).json({
        success: true,
        weeklyReport: {
          period: 'Last 7 days',
          totalEvents: weeklyLogs.length,
          eventsByType: weeklyLogs.reduce((acc, log) => {
            acc[log.event] = (acc[log.event] || 0) + 1;
            return acc;
          }, {}),
          dataPoints: weeklyLogs
        }
      });
    } catch (err) {
      console.error('Weekly report error:', err);
      return res.status(500).json({ error: 'Rapor alınamadı' });
    }
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
