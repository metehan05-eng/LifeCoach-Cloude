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

// Simple in-memory store (production'da Prisma kullan)
const conversationMemories = {};

export default async function handler(req, res) {
  const user = authenticateToken(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }
  
  const userId = user.id;
  
  // GET /api/memory - Get user's conversation memory
  if (req.method === 'GET') {
    try {
      // TODO: Prisma'dan al
      // const memory = await prisma.conversationMemory.findFirst({
      //   where: { userId }
      // });
      
      const userMemory = conversationMemories[userId] || {
        contextSummary: '',
        keyPoints: {},
        emotionalState: 'neutral',
        goals: [],
        preferences: {},
        recentTopics: [],
        patterns: {}
      };
      
      return res.status(200).json({
        success: true,
        memory: userMemory,
        message: 'Konuşma hafızası başarıyla alındı'
      });
    } catch (err) {
      console.error('Memory GET error:', err);
      return res.status(500).json({ error: 'Hafıza alınamadı' });
    }
  }
  
  // POST /api/memory - Update conversation memory
  if (req.method === 'POST') {
    try {
      const { contextSummary, keyPoints, emotionalState, goals, preferences, recentTopics, patterns } = req.body;
      
      // Memory'i güncelle
      conversationMemories[userId] = {
        ...conversationMemories[userId],
        contextSummary: contextSummary || conversationMemories[userId]?.contextSummary || '',
        keyPoints: keyPoints || conversationMemories[userId]?.keyPoints || {},
        emotionalState: emotionalState || conversationMemories[userId]?.emotionalState || 'neutral',
        goals: goals || conversationMemories[userId]?.goals || [],
        preferences: preferences || conversationMemories[userId]?.preferences || {},
        recentTopics: recentTopics || conversationMemories[userId]?.recentTopics || [],
        patterns: patterns || conversationMemories[userId]?.patterns || {},
        lastUpdated: new Date()
      };
      
      return res.status(200).json({
        success: true,
        message: 'Konuşma hafızası güncellendi',
        memory: conversationMemories[userId]
      });
    } catch (err) {
      console.error('Memory POST error:', err);
      return res.status(500).json({ error: 'Hafıza güncellenemedi' });
    }
  }
  
  // DELETE /api/memory - Clear memory
  if (req.method === 'DELETE') {
    try {
      delete conversationMemories[userId];
      
      return res.status(200).json({
        success: true,
        message: 'Konuşma hafızası temizlendi'
      });
    } catch (err) {
      console.error('Memory DELETE error:', err);
      return res.status(500).json({ error: 'Hafıza silinemedi' });
    }
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
