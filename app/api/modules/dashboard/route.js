/**
 * GET /api/modules/dashboard  – Dashboard için aktif işlerin özet listesi
 * Tüm 4 modülden status="aktif" kayıtları döner
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const userId = session.user.id;

    // Paralel sorgular
    const [targets, productivities, startups, decisions, user] = await Promise.all([
      prismaClient.target.findMany({
        where: { userId, status: "aktif" },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { chatHistory: { select: { sessionId: true } } },
      }),
      prismaClient.productivity.findMany({
        where: { userId, status: "aktif" },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { chatHistory: { select: { sessionId: true } } },
      }),
      prismaClient.startup.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { chatHistory: { select: { sessionId: true } } },
      }),
      prismaClient.decision.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { chatHistory: { select: { sessionId: true } } },
      }),
      prismaClient.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true, totalXp: true, name: true, image: true },
      }),
    ]);

    // Hedefler için kalan gün hesapla
    const enrichedTargets = targets.map((t) => {
      const targetDate = new Date(t.targetDate);
      const today = new Date();
      const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
      const steps = Array.isArray(t.microSteps) ? t.microSteps : [];
      const completedSteps = steps.filter((s) => s.completed).length;
      const progress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

      return {
        id: t.id,
        type: "target",
        title: t.targetText?.substring(0, 60) + (t.targetText?.length > 60 ? "..." : ""),
        subtitle: `${completedSteps}/${steps.length} adım tamamlandı`,
        progress,
        daysLeft: diffDays > 0 ? diffDays : 0,
        status: t.status,
        sessionId: t.chatHistory?.sessionId,
        createdAt: t.createdAt,
        xpEarned: t.xpEarned,
      };
    });

    const enrichedStartups = startups.map((s) => {
      const steps = Array.isArray(s.mvpSteps) ? s.mvpSteps : [];
      return {
        id: s.id,
        type: "startup",
        title: s.ideaDescription?.substring(0, 60) + "...",
        subtitle: `Aşama ${s.currentPhase + 1}/${steps.length}: ${steps[s.currentPhase]?.title || "Başlangıç"}`,
        progress: steps.length > 0 ? Math.round(((s.currentPhase) / steps.length) * 100) : 0,
        status: s.status,
        sessionId: s.chatHistory?.sessionId,
        createdAt: s.createdAt,
      };
    });

    const enrichedDecisions = decisions.map((d) => {
      const procon = d.proConAnalysis || {};
      const chosen = d.chosenOption
        ? procon[`option${d.chosenOption}`]?.label || `Seçenek ${d.chosenOption}`
        : null;
      return {
        id: d.id,
        type: "decision",
        title: d.dilemma?.substring(0, 60) + (d.dilemma?.length > 60 ? "..." : ""),
        subtitle: chosen ? `${chosen} seçildi` : "Analiz tamamlandı",
        status: d.status,
        sessionId: d.chatHistory?.sessionId,
        createdAt: d.createdAt,
        chosenOption: d.chosenOption,
      };
    });

    // XP hesapla (level başına 100 XP)
    const xpForNextLevel = 100;
    const currentXp = user?.xp || 0;

    return NextResponse.json({
      user: {
        ...user,
        xpProgress: currentXp,
        xpForNextLevel,
        xpPercent: Math.min(100, Math.round((currentXp / xpForNextLevel) * 100)),
      },
      activeItems: {
        targets: enrichedTargets,
        productivities: productivities.map((p) => ({
          id: p.id,
          type: "productivity",
          title: `Üretkenlik Sistemi – ${p.peakHours}`,
          subtitle: `${p.techniques?.join(", ") || "Özel sistem"}`,
          status: p.status,
          sessionId: p.chatHistory?.sessionId,
          createdAt: p.createdAt,
        })),
        startups: enrichedStartups,
        decisions: enrichedDecisions,
      },
      stats: {
        totalTargets: await prismaClient.target.count({ where: { userId } }),
        completedTargets: await prismaClient.target.count({ where: { userId, status: "tamamlandı" } }),
        totalStartups: await prismaClient.startup.count({ where: { userId } }),
        totalDecisions: await prismaClient.decision.count({ where: { userId } }),
      },
    });
  } catch (err) {
    console.error("[GET /api/modules/dashboard]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
