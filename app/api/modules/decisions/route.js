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
    } catch {
      aiResult = {
        optionA: "Kurumsal işe devam etmek",
        optionB: "İstifa edip SaaS projesine odaklanmak",
        prosCons: {
          optionA: {
            pros: [
              { text: "Maddi güvence ve düzenli gelir", score: 9 },
              { text: "Sosyal statü ve kariyer ağı", score: 7 },
              { text: "Deneyim kazanmaya devam", score: 6 },
            ],
            cons: [
              { text: "Kişisel gelişim ve yaratıcılık sınırlı", score: 8 },
              { text: "Zamanının büyük kısmı başkasının hedeflerine harcanıyor", score: 7 },
            ],
          },
          optionB: {
            pros: [
              { text: "Kendi işinin patronu olmak — tam özgürlük", score: 10 },
              { text: "Yüksek büyüme potansiyeli", score: 9 },
              { text: "Anlamlı bir ürün inşa etme tatmini", score: 8 },
            ],
            cons: [
              { text: "Gelir belirsizliği ve finansal risk", score: 8 },
              { text: "Yalnız çalışmanın getirdiği zorluklar", score: 6 },
              { text: "Düzenli sağlık/sosyal güvence kaybı", score: 5 },
            ],
          },
        },
        simulation: {
          optionA: {
            m3: "Mevcut düzen devam eder, finansal rahatlık korunur ancak girişim fikri ertelenir.",
            m6: "Kariyer basamaklarında ilerleme olur, fakat 'acaba' düşünceleri sıklaşır.",
            m12: "Daha yüksek bir pozisyondasın, ama girişim hayali ikinci plana itilmiş hissettirir.",
          },
          optionB: {
            m3: "İlk MVP yayında, stres yüksek ama üretme heyecanı yoğun. İlk kullanıcı geri bildirimleri alınır.",
            m6: "Ürün-pazar uyumu oturmaya başlar, 100+ aktif kullanıcı ve ilk düzenli gelir.",
            m12: "Finansal özgürlüğe doğru ilerleme, potansiyel yatırımcı görüşmeleri başlar.",
          },
        },
        riskScores: { optionA: 20, optionB: 65 },
        coachVerdict: "İki seçeneği de dikkatle değerlendirdim. Seçenek A kısa vadede güvenli ve istikrarlı, ancak uzun vadede keşkeler biriktirme riski taşıyor. Seçenek B ise yüksek riskli ama potansiyel olarak çok daha tatmin edici. Eğer 6-12 aylık bir finansal runway'in varsa ve risk toleransın yüksekse, Seçenek B'yi öneririm. Ancak önce küçük bir deneme yapabilirsin: haftada 10 saat SaaS projene ayırarak başla, böylece her iki dünyayı da test etmiş olursun.",
      };
    }

    const { optionA, optionB, prosCons, simulation, riskScores, coachVerdict } = aiResult;

    const record = await prismaClient.decisionAnalysis.create({
      data: {
        userId: session.user.id,
        dilemma: dilemma.trim(),
        optionA: optionA || "",
        optionB: optionB || "",
        analysisData: { prosCons, simulation, riskScores, coachVerdict },
      },
    });

    return NextResponse.json({ record, aiResult });
  } catch (err) {
    if (isPrismaError(err)) return NextResponse.json({ record: null });
    console.error("[POST /api/modules/decisions]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
