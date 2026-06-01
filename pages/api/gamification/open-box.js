import { PrismaClient } from '@prisma/client';
import { rollLootBox } from '../../../lib/gamification';

const prisma = new PrismaClient();

const BOX_PRICE = {
  standard: 200,
  premium: 500,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, boxType = 'standard' } = req.body;
  if (!email) return res.status(400).json({ error: 'email gerekli' });

  const price = BOX_PRICE[boxType] || BOX_PRICE.standard;
  if (!price) return res.status(400).json({ error: 'Geçersiz kasa türü (standard/premium)' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    if (user.han_coins < price) {
      return res.status(400).json({
        error: 'Yetersiz HAN Coin',
        required: price,
        balance: user.han_coins,
      });
    }

    const drop = rollLootBox(user.isPremium);

    await prisma.user.update({
      where: { id: user.id },
      data: { han_coins: { decrement: price } },
    });

    if (drop.itemType === 'coin' && drop.quantity > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { han_coins: { increment: drop.quantity } },
      });
    } else {
      const existing = await prisma.userItem.findFirst({
        where: { userId: user.id, itemId: drop.id },
      });
      if (existing) {
        await prisma.userItem.update({
          where: { id: existing.id },
          data: { quantity: { increment: drop.quantity || 1 } },
        });
      } else {
        await prisma.userItem.create({
          data: {
            userId: user.id,
            itemId: drop.id,
            itemType: drop.itemType,
            name: drop.name,
            rarity: drop.rarity,
            icon: drop.icon,
            quantity: drop.quantity || 1,
          },
        });
      }
    }

    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      select: { han_coins: true },
    });

    return res.status(200).json({
      success: true,
      drop: {
        id: drop.id,
        itemType: drop.itemType,
        name: drop.name,
        rarity: drop.rarity,
        icon: drop.icon,
        quantity: drop.quantity || 1,
        colors: drop.colors,
      },
      boxType,
      coinsSpent: price,
      balance: updated.han_coins,
      isPremium: user.isPremium,
    });
  } catch (error) {
    console.error('[LootBox] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
