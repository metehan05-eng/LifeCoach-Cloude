import { PrismaClient } from '@prisma/client';
import { isPrismaError } from '@/lib/prisma';
import { rewardForAction, applyXpAndLevel } from '../../../lib/gamification';

const dbUrl = process.env.DATABASE_URL || '';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl.includes('pgbouncer') ? dbUrl : dbUrl + (dbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true&connection_limit=1&pool_timeout=5',
    },
  },
});

export default async function handler(req, res) {
  const { method } = req;
  const { email } = method === 'GET' ? req.query : req.body;

  if (!email) return res.status(400).json({ error: 'email gerekli' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    if (method === 'GET') {
      const inventory = await prisma.userItem.findMany({ where: { userId: user.id } });
      return res.status(200).json({
        xp: user.xp,
        level: user.level,
        totalXp: user.totalXp,
        han_coins: user.han_coins,
        isPremium: user.isPremium,
        plan: user.plan,
        currentStreak: user.currentStreak,
        maxStreak: user.maxStreak,
        inventory: inventory.map(i => ({
          id: i.id,
          itemId: i.itemId,
          itemType: i.itemType,
          name: i.name,
          rarity: i.rarity,
          icon: i.icon,
          quantity: i.quantity,
          equipped: i.equipped,
        })),
      });
    }

    if (method === 'POST') {
      const { action } = req.body;
      if (!action) return res.status(400).json({ error: 'action gerekli (message_sent, goal_completed, etc)' });

      const reward = rewardForAction(action, user.isPremium);
      const levelResult = applyXpAndLevel(user, reward.xp);

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          xp: levelResult.newTotalXp,
          level: levelResult.newLevel,
          totalXp: levelResult.newTotalXp,
          han_coins: { increment: reward.coins },
        },
      });

      return res.status(200).json({
        reward,
        leveledUp: levelResult.leveledUp,
        oldLevel: levelResult.oldLevel,
        newLevel: levelResult.newLevel,
        totalXp: updated.totalXp,
        han_coins: updated.han_coins,
        xp: updated.xp,
        level: updated.level,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (isPrismaError(error)) {
      return res.status(200).json({
        xp: 0, level: 1, totalXp: 0, han_coins: 0,
        isPremium: false, plan: 'FREE', currentStreak: 0, maxStreak: 0,
        inventory: [],
      });
    }
    console.error('[Gamification] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
