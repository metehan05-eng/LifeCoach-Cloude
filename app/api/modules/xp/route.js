/**
 * POST /api/modules/xp  – Modül XP Güncelleme
 * Body: { xpAmount: number, source: string }
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient } from "@/lib/prisma";
import { NextResponse } from "next/server";

const XP_PER_LEVEL = 100;

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { xpAmount = 0, source = "module" } = body;

    if (typeof xpAmount !== "number" || xpAmount === 0) {
      return NextResponse.json({ error: "Geçersiz XP miktarı" }, { status: 400 });
    }

    const user = await prismaClient.user.findUnique({
      where: { id: session.user.id },
      select: { xp: true, level: true, totalXp: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    const safeAmount = Math.max(0, xpAmount);
    const newTotalXp = (user.totalXp || 0) + safeAmount;
    const newLevel = Math.max(1, Math.floor(newTotalXp / XP_PER_LEVEL) + 1);
    const newXp = newTotalXp % XP_PER_LEVEL;
    const leveledUp = newLevel > (user.level || 1);

    const updatedUser = await prismaClient.user.update({
      where: { id: session.user.id },
      data: {
        xp: newXp,
        totalXp: newTotalXp,
        level: newLevel,
      },
      select: { xp: true, level: true, totalXp: true },
    });

    return NextResponse.json({
      success: true,
      xpAdded: safeAmount,
      source,
      newXp: updatedUser.xp,
      newLevel: updatedUser.level,
      newTotalXp: updatedUser.totalXp,
      leveledUp,
      oldLevel: user.level,
    });
  } catch (err) {
    console.error("[POST /api/modules/xp]", err);
    return NextResponse.json({ error: "Sunucu hatası: " + err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const user = await prismaClient.user.findUnique({
      where: { id: session.user.id },
      select: { xp: true, level: true, totalXp: true, han_coins: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    const xpForNextLevel = XP_PER_LEVEL;
    return NextResponse.json({
      xp: user.xp,
      level: user.level,
      totalXp: user.totalXp,
      han_coins: user.han_coins,
      xpForNextLevel,
      xpPercent: Math.min(100, Math.round((user.xp / xpForNextLevel) * 100)),
    });
  } catch (err) {
    console.error("[GET /api/modules/xp]", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
