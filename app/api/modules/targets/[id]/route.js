/**
 * PATCH /api/modules/targets/[id]  – Mikro adım tamamlama & XP artışı
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { stepId, completed } = body;

    // Hedefi bul ve sahipliği doğrula
    const target = await prismaClient.target.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!target) {
      return NextResponse.json({ error: "Hedef bulunamadı" }, { status: 404 });
    }

    // Mikro adımı güncelle
    const steps = Array.isArray(target.microSteps) ? target.microSteps : [];
    const step = steps.find((s) => s.id === stepId);
    if (!step) {
      return NextResponse.json({ error: "Adım bulunamadı" }, { status: 404 });
    }

    const wasCompleted = step.completed;
    step.completed = completed;
    const xpDelta = completed && !wasCompleted ? (step.xpReward || 25) : completed === false && wasCompleted ? -(step.xpReward || 25) : 0;

    // Tüm adımlar tamamlandıysa hedefi tamamla
    const allDone = steps.every((s) => s.completed);
    const newStatus = allDone ? "tamamlandı" : "aktif";
    const bonusXp = allDone && !wasCompleted ? 100 : 0; // Hedef tamamlama bonusu

    const totalXpDelta = xpDelta + bonusXp;

    // Hedefi güncelle
    const updatedTarget = await prismaClient.target.update({
      where: { id },
      data: {
        microSteps: steps,
        status: newStatus,
        xpEarned: { increment: totalXpDelta },
      },
    });

    // Kullanıcı XP'sini güncelle
    if (totalXpDelta !== 0) {
      const user = await prismaClient.user.findUnique({ where: { id: session.user.id } });
      const newXp = (user?.xp || 0) + totalXpDelta;
      const xpPerLevel = 100;
      const newLevel = Math.floor((user?.totalXp || 0) + totalXpDelta) / xpPerLevel + 1;

      await prismaClient.user.update({
        where: { id: session.user.id },
        data: {
          xp: Math.max(0, newXp % xpPerLevel),
          totalXp: { increment: Math.max(0, totalXpDelta) },
          level: Math.max(1, Math.floor(newLevel)),
        },
      });
    }

    return NextResponse.json({
      target: updatedTarget,
      xpDelta: totalXpDelta,
      allCompleted: allDone,
      bonusXp,
    });
  } catch (err) {
    console.error("[PATCH /api/modules/targets/[id]]", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
