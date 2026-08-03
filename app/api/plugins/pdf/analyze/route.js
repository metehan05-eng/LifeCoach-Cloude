import { NextResponse } from "next/server";
import { analyzePDF, isPDF, scanPDF } from "@/lib/pdf-security";

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let buffer;
    let fileName = "bilinmeyen.pdf";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file) {
        return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
      }
      if (file.type !== "application/pdf" && !file.name?.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json({ error: "Sadece PDF dosyaları kabul edilir." }, { status: 400 });
      }
      fileName = file.name || fileName;
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    } else {
      const body = await request.json();
      const { fileData, fileUrl } = body;
      fileName = body.fileName || fileName;

      if (fileUrl) {
        const res = await fetch(fileUrl, { timeout: 15000 });
        if (!res.ok) {
          return NextResponse.json({ error: "PDF URL'sine erişilemedi." }, { status: 400 });
        }
        const arrayBuffer = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else if (fileData) {
        buffer = Buffer.from(fileData, "base64");
      } else {
        return NextResponse.json({ error: "fileData veya fileUrl gerekli." }, { status: 400 });
      }
    }

    if (!isPDF(buffer)) {
      return NextResponse.json({
        safe: false,
        fileName,
        fileSize: buffer.length,
        riskLevel: "critical",
        warnings: [{ risk: "critical", name: "Geçersiz PDF", description: "Dosya geçerli bir PDF formatında değil. Dosya başlığı %PDF ile başlamıyor." }],
      });
    }

    const result = await analyzePDF(buffer);

    return NextResponse.json({
      safe: result.safe,
      fileName,
      fileSize: buffer.length,
      fileSizeFormatted: `${(buffer.length / 1024).toFixed(1)} KB`,
      pageCount: result.pageCount,
      text: result.safe ? result.text?.slice(0, 8000) : null,
      textLength: result.safe ? result.text?.length || 0 : 0,
      scanResult: result.scanResult,
    });
  } catch (err) {
    console.error("[PDF Analyze Error]", err);
    return NextResponse.json({ error: `PDF işlenirken hata: ${err.message}` }, { status: 500 });
  }
}
