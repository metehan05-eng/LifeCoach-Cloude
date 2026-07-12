import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { callQwenModel } from "@/lib/modules-ai";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `Sen bir öğrenme rehberi uzmanısın. Kullanıcının verdiği konu hakkında kapsamlı bir öğrenme yol haritası oluştur.

Yanıtını KESİNLİKLE aşağıdaki JSON yapısında ver:

{
  "title": "Konu başlığı",
  "summary": "Kısa bir özet ve öğrenme hedefi (1-2 cümle)",
  "totalDuration": "Toplam süre (örn: 8 hafta)",
  "difficulty": "Başlangıç | Orta | İleri",
  "phases": [
    {
      "name": "Faz adı",
      "duration": "Süre",
      "description": "Bu fazda ne öğrenileceğine dair açıklama",
      "topics": ["Konu 1", "Konu 2", "Konu 3"],
      "resources": [
        { "title": "Kaynak adı", "type": "video | makale | kitap | kurs | proje", "url": "" }
      ],
      "milestones": ["Kazanım 1", "Kazanım 2"],
      "weeklyPlan": "Haftalık çalışma planı önerisi"
    }
  ],
  "tips": ["Öneri 1", "Öneri 2"],
  "prerequisites": ["Ön koşul 1", "Ön koşul 2"]
}

Her faz bir öncekinin üzerine inşa edilmeli. Başlangıçtan ileri seviyeye doğru ilerle. Kaynak URL'leri boş bırakabilirsin.`;

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { topic } = body;

    if (!topic?.trim()) {
      return NextResponse.json({ error: "Konu metni boş olamaz" }, { status: 400 });
    }

    const result = await callQwenModel(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Şu konu hakkında bir öğrenme rehberi oluştur: ${topic}` },
      ],
      4000,
      { response_format: { type: "json_object" } }
    );

    let roadmap;
    try {
      roadmap = typeof result === "string" ? JSON.parse(result) : result;
    } catch {
      return NextResponse.json({ error: "AI yanıtı ayrıştırılamadı" }, { status: 500 });
    }

    if (roadmap.error === "AI_UNAVAILABLE") {
      roadmap = getMockLearningGuide(topic);
    }

    return NextResponse.json({ roadmap });
  } catch (err) {
    console.error("[POST /api/modules/learning-guide]", err);
    const roadmap = getMockLearningGuide(body?.topic || "Genel Konu");
    return NextResponse.json({ roadmap, mock: true });
  }
}

function getMockLearningGuide(topic) {
  return {
    title: `${topic} Öğrenme Rehberi`,
    summary: `${topic} konusunu sıfırdan ileri seviyeye kadar adım adım öğrenmek için yapılandırılmış bir yol haritası.`,
    totalDuration: "8 hafta",
    difficulty: "Başlangıç",
    phases: [
      {
        name: "Temel Kavramlar",
        duration: "2 hafta",
        description: `${topic} konusunun temel kavramlarını ve terminolojisini öğrenin.`,
        topics: ["Giriş ve Temel Kavramlar", "Temel Terminoloji", "İlk Uygulamalar"],
        resources: [
          { title: "Başlangıç Rehberi", type: "makale", url: "" },
          { title: "Giriş Videosu", type: "video", url: "" },
        ],
        milestones: ["Temel kavramları açıklayabilme", "Basit uygulamalar yapabilme"],
        weeklyPlan: "Haftada 5 saat çalışma önerilir.",
      },
      {
        name: "Orta Seviye",
        duration: "3 hafta",
        description: "Orta seviye konulara geçiş ve pratik uygulamalar.",
        topics: ["Orta Seviye Konular", "Pratik Projeler", "Araçlar ve Teknikler"],
        resources: [
          { title: "Orta Seviye Kurs", type: "kurs", url: "" },
          { title: "Örnek Projeler", type: "proje", url: "" },
        ],
        milestones: ["Bağımsız proje geliştirebilme", "Karşılaşılan sorunları çözebilme"],
        weeklyPlan: "Haftada 8 saat çalışma önerilir.",
      },
      {
        name: "İleri Seviye",
        duration: "3 hafta",
        description: "İleri düzey konular ve uzmanlaşma.",
        topics: ["İleri Düzey Konular", "Optimizasyon", "Gerçek Dünya Projeleri"],
        resources: [
          { title: "İleri Seviye Kaynaklar", type: "kitap", url: "" },
          { title: "Kapsamlı Proje", type: "proje", url: "" },
        ],
        milestones: ["Karmaşık projeler geliştirebilme", "Başkalarına öğretebilme"],
        weeklyPlan: "Haftada 10 saat çalışma önerilir.",
      },
    ],
    tips: [
      "Her gün düzenli olarak küçük adımlarla ilerleyin",
      "Öğrendiklerinizi bir projede uygulayın",
      "Topluluklara katılıp sorular sorun",
    ],
    prerequisites: ["Temel bilgisayar okuryazarlığı", "Öğrenme isteği ve azim"],
  };
}
