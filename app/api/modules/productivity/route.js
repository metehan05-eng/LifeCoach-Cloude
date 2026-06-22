/**
 * GET /api/modules/productivity   – Üretkenlik kayıtlarını listele
 * POST /api/modules/productivity  – Yeni üretkenlik sistemi oluştur
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient, isPrismaError } from "@/lib/prisma";
import { generateProductivityPlan } from "@/lib/modules-ai";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const records = await prismaClient.productivity.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { chatHistory: { select: { sessionId: true } } },
    });

    return NextResponse.json({ records });
  } catch (err) {
    if (isPrismaError(err)) return NextResponse.json({ records: [] });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const body = await request.json();
    const { peakHours, focusHours, techniques } = body;

    if (!peakHours || !focusHours) {
      return NextResponse.json({ error: "Zirve saatleri ve odak saatleri zorunludur" }, { status: 400 });
    }

    let aiResult;
    try {
      aiResult = await generateProductivityPlan({ peakHours, focusHours, techniques: techniques || [] });
    } catch {
      // Mock veri
      aiResult = {
        weeklySchedule: [
          { day: "Pazartesi", blocks: [
            { start: peakHours.split("-")[0] || "09:00", end: "11:30", task: "Derin Çalışma Bloku", type: "deep_work", color: "#8a2be2" },
            { start: "11:30", end: "12:00", task: "Kısa Mola", type: "break", color: "#10b981" },
            { start: "12:00", end: "13:00", task: "Öğle Molası", type: "break", color: "#10b981" },
            { start: "13:00", end: "15:00", task: "Proje Geliştirme", type: "project", color: "#6366f1" },
            { start: "15:00", end: "17:00", task: "Öğrenme & Gelişim", type: "learning", color: "#f59e0b" },
          ]},
          { day: "Salı", blocks: [
            { start: "09:00", end: "12:00", task: "Odak Zamanı", type: "deep_work", color: "#8a2be2" },
            { start: "13:00", end: "15:30", task: "Görev Tamamlama", type: "project", color: "#6366f1" },
            { start: "15:30", end: "17:00", task: "Planlama & Review", type: "planning", color: "#f59e0b" },
          ]},
        ],
        routines: [
          { title: "Sabah Ritüeli", time: "07:00", description: "5 dk meditasyon + 3 öncelik belirleme", icon: "🌅" },
          { title: "Günlük Review", time: "18:00", description: "Günün değerlendirmesi ve yarın planı", icon: "📊" },
          { title: "Akşam Kapatma", time: "21:00", description: "Bilgisayarı kapat, zihin boşalt", icon: "🌙" },
        ],
        tips: ["Her 90 dakikada bir mola ver", "Telefonu sessize al", "Önce zor işleri yap"],
        weeklyGoalHours: parseInt(focusHours) * 5,
      };
    }

    const chatHistory = await prismaClient.moduleChatHistory.create({
      data: {
        userId: session.user.id,
        moduleType: "productivity",
        messages: [
          { role: "user", content: `Zirve saatler: ${peakHours}, Odak: ${focusHours}h, Teknikler: ${techniques?.join(",")}`, createdAt: new Date().toISOString() },
          { role: "assistant", content: JSON.stringify(aiResult), createdAt: new Date().toISOString() },
        ],
        summary: `Üretkenlik Sistemi – ${peakHours} zirve saatleri`,
      },
    });

    const record = await prismaClient.productivity.create({
      data: {
        userId: session.user.id,
        chatHistoryId: chatHistory.id,
        peakHours,
        focusHours: parseInt(focusHours),
        techniques: techniques || [],
        weeklySchedule: aiResult.weeklySchedule || [],
        routines: aiResult.routines || [],
        status: "aktif",
      },
    });

    return NextResponse.json({ record, aiResult, sessionId: chatHistory.sessionId });
  } catch (err) {
    if (isPrismaError(err)) return NextResponse.json({ record: null, aiResult: null, sessionId: null });
    console.error("[POST /api/modules/productivity]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
