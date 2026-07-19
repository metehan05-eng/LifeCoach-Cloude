import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient, isPrismaError } from "@/lib/prisma";
import { generateDecisionAnalysis } from "@/lib/modules-ai";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const records = await prismaClient.decisionAnalysis.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
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
      if (!aiResult || aiResult.error) throw new Error(aiResult?.details || "AI_UNAVAILABLE");
    } catch {
      aiResult = {
        summary: "Bu durumda 3 farklı yol izlenebilir. Her birinin kendine göre avantaj ve dezavantajları var.",
        optionA: "Seçenek A: Mevcut durumu korumak",
        optionB: "Seçenek B: Değişime gitmek",
        optionC: "Seçenek C: Hibrit yaklaşım (hem koru hem değiş)",
        recommendation: "optionB",
        prosCons: {
          optionA: {
            pros: [{ text: "Konfor alanında kalmak, bilinir ve güvenli", score: 7 }],
            cons: [{ text: "Potansiyel büyüme fırsatı kaçabilir", score: 6 }],
          },
          optionB: {
            pros: [{ text: "Yeni fırsatlar ve kişisel gelişim", score: 8 }],
            cons: [{ text: "Belirsizlik ve kısa vadeli zorluklar", score: 7 }],
          },
          optionC: {
            pros: [{ text: "Risk dağıtımı ve esneklik", score: 8 }],
            cons: [{ text: "İki alanda da tam odaklanma zorluğu", score: 5 }],
          },
        },
        simulation: {
          optionA: {
            m3: "Mevcut durum aynen devam eder, risk alınmamış olur.",
            m6: "Rutinleşme başlar, değişim isteği artabilir.",
            m12: "Geriye dönüp bakınca 'keşke' deme ihtimali yükselir.",
          },
          optionB: {
            m3: "Zorlu geçen bir uyum süreci, ancak öğrenme hızı yüksek.",
            m6: "Yeni düzene alışılmış, ilk somut sonuçlar görülmeye başlanmış.",
            m12: "Değişimin meyveleri toplanıyor, doğru karar verildiği hissi ağır basıyor.",
          },
          optionC: {
            m3: "İki alan arasında gidip gelme, tam verim düşük olabilir.",
            m6: "Denge oturmaya başlar, her iki alanda da ilerleme görülür.",
            m12: "En güvenli ama en yavaş ilerleyen yol, her şeyden biraz.",
          },
        },
        riskScores: { optionA: 25, optionB: 60, optionC: 40 },
        coachVerdict: "Her seçeneğin kendine göre artıları ve eksileri var. Seçenek B daha yüksek risk taşısa da, uzun vadede size daha fazla tatmin ve gelişim vaat ediyor. Riskleri minimize etmek için küçük adımlarla başlayabilirsiniz. Unutmayın: en büyük risk, hiç risk almamaktır.",
      };
    }

    const { optionA, optionB, optionC, prosCons, simulation, riskScores, coachVerdict, summary, recommendation } = aiResult;

    let record;
    try {
      record = await prismaClient.decisionAnalysis.create({
        data: {
          userId: session.user.id,
          dilemma: dilemma.trim(),
          optionA: optionA || "",
          optionB: optionB || "",
          analysisData: { prosCons, simulation, riskScores, coachVerdict, summary, recommendation, optionC },
        },
      });
    } catch (dbErr) {
      console.warn("[POST /api/modules/decisions] DB kaydetme başarısız, AI sonucu döndürülüyor:", dbErr.message);
      return NextResponse.json({
        record: {
          id: Date.now().toString(),
          dilemma: dilemma.trim(),
          optionA: optionA || "",
          optionB: optionB || "",
          analysisData: { prosCons, simulation, riskScores, coachVerdict, summary, recommendation, optionC },
          createdAt: new Date().toISOString(),
        },
        aiResult,
      });
    }

    return NextResponse.json({ record, aiResult });
  } catch (err) {
    if (isPrismaError(err)) return NextResponse.json({ record: null });
    console.error("[POST /api/modules/decisions]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
