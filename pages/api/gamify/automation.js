import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, title, time, repeat, duration } = req.body;

  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const automation = await prisma.automation.create({
      data: {
        userId: user.id,
        title,
        time,
        repeat: repeat || 'daily',
        duration: parseInt(duration) || 30
      }
    });

    return res.status(201).json(automation);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
