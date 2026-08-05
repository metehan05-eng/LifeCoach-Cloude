import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { prismaClient } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { PLUGINS } from "@/lib/plugins/plugin-registry";
import { getPluginKeyStatus } from "@/lib/plugins/dev-integrations";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    let activePluginIds = ['web_search']; // Varsayılan aktif olanlar

    if (userId) {
      const userPlugins = await prismaClient.userPlugin?.findMany({
        where: { userId, enabled: true },
        select: { pluginId: true },
      }).catch(() => null);

      if (userPlugins && userPlugins.length > 0) {
        activePluginIds = userPlugins.map(p => p.pluginId);
      }
    }

    const pluginsWithStatus = PLUGINS.map(plugin => {
      const keyStatus = getPluginKeyStatus(plugin.id);
      return {
        ...plugin,
        enabled: activePluginIds.includes(plugin.id),
        keyConfigured: keyStatus.configured,
        keyMissing: keyStatus.missing,
      };
    });

    return NextResponse.json({
      plugins: pluginsWithStatus,
      activeCount: activePluginIds.length
    });
  } catch (err) {
    console.error("[GET /api/plugins]", err);
    return NextResponse.json({ plugins: PLUGINS.map(p => ({ ...p, enabled: false })) });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { pluginId, enabled } = body;

    if (!pluginId) {
      return NextResponse.json({ error: "Plugin ID gerekli" }, { status: 400 });
    }

    if (enabled) {
      const keyStatus = getPluginKeyStatus(pluginId);
      if (keyStatus.required && !keyStatus.configured) {
        return NextResponse.json(
          { error: `Bu eklenti için sunucuda ${keyStatus.missing.join(', ')} tanımlı değil.`, code: 'KEY_MISSING' },
          { status: 400 }
        );
      }
    }

    if (session?.user?.id) {
      try {
        await prismaClient.userPlugin.upsert({
          where: {
            userId_pluginId: { userId: session.user.id, pluginId },
          },
          update: { enabled },
          create: {
            userId: session.user.id,
            pluginId,
            enabled,
          },
        });
      } catch (dbErr) {
        console.warn("DB userPlugin tablosu erişilemedi, falling back to session-state response", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      pluginId,
      enabled,
      message: enabled ? "Eklenti aktif edildi" : "Eklenti devre dışı bırakıldı"
    });
  } catch (err) {
    console.error("[POST /api/plugins]", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
