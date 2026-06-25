import { prismaClient as prisma } from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, amount } = req.body || {};
    const amt = Number(amount || 0);
    if (!email || !Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid parameters' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const currentXp = user.xp || 0;
    const currentLevel = user.level || 1;
    const newTotal = currentXp + amt;
    const levelUps = Math.floor(newTotal / 100);
    const newXp = newTotal % 100;
    const newLevel = currentLevel + levelUps;

    const updated = await prisma.user.update({
      where: { email },
      data: {
        xp: newXp,
        level: newLevel,
        totalXp: { increment: amt }
      }
    });

    return res.status(200).json({ ok: true, xp: updated.xp, level: updated.level, banked: amt });
  } catch (e) {
    console.error('bank-xp error', e);
    return res.status(500).json({ error: 'server error' });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
