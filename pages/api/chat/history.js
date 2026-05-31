import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { method } = req;
  const { email, chatId } = method === 'DELETE' ? { ...req.query, ...req.body } : req.query;

  if (!email) return res.status(400).json({ error: 'email gerekli' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    if (method === 'GET') {
      if (chatId) {
        const chat = await prisma.chat.findFirst({
          where: { id: chatId, userId: user.id },
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
          },
        });
        if (!chat) return res.status(404).json({ error: 'Sohbet bulunamadı' });
        return res.status(200).json(chat);
      }

      const chats = await prisma.chat.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          _count: { select: { messages: true } },
        },
      });

      return res.status(200).json(chats);
    }

    if (method === 'POST') {
      const { title } = req.body;
      const chat = await prisma.chat.create({
        data: {
          userId: user.id,
          title: title || 'Yeni Sohbet',
        },
      });
      return res.status(201).json(chat);
    }

    if (method === 'DELETE') {
      if (!chatId) return res.status(400).json({ error: 'chatId gerekli' });
      await prisma.chat.deleteMany({
        where: { id: chatId, userId: user.id },
      });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Chat History] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
