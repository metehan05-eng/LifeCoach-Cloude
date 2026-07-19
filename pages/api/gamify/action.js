import { createClient } from '@supabase/supabase-js';
import { prismaClient as prisma } from '@/lib/prisma';

const XP_MAP = {
  GOAL_CREATED: 20,
  TASK_COMPLETED: 30,
  STREAK_BONUS_3: 50,
  AI_PLAN_MADE: 10,
  MESSAGE_SENT: 1,
  DECISION_CORRECT: 15,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, action } = req.body;
  if (!email || !action) return res.status(400).json({ error: 'Missing data' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let xpToAdd = XP_MAP[action] || 0;
    
    // Streak Mantığı
    const now = new Date();
    const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
    let newStreak = user.currentStreak;

    if (lastActive) {
      const diffDays = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak += 1;
        // 3 gün bonusu kontrolü
        if (newStreak % 3 === 0) xpToAdd += XP_MAP.STREAK_BONUS_3;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    const newTotalXp = user.totalXp + xpToAdd;
    const newXp = (user.xp + xpToAdd) % 100; // Her 100 XP bir level (veya başka bir formül)
    const newLevel = Math.floor(newTotalXp / 100) + 1;

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        xp: newXp,
        totalXp: newTotalXp,
        level: newLevel,
        currentStreak: newStreak,
        maxStreak: Math.max(newStreak, user.maxStreak),
        lastActiveAt: now,
      }
    });

    return res.status(200).json({ 
      success: true, 
      xpAdded: xpToAdd, 
      newLevel, 
      newXp,
      streak: newStreak 
    });

  } catch (error) {
    console.error("Gamify Error:", error);
    return res.status(500).json({ error: "Gamification failed", details: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
