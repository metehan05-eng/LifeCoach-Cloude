import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient, isPrismaError } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const canvases = await prismaClient.canvas.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ canvases });
  } catch (err) {
    if (isPrismaError(err)) {
      return NextResponse.json({ canvases: [] });
    }
    console.error("[GET /api/modules/canvas]", err);
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
    const { title, content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "İçerik boş olamaz" }, { status: 400 });
    }

    const canvas = await prismaClient.canvas.create({
      data: {
        userId: session.user.id,
        title: title?.trim() || "İsimsiz Canvas",
        content: content.trim(),
        version: 1,
      },
    });

    return NextResponse.json({ canvas });
  } catch (err) {
    console.error("[POST /api/modules/canvas]", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
