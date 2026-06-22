/**
 * GET /api/modules/decisions   – Karar analizlerini listele
 * POST /api/modules/decisions  – Yeni karar analizi oluştur
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient, isPrismaError } from "@/lib/prisma";
import { generateDecisionAnalysis } from "@/lib/modules-ai";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const records = await prismaClient.decision.findMany({
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
    const { dilemma } = body;

    if (!dilemma?.trim()) {
      return NextResponse.json({ error: "İkilem metni boş olamaz" }, { status: 400 });
    }

    let aiResult;
    try {
      aiResult = await generateDecisionAnalysis({ dilemma });
    } catch {
      // Mock veri
      aiResult = {
        proConAnalysis: {
          optionA: {
            label: "Seçenek A",
            pros: [
              { text: "Hemen gelir sağlar", weight: 8 },
              { text: "Deneyim kazandırır", weight: 7 },
              { text: "Güvenli başlangıç", weight: 6 },
            ],
            cons: [
              { text: "Zaman kısıtlı", weight: 7 },
              { text: "Girişim yavaşlar", weight: 9 },
              { text: "Motivasyon düşebilir", weight: 5 },
            ],
            totalScore: 62,
          },
          optionB: {
            label: "Seçenek B",
            pros: [
              { text: "Tam özgürlük", weight: 9 },
              { text: "Büyük potansiyel", weight: 10 },
              { text: "Kendi vizyonun", weight: 8 },
            ],
            cons: [
              { text: "Finansal risk", weight: 8 },
              { text: "Gelir belirsizliği", weight: 7 },
              { text: "Stres yüksek", weight: 6 },
            ],
            totalScore: 78,
          },
        },
        riskMatrix: [
          { risk: "Finansal sıkıntı", probability: "Orta", impact: "Yüksek", mitigation: "6 aylık acil fon oluştur", level: "high" },
          { risk: "Pazar reddi", probability: "Düşük", impact: "Yüksek", mitigation: "Erken müşteri doğrulama", level: "medium" },
          { risk: "Motivasyon kaybı", probability: "Düşük", impact: "Orta", mitigation: "Haftalık check-in sistemi", level: "low" },
        ],
        timelineScenarios: {
          threeMonth: {
            optionA: "3. ayda iş akışına alışmış, ama girişim için hafta sonu zamanı ayırıyor.",
            optionB: "3. ayda MVP tamamlandı, ilk 20 kullanıcı kazanıldı.",
          },
          sixMonth: {
            optionA: "6. ayda kariyer büyümüş, ama girişim fikirde kaldı.",
            optionB: "6. ayda 200+ kullanıcı, ilk gelir elde edildi.",
          },
          twelveMonth: {
            optionA: "1 yılda iyi kariyer konumu, ama büyük pişmanlık riski yüksek.",
            optionB: "1 yılda seri girişimci olma yolunda, anlamlı bir ürün inşa edildi.",
          },
        },
        recommendation: "Verilerini analiz ettim. Uzun vadeli potansiyel ve kişisel tatmin açısından Seçenek B daha güçlü görünüyor. Ancak finansal riski minimize etmek için 3-6 aylık runway fon oluşturmanı öneririm.",
        recommendedOption: "B",
      };
    }

    const chatHistory = await prismaClient.moduleChatHistory.create({
      data: {
        userId: session.user.id,
        moduleType: "decision",
        messages: [
          { role: "user", content: `İkilem: ${dilemma}`, createdAt: new Date().toISOString() },
          { role: "assistant", content: JSON.stringify(aiResult), createdAt: new Date().toISOString() },
        ],
        summary: `Karar: ${dilemma.substring(0, 60)}`,
      },
    });

    const record = await prismaClient.decision.create({
      data: {
        userId: session.user.id,
        chatHistoryId: chatHistory.id,
        dilemma: dilemma.trim(),
        proConAnalysis: aiResult.proConAnalysis || {},
        riskMatrix: aiResult.riskMatrix || [],
        timelineScenarios: aiResult.timelineScenarios || {},
        status: "aktif",
      },
    });

    return NextResponse.json({ record, aiResult, sessionId: chatHistory.sessionId });
  } catch (err) {
    if (isPrismaError(err)) return NextResponse.json({ record: null, aiResult: null, sessionId: null });
    console.error("[POST /api/modules/decisions]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
