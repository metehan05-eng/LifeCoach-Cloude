import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { callQwenModel } from "@/lib/modules-ai";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `Sen bir müzik yapımcısı ve ses mühendisisin. Kullanıcının verdiği müzik tarzını veya ruh halini analiz edip zengin bir müzik üretim prompt'una dönüştürüyorsun.

Yanıtını KESİNLİKLE aşağıdaki JSON yapısında ver:

{
  "title": "Parça başlığı",
  "genre": "Tür",
  "mood": "Ruh hali",
  "bpm": 120,
  "key": "Anahtar (örn: C major, A minor)",
  "instruments": ["Enstrüman 1", "Enstrüman 2"],
  "description": "Müziğin kısa bir betimlemesi",
  "productionPrompt": "Müzik üretim API'si için detaylı İngilizce prompt",
  "duration": "Süre önerisi (örn: 3 dakika)"
}`;

// Mock music generation — returns a sample audio URL
function getMockAudioUrl(genre) {
  const samples = [
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
  ];
  return samples[Math.floor(Math.random() * samples.length)];
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { prompt } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Müzik tanımı boş olamaz" }, { status: 400 });
    }

    let analysis;
    try {
      const result = await callQwenModel(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Şu tarzda/ruh halinde bir müzik analizi yap: ${prompt}` },
        ],
        2000,
        { response_format: { type: "json_object" } }
      );

      analysis = typeof result === "string" ? JSON.parse(result) : result;
    } catch {
      analysis = {
        title: `${prompt} Tarzında Parça`,
        genre: prompt,
        mood: "Belirtilmemiş",
        bpm: 120,
        key: "C major",
        instruments: ["Piyano", "Gitar", "Davul"],
        description: `${prompt} tarzında bir müzik parçası.`,
        productionPrompt: `Create a piece of ${prompt} music with piano, guitar and drums at 120 BPM in C major.`,
        duration: "3 dakika",
      };
    }

    if (analysis.error === "AI_UNAVAILABLE") {
      analysis = {
        title: `${prompt} Tarzında Parça`,
        genre: prompt,
        mood: "Huzurlu",
        bpm: 120,
        key: "C major",
        instruments: ["Piyano", "Gitar", "Davul"],
        description: `${prompt} tarzında huzurlu bir müzik parçası.`,
        productionPrompt: `Create a piece of ${prompt} music with piano, guitar and drums at 120 BPM in C major.`,
        duration: "3 dakika",
      };
    }

    // Mock audio URL (gerçek bir API entegrasyonu burada olacak)
    const audioUrl = getMockAudioUrl(analysis.genre);

    return NextResponse.json({
      analysis,
      audioUrl,
      mockAudio: true,
    });
  } catch (err) {
    console.error("[POST /api/modules/music]", err);
    return NextResponse.json({
      analysis: {
        title: `${body?.prompt || "Belirtilmemiş"} Tarzında Parça`,
        genre: body?.prompt || "Belirtilmemiş",
        mood: "Nötr",
        bpm: 120,
        key: "C major",
        instruments: ["Piyano", "Gitar", "Davul"],
        description: `${body?.prompt || "Belirtilmemiş"} tarzında bir müzik parçası.`,
        productionPrompt: "",
        duration: "3 dakika",
      },
      audioUrl: getMockAudioUrl("genel"),
      mockAudio: true,
      error: "AI kullanılamadı, varsayılan değerler döndürüldü",
    });
  }
}
