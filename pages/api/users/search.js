import { prismaClient } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';

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

// GET /api/users/search?q=searchTerm - Search users by name or email
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = authenticateToken(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }
  
  const currentUserId = user.id;
  const searchQuery = req.query.q || '';
  
  try {
    // Search users in Prisma database
    const users = await prismaClient.user.findMany({
      where: {
        AND: [
          // Exclude current user
          { id: { not: currentUserId } },
          // Search in name or email
          {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { email: { contains: searchQuery, mode: 'insensitive' } }
            ]
          }
        ],
        // Only show users with some public info
        OR: [
          { name: { not: null } },
          { email: { not: null } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      },
      take: 20, // Limit results
      orderBy: {
        name: 'asc'
      }
    });
    
    // Filter out users without name or email
    const filteredUsers = users.filter(u => u.name || u.email);
    
    // Get current user's existing partners
    const existingPartners = await prismaClient.accountabilityPartner.findMany({
      where: { userId: currentUserId },
      select: { partnerId: true }
    });
    
    const existingPartnerIds = existingPartners.map(p => p.partnerId);
    
    // Mark users that are already partners
    const usersWithStatus = filteredUsers.map(u => ({
      ...u,
      isPartner: existingPartnerIds.includes(u.id),
      displayName: u.name || u.email?.split('@')[0] || 'Kullanıcı'
    }));
    
    return res.status(200).json({
      success: true,
      users: usersWithStatus,
      count: usersWithStatus.length
    });
    
  } catch (error) {
    console.error('User search error:', error);
    return res.status(500).json({ error: 'Kullanıcılar aranırken hata oluştu' });
  }
}