/**
 * PATCH /api/modules/targets/[id]  – Akış adımı tamamlama & XP artışı
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
    const { stepOrder, completed } = body;

    // Hedefi bul ve sahipliği doğrula
    const target = await prismaClient.target.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!target) {
      return NextResponse.json({ error: "Hedef bulunamadı" }, { status: 404 });
    }

    // Plan verisini al (microSteps alanı artık { summary, steps, weeklyPlans } içerir)
    const planData = (target.microSteps && typeof target.microSteps === 'object' && !Array.isArray(target.microSteps))
      ? target.microSteps
      : { steps: Array.isArray(target.microSteps) ? target.microSteps : [] };
    const steps = planData.steps || [];

    if (!steps.length) {
      return NextResponse.json({ error: "Adım bulunamadı" }, { status: 404 });
    }

    // Adımı order ile bul ve tamamlanma durumunu değiştir
    const stepIndex = steps.findIndex((s) => s.order === stepOrder);
    if (stepIndex === -1) {
      return NextResponse.json({ error: "Adım bulunamadı" }, { status: 404 });
    }

    const wasCompleted = steps[stepIndex].completed || false;
    steps[stepIndex] = { ...steps[stepIndex], completed };

    // Tüm adımlar tamamlandıysa hedefi tamamla
    const allDone = steps.every((s) => s.completed);
    const newStatus = allDone ? "tamamlandı" : "aktif";

    // Her adım tamamlandığında 25 XP (ızgara XP)
    const xpDelta = completed && !wasCompleted ? 25 : completed === false && wasCompleted ? -25 : 0;
    const bonusXp = allDone && !wasCompleted ? 100 : 0; // Hedef tamamlama bonusu
    const totalXpDelta = xpDelta + bonusXp;

    // Güncellenmiş plan verisini kaydet
    planData.steps = steps;
    const updatedTarget = await prismaClient.target.update({
      where: { id },
      data: {
        microSteps: planData,
        status: newStatus,
        xpEarned: { increment: Math.max(0, totalXpDelta) },
      },
    });

    // Kullanıcı XP'sini güncelle
    if (totalXpDelta !== 0) {
      const user = await prismaClient.user.findUnique({ where: { id: session.user.id } });
      const xpPerLevel = 100;
      const newTotalXp = (user?.totalXp || 0) + Math.max(0, totalXpDelta);
      const newLevel = Math.floor(newTotalXp / xpPerLevel) + 1;

      await prismaClient.user.update({
        where: { id: session.user.id },
        data: {
          xp: Math.max(0, newTotalXp % xpPerLevel),
          totalXp: { increment: Math.max(0, totalXpDelta) },
          level: Math.max(1, newLevel),
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
