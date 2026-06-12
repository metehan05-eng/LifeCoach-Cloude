/**
 * GET /api/modules/startup   – Startup yol haritalarını listele
 * POST /api/modules/startup  – Yeni startup analizi oluştur
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient } from "@/lib/prisma";
import { generateStartupRoadmap } from "@/lib/modules-ai";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const records = await prismaClient.startup.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { chatHistory: { select: { sessionId: true } } },
    });

    return NextResponse.json({ records });
  } catch (err) {
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
      // Mock veri
      aiResult = {
        mvpSteps: [
          {
            phase: 1,
            title: "Problem Doğrulama",
            duration: "2 Hafta",
            tasks: ["10 potansiyel müşteri ile görüşme", "Problem-çözüm uyumu analizi", "Rakip analizi"],
            tools: ["Notion", "Google Forms", "Calendly"],
            milestone: "Gerçek bir problemin varlığı doğrulandı",
          },
          {
            phase: 2,
            title: "MVP Tasarımı",
            duration: "3 Hafta",
            tasks: ["Figma prototipi oluştur", "Ana özellik listesini belirle", "UI/UX tasarımını tamamla"],
            tools: ["Figma", "Miro", "Notion"],
            milestone: "Kullanıcı testine hazır prototip",
          },
          {
            phase: 3,
            title: "MVP Geliştirme",
            duration: "6 Hafta",
            tasks: ["Backend API geliştirme", "Frontend implementasyon", "Database tasarımı"],
            tools: ["Next.js", "PostgreSQL", "Vercel"],
            milestone: "Çalışan MVP canlıya alındı",
          },
          {
            phase: 4,
            title: "İlk Kullanıcılar",
            duration: "4 Hafta",
            tasks: ["Beta kullanıcı grubu oluştur", "Geri bildirim topla", "Hızlı iterasyon yap"],
            tools: ["Intercom", "Hotjar", "Mixpanel"],
            milestone: "50 aktif beta kullanıcı",
          },
        ],
        techStack: {
          frontend: "Next.js 14 / React",
          backend: "Node.js / Express",
          database: "PostgreSQL + Prisma",
          deployment: "Vercel + Railway",
          extras: ["Supabase Auth", "Stripe", "SendGrid"],
        },
        marketAnalysis: {
          tam: "₺2.5 Milyar (Türkiye dijital eğitim pazarı)",
          sam: "₺450 Milyon (B2C segment)",
          som: "₺15 Milyon (ilk 2 yıl)",
          competitors: [
            { name: "Mevcut Rakip A", strength: "Geniş kullanıcı tabanı", weakness: "Kötü UX" },
            { name: "Mevcut Rakip B", strength: "Güçlü marka", weakness: "Yüksek fiyat" },
          ],
          advantages: ["AI destekli kişiselleştirme", "Türkçe içerik", "Oyunlaştırma"],
          targetAudience: "18-35 yaş, Türkiye'deki genç profesyoneller ve girişimciler",
        },
        summary: `${ideaDescription.substring(0, 60)}... için 4 aşamalı MVP yol haritası oluşturuldu.`,
      };
    }

    const chatHistory = await prismaClient.moduleChatHistory.create({
      data: {
        userId: session.user.id,
        moduleType: "startup",
        messages: [
          { role: "user", content: ideaDescription, createdAt: new Date().toISOString() },
          { role: "assistant", content: JSON.stringify(aiResult), createdAt: new Date().toISOString() },
        ],
        summary: `Startup: ${ideaDescription.substring(0, 60)}`,
      },
    });

    const record = await prismaClient.startup.create({
      data: {
        userId: session.user.id,
        chatHistoryId: chatHistory.id,
        ideaDescription: ideaDescription.trim(),
        mvpSteps: aiResult.mvpSteps || [],
        techStack: aiResult.techStack || {},
        marketAnalysis: aiResult.marketAnalysis || {},
        currentPhase: 0,
        status: "aktif",
      },
    });

    return NextResponse.json({ record, aiResult, sessionId: chatHistory.sessionId });
  } catch (err) {
    console.error("[POST /api/modules/startup]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
