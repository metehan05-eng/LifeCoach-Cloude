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
const studyGroups = {};
const accountabilityPartnerships = {};

export default async function handler(req, res) {
  const user = authenticateToken(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }
  
  const userId = user.id;
  
  // === STUDY GROUPS API ===
  
  // GET /api/social?type=groups - Get user's study groups
  if (req.method === 'GET' && req.query.type === 'groups') {
    try {
      const userGroups = Object.values(studyGroups).filter(g => 
        g.ownerId === userId || g.members.includes(userId)
      );
      
      return res.status(200).json({
        success: true,
        groups: userGroups,
        count: userGroups.length,
        message: 'Çalışma grupları alındı'
      });
    } catch (err) {
      console.error('Groups GET error:', err);
      return res.status(500).json({ error: 'Gruplar alınamadı' });
    }
  }
  
  // POST /api/social?type=groups - Create study group
  if (req.method === 'POST' && req.query.type === 'groups') {
    try {
      const { name, description, subject, isPublic = true } = req.body;
      
      if (!name || !description) {
        return res.status(400).json({ error: 'Adı ve açıklaması gerekli' });
      }
      
      const groupId = Math.random().toString(36).substr(2, 9);
      const newGroup = {
        id: groupId,
        name,
        description,
        subject: subject || 'Genel',
        ownerId: userId,
        members: [userId],
        createdAt: new Date().toISOString(),
        isPublic,
        totalMembers: 1
      };
      
      studyGroups[groupId] = newGroup;
      
      return res.status(201).json({
        success: true,
        message: 'Çalışma grubu oluşturuldu',
        group: newGroup
      });
    } catch (err) {
      console.error('Groups POST error:', err);
      return res.status(500).json({ error: 'Grup oluşturulamadı' });
    }
  }
  
  // POST /api/social?type=groups&action=join - Join group
  if (req.method === 'POST' && req.query.type === 'groups' && req.query.action === 'join') {
    try {
      const { groupId } = req.body;
      
      if (!studyGroups[groupId]) {
        return res.status(404).json({ error: 'Grup bulunamadı' });
      }
      
      const group = studyGroups[groupId];
      if (group.members.includes(userId)) {
        return res.status(400).json({ error: 'Zaten bu grubun üyesisin' });
      }
      
      group.members.push(userId);
      group.totalMembers = group.members.length;
      
      return res.status(200).json({
        success: true,
        message: 'Gruba katıldın',
        group: group
      });
    } catch (err) {
      console.error('Group join error:', err);
      return res.status(500).json({ error: 'Gruba katılamadı' });
    }
  }
  
  // === ACCOUNTABILITY PARTNERS API ===
  
  // GET /api/social?type=partners - Get accountability partners
  if (req.method === 'GET' && req.query.type === 'partners') {
    try {
      const userPartnerships = accountabilityPartnerships[userId] || [];
      
      return res.status(200).json({
        success: true,
        partners: userPartnerships,
        count: userPartnerships.length,
        message: 'Hesap verme partnerleri alındı'
      });
    } catch (err) {
      console.error('Partners GET error:', err);
      return res.status(500).json({ error: 'Partnerler alınamadı' });
    }
  }
  
  // POST /api/social?type=partners - Add accountability partner
  if (req.method === 'POST' && req.query.type === 'partners') {
    try {
      const { partnerId, partnerEmail } = req.body;
      
      if (!partnerId && !partnerEmail) {
        return res.status(400).json({ error: 'Partner ID veya email gerekli' });
      }
      
      if (!accountabilityPartnerships[userId]) {
        accountabilityPartnerships[userId] = [];
      }
      
      // Check if already partners
      const alreadyPartner = accountabilityPartnerships[userId].find(p => p.partnerId === partnerId);
      if (alreadyPartner) {
        return res.status(400).json({ error: 'Zaten hesap verme partnerisin' });
      }
      
      const partnership = {
        id: Math.random().toString(36).substr(2, 9),
        partnerId: partnerId || partnerEmail,
        startedAt: new Date().toISOString(),
        status: 'active',
        sharedGoals: [],
        checkIns: []
      };
      
      accountabilityPartnerships[userId].push(partnership);
      
      // Add reciprocal partnership
      if (!accountabilityPartnerships[partnerId]) {
        accountabilityPartnerships[partnerId] = [];
      }
      accountabilityPartnerships[partnerId].push({
        ...partnership,
        partnerId: userId
      });
      
      return res.status(201).json({
        success: true,
        message: 'Hesap verme partneri eklendi',
        partnership: partnership
      });
    } catch (err) {
      console.error('Partners POST error:', err);
      return res.status(500).json({ error: 'Partner eklenemedi' });
    }
  }
  
  // POST /api/social?type=partners&action=checkin - Weekly check-in
  if (req.method === 'POST' && req.query.type === 'partners' && req.query.action === 'checkin') {
    try {
      const { partnerId, message, progress } = req.body;
      
      if (!userPartnerships[userId]) {
        return res.status(404).json({ error: 'Partnerlik bulunamadı' });
      }
      
      const partnership = accountabilityPartnerships[userId].find(p => p.partnerId === partnerId);
      if (!partnership) {
        return res.status(404).json({ error: 'Partner bulunamadı' });
      }
      
      const checkIn = {
        id: Math.random().toString(36).substr(2, 9),
        from: userId,
        message,
        progress: progress || 0,
        timestamp: new Date().toISOString()
      };
      
      partnership.checkIns.push(checkIn);
      
      return res.status(200).json({
        success: true,
        message: 'Check-in kaydedildi',
        checkIn: checkIn
      });
    } catch (err) {
      console.error('CheckIn error:', err);
      return res.status(500).json({ error: 'Check-in kaydedilemedi' });
    }
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
