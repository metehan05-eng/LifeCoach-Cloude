/**
 * GET /api/modules/chat-history   – Modül sohbet geçmişini listele
 * Query: ?moduleType=target|productivity|startup|decision&sessionId=xxx
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const moduleType = searchParams.get("moduleType");
    const sessionId = searchParams.get("sessionId");

    const where = { userId: session.user.id };
    if (moduleType) where.moduleType = moduleType;
    if (sessionId) where.sessionId = sessionId;

    if (sessionId) {
      // Tek session'ı detaylı döndür
      const chatHistory = await prismaClient.moduleChatHistory.findFirst({
        where,
      });
      if (!chatHistory) {
        return NextResponse.json({ error: "Sohbet geçmişi bulunamadı" }, { status: 404 });
      }
      return NextResponse.json({ chatHistory });
    }

    // Listeyi döndür
    const histories = await prismaClient.moduleChatHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        sessionId: true,
        moduleType: true,
        summary: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ histories, total: histories.length });
  } catch (err) {
    console.error("[GET /api/modules/chat-history]", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
