import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient, isPrismaError } from "@/lib/prisma";
import { generateStartupRoadmap } from "@/lib/modules-ai";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const records = await prismaClient.startupRoadmap.findMany({
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
    const { ideaDescription } = body;

    if (!ideaDescription?.trim()) {
      return NextResponse.json({ error: "Fikir açıklaması boş olamaz" }, { status: 400 });
    }

    let aiResult;
    try {
      aiResult = await generateStartupRoadmap({ ideaDescription });
    } catch {
      aiResult = {
        analysis: {
          valueProp: `${ideaDescription.substring(0, 60)}... — kullanıcıların temel ihtiyacını AI destekli bir yaklaşımla çözen yenilikçi bir platform.`,
          targetAudience: "18-40 yaş arası, teknolojiye meraklı, Türkiye'deki girişimci ve dijital profesyoneller.",
          techStack: ["Next.js / React", "Node.js / Express", "PostgreSQL + Prisma", "Vercel + Railway", "Tailwind CSS"],
        },
        mvpPhases: [
          {
            phase: "Faz 1: MVP Çekirdeği",
            title: "Temel Özelliklerin İnşası",
            tasks: ["Kullanıcı girişi ve profil yönetimi", "Ana işlevsellik (CRUD) API", "Frontend arayüz entegrasyonu", "Temel test ve hata düzeltme"],
          },
          {
            phase: "Faz 2: Kullanıcı Deneyimi",
            title: "UX İyileştirmeleri ve İlk Kullanıcı Testi",
            tasks: ["Kullanıcı arayüzü iyileştirmeleri", "Beta kullanıcı grubu davet sistemi", "Geri bildirim toplama mekanizması"],
          },
          {
            phase: "Faz 3: Büyüme ve Optimizasyon",
            title: "Performans, Güvenlik ve Ölçekleme",
            tasks: ["Performans optimizasyonu", "Güvenlik denetimi ve iyileştirme", "İlk pazarlama kampanyası"],
          },
        ],
        leanCanvas: {
          problems: ["Mevcut çözümlerin karmaşık ve pahalı olması", "Hedef kitlenin özel ihtiyaçlarını karşılayan ürün eksikliği", "Geleneksel yöntemlerin verimsizliği"],
          solutions: ["AI destekli otomasyon ile süreçleri basitleştirme", "Kullanıcı dostu arayüz ile öğrenme eğrisini azaltma", "Esnek fiyatlandırma ile her bütçeye uygunluk"],
          revenues: ["Freemium modeli — temel özellikler ücretsiz", "Premium abonelik — ileri düzey özellikler", "Kurumsal lisans — takım ve şirket planları"],
          costs: ["Sunucu ve bulut altyapı maliyetleri", "Geliştirici ve tasarımcı maaşları", "Pazarlama ve reklam bütçesi", "Yasal ve muhasebe giderleri"],
        },
      };
    }

    const { analysis, mvpPhases, leanCanvas } = aiResult;

    const record = await prismaClient.startupRoadmap.create({
      data: {
        userId: session.user.id,
        idea: ideaDescription.trim(),
        analysis: analysis || {},
        mvpPhases: mvpPhases || [],
        leanCanvas: leanCanvas || {},
      },
    });

    return NextResponse.json({ record, aiResult });
  } catch (err) {
    if (isPrismaError(err)) return NextResponse.json({ record: null });
    console.error("[POST /api/modules/startup]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
