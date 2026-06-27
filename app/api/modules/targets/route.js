/**
 * GET /api/modules/targets        – Kullanıcının hedeflerini listele
 * POST /api/modules/targets       – Yeni hedef oluştur (günlük 1 limit)
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient, isPrismaError } from "@/lib/prisma";
import { generateTargetPlan, getMockTargetPlan } from "@/lib/modules-ai";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // aktif | tamamlandı | beklemede | all

    const where = { userId: session.user.id };
    if (status && status !== "all") where.status = status;

    const targets = await prismaClient.target.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        chatHistory: { select: { sessionId: true, summary: true } },
      },
    });

    // Bugün hedef var mı?
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTarget = await prismaClient.target.findFirst({
      where: {
        userId: session.user.id,
        createdAt: { gte: today, lt: tomorrow },
      },
    });

    return NextResponse.json({
      targets,
      hasTodayTarget: !!todayTarget,
      todayTarget: todayTarget || null,
    });
  } catch (err) {
    if (isPrismaError(err)) {
      return NextResponse.json({ targets: [], hasTodayTarget: false, todayTarget: null });
    }
    console.error("[GET /api/modules/targets]", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { targetText } = body;

    if (!targetText?.trim()) {
      return NextResponse.json({ error: "Hedef metni boş olamaz" }, { status: 400 });
    }

    // ── Günlük 1 Hedef Kısıtlaması (Middleware) ──────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingTarget = await prismaClient.target.findFirst({
      where: {
        userId: session.user.id,
        createdAt: { gte: today, lt: tomorrow },
      },
    });

    if (existingTarget) {
      return NextResponse.json(
        {
          error: "Bugün zaten bir hedef belirledin!",
          existingTarget,
          code: "DAILY_LIMIT_REACHED",
        },
        { status: 409 }
      );
    }
    // ──────────────────────────────────────────────────────────

    // AI ile hedef analizi ve akış şeması üret
    let aiResult;
    try {
      aiResult = await generateTargetPlan({ targetText });
    } catch (aiErr) {
      console.warn("Qwen hatası, mock kullanılıyor:", aiErr.message);
      aiResult = getMockTargetPlan(targetText);
    }

    // Chat history oluştur
    const chatHistory = await prismaClient.moduleChatHistory.create({
      data: {
        userId: session.user.id,
        moduleType: "target",
        messages: [
          { role: "user", content: `Hedefim: ${targetText}`, createdAt: new Date().toISOString() },
          { role: "assistant", content: JSON.stringify(aiResult), createdAt: new Date().toISOString() },
        ],
        summary: `Hedef: ${targetText.substring(0, 80)}...`,
      },
    });

    // Hedefi kaydet
    const target = await prismaClient.target.create({
      data: {
        userId: session.user.id,
        chatHistoryId: chatHistory.id,
        targetText: targetText.trim(),
        microSteps: aiResult, // { summary, steps, weeklyPlans }
        youtubeVideos: [],
        targetDate: new Date(),
        status: "aktif",
        xpEarned: 0,
      },
    });

    return NextResponse.json({
      target,
      aiResult,
      sessionId: chatHistory.sessionId,
    });
  } catch (err) {
    if (isPrismaError(err)) {
      return NextResponse.json({ target: null, aiResult: null, sessionId: null });
    }
    console.error("[POST /api/modules/targets]", err);
    return NextResponse.json({ error: "Sunucu hatası: " + err.message }, { status: 500 });
  }
}
