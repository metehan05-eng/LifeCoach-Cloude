import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient as prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const session = await getServerSession({ req: { headers: req.headers } }, undefined, authOptions);
    if (!session?.user) {
      return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const token = body?.token;
    if (!token) {
      return Response.json({ error: "TOKEN_REQUIRED" }, { status: 400 });
    }

    const platform = body?.platform || "unknown";
    const userId = session.user.id;

    await prisma.mobilePushToken.upsert({
      where: {
        userId_token: { userId, token },
      },
      update: { platform, updatedAt: new Date() },
      create: { userId, token, platform },
    });

    return Response.json({ ok: true });
  } catch (e) {
    console.error("[PushToken] Save error:", e.message);
    // DB yoksa bile mobil tarafı bloklamamak için ok döndür
    return Response.json({ ok: true, error: e.message });
  }
}