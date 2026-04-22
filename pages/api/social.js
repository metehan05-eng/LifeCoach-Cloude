import jwt from 'jsonwebtoken';
import { prismaClient } from '@/lib/prisma';

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
const groupMessages = {};
const groupMembers = {};
const directMessages = {};
const sentFiles = {};
const receivedFiles = {};

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
      const userGroups = Object.values(studyGroups).map(g => {
        const isOwner = g.ownerId === userId;
        const isMember = g.members.includes(userId);
        
        // Hide password for private groups unless the requester is a member or owner
        const visiblePassword = (g.isPublic || isOwner || isMember) ? g.password : '****';
        
        return {
          ...g,
          password: visiblePassword,
          joinCode: visiblePassword // Keep UI fields consistent
        };
      });
      
      return res.status(200).json({
        success: true,
        groups: userGroups,
        count: userGroups.length,
        message: 'Gruplar alındı'
      });
    } catch (err) {
      console.error('Groups GET error:', err);
      return res.status(500).json({ error: 'Gruplar alınamadı' });
    }
  }
  
  // POST /api/social?type=groups - Create study group
  if (req.method === 'POST' && req.query.type === 'groups') {
    try {
      const { name, description, subject, isPublic = true, password } = req.body;
      
      if (!name || !description) {
        return res.status(400).json({ error: 'Adı ve açıklaması gerekli' });
      }
      
      // Auto-generate a 4-digit join code/password if not provided
      const joinCode = password || Math.floor(1000 + Math.random() * 9000).toString();
      
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
        password: joinCode, // 4-digit password
        joinCode: joinCode, // UI shows this as join code
        totalMembers: 1,
        channels: [
          { id: 'genel', name: 'genel', type: 'text' },
          { id: 'yardim', name: 'yardımlaşma', type: 'text' },
          { id: 'sesli', name: 'Sesli Çalışma', type: 'voice' }
        ]
      };
      
      studyGroups[groupId] = newGroup;
      
      return res.status(201).json({
        success: true,
        message: 'Çalışma grubu oluşturuldu',
        group: { ...newGroup, password: joinCode } // Show password on creation
      });
    } catch (err) {
      console.error('Groups POST error:', err);
      return res.status(500).json({ error: 'Grup oluşturulamadı' });
    }
  }
  
  // POST /api/social?type=groups&action=join - Join group
  if (req.method === 'POST' && req.query.type === 'groups' && req.query.action === 'join') {
    try {
      const { groupId, password } = req.body;
      
      if (!studyGroups[groupId]) {
        return res.status(404).json({ error: 'Grup bulunamadı' });
      }
      
      const group = studyGroups[groupId];
      
      // Password check for private groups
      if (!group.isPublic && group.password !== password) {
        return res.status(403).json({ error: 'Özel grup için geçerli bir şifre (4 hane) gerekli' });
      }

      if (group.members.includes(userId)) {
        return res.status(400).json({ error: 'Zaten bu grubun üyesisin' });
      }
      
      group.members.push(userId);
      group.totalMembers = group.members.length;
      
      return res.status(200).json({
        success: true,
        message: 'Gruba katıldın',
        group: { ...group, password: group.isPublic ? group.password : '****' }
      });
    } catch (err) {
      console.error('Group join error:', err);
      return res.status(500).json({ error: 'Gruba katılamadı' });
    }
  }
  
  // POST /api/social?type=groups&action=joinByCode - Join group by 4-digit code
  if (req.method === 'POST' && req.query.type === 'groups' && req.query.action === 'joinByCode') {
    try {
      const { joinCode } = req.body;
      const group = Object.values(studyGroups).find(g => g.joinCode === joinCode);
      
      if (!group) {
        return res.status(404).json({ error: 'Grup bulunamadı' });
      }
      
      if (group.members.includes(userId)) {
        return res.status(200).json({ success: true, message: 'Zaten üyesiniz', groupId: group.id });
      }
      
      group.members.push(userId);
      group.totalMembers = group.members.length;
      
      return res.status(200).json({
        success: true,
        message: 'Kod doğrulandı ve gruba katıldınız',
        groupId: group.id
      });
    } catch (err) {
      console.error('JoinByCode error:', err);
      return res.status(500).json({ error: 'İşlem başarısız' });
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
      
      if (!accountabilityPartnerships[userId]) {
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

  // ===== GROUP MANAGEMENT ENDPOINTS =====

  // GET /api/social?type=groups&id=groupId - Get specific group details
  if (req.method === 'GET' && req.query.type === 'groups' && req.query.id) {
    try {
      const groupId = req.query.id;
      const group = studyGroups[groupId];
      
      if (!group) {
        return res.status(404).json({ error: 'Grup bulunamadı' });
      }
      
      const isOwner = group.ownerId === userId;
      const isMember = group.members.includes(userId);

      // Require password for private groups even for members (per user request)
      if (!group.isPublic && !isOwner) {
        const providedPassword = req.headers['x-group-password'] || req.query.password;
        if (providedPassword !== group.password) {
          return res.status(403).json({ error: 'Özel grup şifresi gerekli', passwordRequired: true });
        }
      }
      
      if (!isMember && !isOwner) {
        return res.status(403).json({ error: 'Bu gruba erişim izni yok' });
      }
      
      return res.status(200).json({
        success: true,
        group: group,
        isMember: group.members.includes(userId),
        isOwner: group.ownerId === userId
      });
    } catch (err) {
      console.error('Group GET details error:', err);
      return res.status(500).json({ error: 'Grup detayları alınamadı' });
    }
  }

  // PUT /api/social?type=groups&id=groupId - Update group details
  if (req.method === 'PUT' && req.query.type === 'groups' && req.query.id) {
    try {
      const groupId = req.query.id;
      const group = studyGroups[groupId];
      
      if (!group) {
        return res.status(404).json({ error: 'Grup bulunamadı' });
      }
      
      if (group.ownerId !== userId) {
        return res.status(403).json({ error: 'Sadece grup sahibi düzenleyebilir' });
      }
      
      const { name, description, subject, isPublic } = req.body;
      
      if (name) group.name = name;
      if (description) group.description = description;
      if (subject) group.subject = subject;
      if (isPublic !== undefined) group.isPublic = isPublic;
      group.updatedAt = new Date().toISOString();
      
      return res.status(200).json({
        success: true,
        message: 'Grup başarıyla güncellendi',
        group: group
      });
    } catch (err) {
      console.error('Group PUT error:', err);
      return res.status(500).json({ error: 'Grup güncellenemedi' });
    }
  }

  // DELETE /api/social?type=groups&id=groupId - Delete group
  if (req.method === 'DELETE' && req.query.type === 'groups' && req.query.id) {
    try {
      const groupId = req.query.id;
      const group = studyGroups[groupId];
      
      if (!group) {
        return res.status(404).json({ error: 'Grup bulunamadı' });
      }
      
      if (group.ownerId !== userId) {
        return res.status(403).json({ error: 'Sadece grup sahibi silebilir' });
      }
      
      delete studyGroups[groupId];
      if (groupMessages[groupId]) delete groupMessages[groupId];
      if (groupMembers[groupId]) delete groupMembers[groupId];
      
      return res.status(200).json({
        success: true,
        message: 'Grup silindi'
      });
    } catch (err) {
      console.error('Group DELETE error:', err);
      return res.status(500).json({ error: 'Grup silinemedi' });
    }
  }

  // PATCH /api/social?type=groups&id=groupId&action=removeMember - Remove member from group
  if (req.method === 'PATCH' && req.query.type === 'groups' && req.query.id && req.query.action === 'removeMember') {
    try {
      const groupId = req.query.id;
      const { memberId } = req.body;
      const group = studyGroups[groupId];
      
      if (!group) {
        return res.status(404).json({ error: 'Grup bulunamadı' });
      }
      
      if (group.ownerId !== userId && memberId !== userId) {
        return res.status(403).json({ error: 'Üyeyi çıkarma izni yok' });
      }
      
      const index = group.members.indexOf(memberId);
      if (index > -1) {
        group.members.splice(index, 1);
        group.totalMembers = group.members.length;
      }
      
      return res.status(200).json({
        success: true,
        message: 'Üye gruptan çıkarıldı',
        group: group
      });
    } catch (err) {
      console.error('Member removal error:', err);
      return res.status(500).json({ error: 'Üye çıkarılamadı' });
    }
  }

  // ===== GROUP MESSAGING ENDPOINTS =====

  // POST /api/social?type=groups&id=groupId&action=message - Send message to group
  if (req.method === 'POST' && req.query.type === 'groups' && req.query.id && req.query.action === 'message') {
    try {
      const groupId = req.query.id;
      const group = studyGroups[groupId];
      
      if (!group) {
        return res.status(404).json({ error: 'Grup bulunamadı' });
      }
      
      if (!group.members.includes(userId)) {
        return res.status(403).json({ error: 'Sadece grup üyeleri mesaj gönderebilir' });
      }
      
      const { content, messageType = 'text', attachment = null } = req.body;
      
      if (!content && !attachment) {
        return res.status(400).json({ error: 'Mesaj içeriği veya dosya gerekli' });
      }
      
      if (!groupMessages[groupId]) {
        groupMessages[groupId] = [];
      }
      
      const message = {
        id: Math.random().toString(36).substr(2, 9),
        senderId: userId,
        content,
        messageType: attachment ? (attachment.type?.startsWith('image/') ? 'image' : 'document') : messageType,
        timestamp: new Date().toISOString(),
        attachment, // Store attachment data
        reactions: {}
      };
      
      groupMessages[groupId].push(message);
      
      return res.status(201).json({
        success: true,
        message: 'Mesaj gönderildi',
        data: message
      });
    } catch (err) {
      console.error('Message POST error:', err);
      return res.status(500).json({ error: 'Mesaj gönderilemedi' });
    }
  }

  // GET /api/social?type=groups&id=groupId&action=messages - Get group messages
  if (req.method === 'GET' && req.query.type === 'groups' && req.query.id && req.query.action === 'messages') {
    try {
      const groupId = req.query.id;
      const group = studyGroups[groupId];
      
      if (!group) {
        return res.status(404).json({ error: 'Grup bulunamadı' });
      }
      
      if (!group.members.includes(userId)) {
        return res.status(403).json({ error: 'Sadece grup üyeleri mesajları görebilir' });
      }
      
      const messages = groupMessages[groupId] || [];
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      
      return res.status(200).json({
        success: true,
        messages: messages.slice(-limit),
        count: messages.length
      });
    } catch (err) {
      console.error('Messages GET error:', err);
      return res.status(500).json({ error: 'Mesajlar alınamadı' });
    }
  }

  // POST /api/social?type=groups&id=groupId&action=leave - Leave group
  if (req.method === 'POST' && req.query.type === 'groups' && req.query.id && req.query.action === 'leave') {
    try {
      const groupId = req.query.id;
      const group = studyGroups[groupId];
      
      if (!group) {
        return res.status(404).json({ error: 'Grup bulunamadı' });
      }
      
      if (group.ownerId === userId) {
        return res.status(400).json({ error: 'Grup sahibi grubu terk edemez. Grubu silmek istiyorsanız silebilirsiniz' });
      }
      
      const index = group.members.indexOf(userId);
      if (index > -1) {
        group.members.splice(index, 1);
        group.totalMembers = group.members.length;
      }
      
      return res.status(200).json({
        success: true,
        message: 'Gruptan ayrıldın'
      });
    } catch (err) {
      console.error('Leave group error:', err);
      return res.status(500).json({ error: 'Gruppadan ayrılamadı' });
    }
  }

  // === DIRECT MESSAGES (1-on-1 Chat) API ===

  // GET /api/social?type=messages&partnerId=xxx - Get direct messages with a partner
  if (req.method === 'GET' && req.query.type === 'messages' && req.query.partnerId) {
    try {
      const partnerId = req.query.partnerId;
      const conversationKey = [userId, partnerId].sort().join('_');
      const messages = directMessages[conversationKey] || [];
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;

      return res.status(200).json({
        success: true,
        messages: messages.slice(-limit),
        count: messages.length,
        conversationKey
      });
    } catch (err) {
      console.error('Direct messages GET error:', err);
      return res.status(500).json({ error: 'Mesajlar alınamadı' });
    }
  }

  // GET /api/social?type=conversations - Get all conversations
  if (req.method === 'GET' && req.query.type === 'conversations') {
    try {
      const conversationsMap = new Map();

      // Get conversations from directMessages (in-memory)
      Object.keys(directMessages).forEach(key => {
        const [id1, id2] = key.split('_');
        const partnerId = id1 === userId ? id2 : id1;
        
        if (!conversationsMap.has(partnerId)) {
          const messages = directMessages[key] || [];
          const lastMessage = messages[messages.length - 1];
          const unreadCount = messages.filter(m => 
            m.senderId === partnerId && !m.readAt
          ).length;

          conversationsMap.set(partnerId, {
            partnerId,
            partnerName: null,
            lastMessage: lastMessage ? {
              content: lastMessage.content,
              type: lastMessage.type,
              timestamp: lastMessage.timestamp,
              isMine: lastMessage.senderId === userId
            } : null,
            unreadCount,
            updatedAt: lastMessage ? lastMessage.timestamp : null
          });
        }
      });

      // Get partners from Prisma database
      const dbPartners = await prismaClient.accountabilityPartner.findMany({
        where: { userId: userId },
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      });

      dbPartners.forEach(p => {
        if (!conversationsMap.has(p.partnerId)) {
          conversationsMap.set(p.partnerId, {
            partnerId: p.partner.id,
            partnerName: p.partner.name || p.partner.email?.split('@')[0] || 'Kullanıcı',
            partnerEmail: p.partner.email,
            partnerImage: p.partner.image,
            lastMessage: null,
            unreadCount: 0,
            updatedAt: null
          });
        } else {
          // Update partner name if we have it from database
          const conv = conversationsMap.get(p.partnerId);
          conv.partnerName = p.partner.name || p.partner.email?.split('@')[0] || 'Kullanıcı';
          conv.partnerEmail = p.partner.email;
          conv.partnerImage = p.partner.image;
        }
      });

      // Convert to array and sort
      let conversations = Array.from(conversationsMap.values());
      conversations.sort((a, b) => {
        if (!a.updatedAt) return 1;
        if (!b.updatedAt) return -1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });

      return res.status(200).json({
        success: true,
        conversations,
        count: conversations.length
      });
    } catch (err) {
      console.error('Conversations GET error:', err);
      return res.status(500).json({ error: 'Konuşmalar alınamadı' });
    }
  }

  // POST /api/social?type=partners - Add/create accountability partner
  if (req.method === 'POST' && req.query.type === 'partners') {
    try {
      const { partnerId } = req.body;
      
      if (!partnerId) {
        return res.status(400).json({ error: 'Partner ID gerekli' });
      }

      if (partnerId === userId) {
        return res.status(400).json({ error: 'Kendini partner olarak ekleyemezsin' });
      }

      // Check if partnership already exists
      const existingPartner = await prismaClient.accountabilityPartner.findFirst({
        where: {
          userId: userId,
          partnerId: partnerId
        }
      });

      if (existingPartner) {
        return res.status(400).json({ error: 'Bu kullanıcı zaten partneriniz' });
      }

      // Get partner info from database
      const partnerUser = await prismaClient.user.findUnique({
        where: { id: partnerId },
        select: { id: true, name: true, email: true, image: true }
      });

      if (!partnerUser) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }

      // Create partnership in both directions
      const partnership = await prismaClient.accountabilityPartner.create({
        data: {
          userId: userId,
          partnerId: partnerId,
          status: 'active'
        }
      });

      // Also create reverse partnership
      await prismaClient.accountabilityPartner.create({
        data: {
          userId: partnerId,
          partnerId: userId,
          status: 'active'
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Partner eklendi',
        partnership: {
          id: partnership.id,
          partnerId: partnerUser.id,
          partnerName: partnerUser.name || partnerUser.email?.split('@')[0] || 'Kullanıcı',
          partnerEmail: partnerUser.email,
          partnerImage: partnerUser.image,
          startedAt: partnership.startedAt,
          status: 'active'
        }
      });
    } catch (err) {
      console.error('Add partner error:', err);
      return res.status(500).json({ error: 'Partner eklenemedi' });
    }
  }

  // GET /api/social?type=partners - Get accountability partners
  if (req.method === 'GET' && req.query.type === 'partners') {
    try {
      const dbPartners = await prismaClient.accountabilityPartner.findMany({
        where: { userId: userId },
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        },
        orderBy: { startedAt: 'desc' }
      });

      const partners = dbPartners.map(p => ({
        id: p.id,
        partnerId: p.partner.id,
        partnerName: p.partner.name || p.partner.email?.split('@')[0] || 'Kullanıcı',
        partnerEmail: p.partner.email,
        partnerImage: p.partner.image,
        startedAt: p.startedAt,
        status: p.status
      }));

      return res.status(200).json({
        success: true,
        partners,
        count: partners.length
      });
    } catch (err) {
      console.error('Get partners error:', err);
      return res.status(500).json({ error: 'Partnerlar alınamadı' });
    }
  }

  // POST /api/social?type=messages - Send direct message
  if (req.method === 'POST' && req.query.type === 'messages') {
    try {
      const { partnerId, content, messageType = 'text', fileData, fileName, fileType } = req.body;

      if (!partnerId || !content) {
        return res.status(400).json({ error: 'Partner ID ve içerik gerekli' });
      }

      const conversationKey = [userId, partnerId].sort().join('_');
      
      if (!directMessages[conversationKey]) {
        directMessages[conversationKey] = [];
      }

      const message = {
        id: Math.random().toString(36).substr(2, 9),
        senderId: userId,
        recipientId: partnerId,
        content,
        type: messageType,
        timestamp: new Date().toISOString(),
        readAt: null,
        fileData: fileData || null,
        fileName: fileName || null,
        fileType: fileType || null
      };

      directMessages[conversationKey].push(message);

      // If there's a file, save to sent files
      if (fileData && fileName) {
        if (!sentFiles[userId]) sentFiles[userId] = [];
        sentFiles[userId].push({
          id: message.id,
          fileName,
          fileType,
          fileData,
          sentTo: partnerId,
          timestamp: message.timestamp
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Mesaj gönderildi',
        data: message
      });
    } catch (err) {
      console.error('Direct message POST error:', err);
      return res.status(500).json({ error: 'Mesaj gönderilemedi' });
    }
  }

  // POST /api/social?type=messages&action=markRead - Mark messages as read
  if (req.method === 'POST' && req.query.type === 'messages' && req.query.action === 'markRead') {
    try {
      const { partnerId } = req.body;
      const conversationKey = [userId, partnerId].sort().join('_');
      const messages = directMessages[conversationKey] || [];

      messages.forEach(m => {
        if (m.senderId === partnerId && !m.readAt) {
          m.readAt = new Date().toISOString();
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Okundu işaretlendi'
      });
    } catch (err) {
      console.error('Mark read error:', err);
      return res.status(500).json({ error: 'Hata oluştu' });
    }
  }

  // GET /api/social?type=files - Get sent and received files
  if (req.method === 'GET' && req.query.type === 'files') {
    try {
      const sent = sentFiles[userId] || [];
      const received = receivedFiles[userId] || [];

      return res.status(200).json({
        success: true,
        sent,
        received,
        totalSent: sent.length,
        totalReceived: received.length
      });
    } catch (err) {
      console.error('Files GET error:', err);
      return res.status(500).json({ error: 'Dosyalar alınamadı' });
    }
  }

  // DELETE /api/social?type=files - Delete a file
  if (req.method === 'DELETE' && req.query.type === 'files') {
    try {
      const { fileId } = req.body;
      
      // Remove from sent
      if (sentFiles[userId]) {
        sentFiles[userId] = sentFiles[userId].filter(f => f.id !== fileId);
      }
      
      // Remove from received
      if (receivedFiles[userId]) {
        receivedFiles[userId] = receivedFiles[userId].filter(f => f.id !== fileId);
      }

      return res.status(200).json({
        success: true,
        message: 'Dosya silindi'
      });
    } catch (err) {
      console.error('File delete error:', err);
      return res.status(500).json({ error: 'Dosya silinemedi' });
    }
  }

  // POST /api/social?type=ai-suggestion - Get AI message suggestion
  if (req.method === 'POST' && req.query.type === 'ai-suggestion') {
    // Fast fallback suggestions (no AI delay)
    const fastSuggestions = [
      { text: "Teşekkürler, sen nasılsın?", mood: "friendly" },
      { text: "Harika! Birlikte çalışmaya devam edelim!", mood: "supportive" },
      { text: "Motivasyonuna bayıldım, hadi hedeflerimize ulaşalım! 💪", mood: "motivated" }
    ];

    try {
      const { partnerName, context, lastMessage } = req.body;
      
      // Try dynamic import
      let callGemini;
      try {
        const module = await import('@/lib/gemini-multi-api');
        callGemini = module.callGeminiWithFallback;
      } catch (e) {
        console.log('Using fast fallback for AI suggestion');
      }

      if (callGemini) {
        const prompt = `Kullanıcı "${lastMessage || 'Selam!'}" mesajına 3 farklı kısa cevap öner. Maks 1 cümle. JSON: {"suggestions":[{"text":"ö1","mood":"friendly"},{"text":"ö2","mood":"supportive"},{"text":"ö3","mood":"motivated"}]}`;

        const response = await callGemini(prompt, "", {
          model: "gemini-2.0-flash",
          maxOutputTokens: 300
        });

        if (response) {
          const jsonText = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(jsonText);
          
          return res.status(200).json({
            success: true,
            suggestions: parsed.suggestions || fastSuggestions
          });
        }
      }

      // Return fast suggestions if AI fails
      return res.status(200).json({
        success: true,
        suggestions: fastSuggestions
      });
    } catch (err) {
      console.error('AI suggestion error:', err);
      return res.status(200).json({
        success: true,
        suggestions: fastSuggestions
      });
    }
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
