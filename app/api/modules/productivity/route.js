import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient, isPrismaError } from "@/lib/prisma";
import { generateProductivityPlan } from "@/lib/modules-ai";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const record = await prismaClient.productivitySystem.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ record });
  } catch (err) {
    if (isPrismaError(err)) return NextResponse.json({ record: null });
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
      aiResult = {
        routines: {
          morning: [
            "07:00 - Nefes egzersizi + günün hedefini belirle",
            "07:15 - 15 dk kitap okuma",
            "07:35 - Hafif esneme hareketleri",
          ],
          afternoon: [
            "12:30 - 30 dk ekransız öğle molası",
            "15:00 - 5 dk yürüyüş molası",
          ],
          evening: [
            "20:00 - Dijital detoks başlangıcı",
            "21:00 - Gün değerlendirme ve yarın planı",
            "22:00 - Uyku hazırlığı",
          ],
        },
        timeBlocks: [
          { time: "08:00 - 10:00", label: "Derin Odak Bloku", type: "focus" },
          { time: "10:00 - 10:15", label: "Mola", type: "break" },
          { time: "10:15 - 12:00", label: "İkinci Odak Bloku", type: "focus" },
          { time: "12:00 - 13:00", label: "Öğle Arası", type: "break" },
          { time: "13:00 - 14:30", label: "Hafif Görevler", type: "routine" },
          { time: "14:30 - 16:00", label: "Öğleden Sonra Odak", type: "focus" },
          { time: "16:00 - 16:15", label: "Mola", type: "break" },
          { time: "16:15 - 17:00", label: "Günü Tamamlama", type: "routine" },
        ],
        rules: [
          "İlk 30 dk telefona bakma — beynini uyandır",
          "Her odak bloku öncesi 2 dk hedefini yaz",
          "Mola anında ekrana değil, pencereye bak",
          "Günde en fazla 3 büyük karar al",
        ],
        peakHours,
        focusHours: parseInt(focusHours),
        selectedMethods: techniques || [],
      };
    }

    const { routines, timeBlocks, rules } = aiResult;

    const record = await prismaClient.productivitySystem.upsert({
      where: { userId: session.user.id },
      update: {
        peakHours,
        focusHours: parseInt(focusHours),
        selectedMethods: techniques || [],
        routines: routines || {},
        timeBlocks: timeBlocks || [],
        rules: rules || [],
      },
      create: {
        userId: session.user.id,
        peakHours,
        focusHours: parseInt(focusHours),
        selectedMethods: techniques || [],
        routines: routines || {},
        timeBlocks: timeBlocks || [],
        rules: rules || [],
      },
    });

    return NextResponse.json({ record, aiResult });
  } catch (err) {
    if (isPrismaError(err)) return NextResponse.json({ record: null });
    console.error("[POST /api/modules/productivity]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
