import { NextResponse } from "next/server";
import { executePluginTool } from "@/lib/plugins/plugin-executor";

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { functionName, args } = body;

    if (!functionName) {
      return NextResponse.json({ error: "Fonksiyon adı gereklidir" }, { status: 400 });
    }

    const result = await executePluginTool(functionName, args || {});

    return NextResponse.json({
      success: true,
      functionName,
      result
    });
  } catch (err) {
    console.error("[POST /api/plugins/execute]", err);
    return NextResponse.json({ error: err.message || "Eklenti yürütülemedi" }, { status: 500 });
  }
}
