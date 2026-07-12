import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient, isPrismaError } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const AVAILABLE_INTEGRATIONS = [
  {
    type: "google_workspace",
    label: "Gmail & Google Workspace",
    icon: "M",
    description: "Google Drive, Gmail, Calendar ve diğer Google servislerine erişim sağlar.",
  },
];

function isGoogleConfigured() {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT || process.env.GOOGLE_CLIENT_ID);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const userIntegrations = userId
      ? await prismaClient.integration.findMany({
          where: { userId },
          select: { type: true, connected: true, connectedAt: true },
        })
      : [];

    const googleConfigured = isGoogleConfigured();

    const integrations = AVAILABLE_INTEGRATIONS.map((avail) => {
      const userInt = userIntegrations.find((u) => u.type === avail.type);
      return {
        ...avail,
        connected: userInt ? userInt.connected : false,
        connectedAt: userInt?.connectedAt || null,
        available: avail.type === "google_workspace" ? googleConfigured : true,
      };
    });

    return NextResponse.json({ integrations });
  } catch (err) {
    if (isPrismaError(err)) {
      return NextResponse.json({
        integrations: AVAILABLE_INTEGRATIONS.map((a) => ({
          ...a,
          connected: false,
          connectedAt: null,
          available: a.type === "google_workspace" ? isGoogleConfigured() : true,
        })),
      });
    }
    console.error("[GET /api/integrations]", err);
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
    const { type, action } = body;

    if (!type || !["connect", "disconnect"].includes(action)) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    if (type === "google_workspace" && !isGoogleConfigured()) {
      return NextResponse.json({ error: "Google Workspace yapılandırması bulunamadı" }, { status: 400 });
    }

    if (action === "connect") {
      await prismaClient.integration.upsert({
        where: {
          userId_type: { userId: session.user.id, type },
        },
        update: { connected: true },
        create: {
          userId: session.user.id,
          type,
          accessToken: "service_account",
          connected: true,
        },
      });
    } else {
      await prismaClient.integration.deleteMany({
        where: { userId: session.user.id, type },
      });
    }

    const integrations = await prismaClient.integration.findMany({
      where: { userId: session.user.id },
      select: { type: true, connected: true, connectedAt: true },
    });

    const result = AVAILABLE_INTEGRATIONS.map((avail) => {
      const userInt = integrations.find((u) => u.type === avail.type);
      return {
        ...avail,
        connected: userInt ? userInt.connected : false,
        connectedAt: userInt?.connectedAt || null,
        available: avail.type === "google_workspace" ? isGoogleConfigured() : true,
      };
    });

    return NextResponse.json({
      integrations: result,
      message: action === "connect" ? "Bağlandı" : "Bağlantı kesildi",
    });
  } catch (err) {
    console.error("[POST /api/integrations]", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
