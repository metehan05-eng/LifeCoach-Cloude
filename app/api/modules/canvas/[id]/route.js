import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = params;
    const canvas = await prismaClient.canvas.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!canvas) {
      return NextResponse.json({ error: "Canvas bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ canvas });
  } catch (err) {
    console.error("[GET /api/modules/canvas/[id]]", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { content, title } = body;

    const existing = await prismaClient.canvas.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Canvas bulunamadı" }, { status: 404 });
    }

    const canvas = await prismaClient.canvas.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(title !== undefined && { title }),
        version: { increment: 1 },
      },
    });

    return NextResponse.json({ canvas });
  } catch (err) {
    console.error("[PATCH /api/modules/canvas/[id]]", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = params;

    const existing = await prismaClient.canvas.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Canvas bulunamadı" }, { status: 404 });
    }

    await prismaClient.canvas.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Canvas silindi" });
  } catch (err) {
    console.error("[DELETE /api/modules/canvas/[id]]", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
