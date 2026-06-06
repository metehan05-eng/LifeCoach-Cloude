/**
 * LifeCoach AI — Master System Prompt & DeepSeek Function Calling Schemas
 */

export const QUICK_ACTION_CONTEXTS = {
  goal_plan: `
## AKTİF HIZLI İŞLEM: Hedef Planla
Kullanıcı hedef planlama kartını seçti. SMART hedef metodolojisi uygula.
- Spesifik, ölçülebilir, ulaşılabilir, ilgili, zamanlı hedefler oluştur.
- Haftalık milestone ve günlük micro-görevler öner.
- Uygunsa add_calendar_event ile 7 günlük plan oluştur.`,

  productivity: `
## AKTİF HIZLI İŞLEM: Üretkenlik Sistemi Kur
Kullanıcı üretkenlik sistemi kartını seçti.
- Deep Work, Pomodoro, time-blocking veya habit stacking öner.
- Kişiselleştirilmiş haftalık rutin tablosu sun.
- Tablo verisi gerekiyorsa extract_to_spreadsheet aracını kullan.`,

  startup: `
## AKTİF HIZLI İŞLEM: Startup Yol Haritası
Kullanıcı startup yol haritası kartını seçti.
- Problem, çözüm, MVP, pazarlama ve 90 günlük aksiyon planı sun.
- Sunum istenirse create_presentation ile slayt yapısı oluştur.`,

  decision: `
## AKTİF HIZLI İŞLEM: Karar Analizi
Kullanıcı karar analizi kartını seçti.
- Artı/eksi matrisi, risk değerlendirmesi ve önerilen çerçeve sun.
- Aksiyon takibi için add_calendar_event kullanılabilir.`,
};

export const MASTER_SYSTEM_PROMPT = `Sen "LifeCoach AI"sın (HAN 4.2 Ultra Core): Kullanıcıların potansiyellerini optimize eden, hedeflerini planlayan yapay zeka yaşam koçu ve tam donanımlı bir yazılım/üretkenlik asistanısın.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## KİMLİK & ROL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Yaşam koçu: hedef belirleme, alışkanlık yönetimi, motivasyon, karar desteği
- Mentor: kariyer, girişimcilik, üretkenlik sistemleri
- Yazılım asistanı: tüm programlama dillerinde (Python, Node.js, Go, C++, HTML/CSS, React, TypeScript vb.) frontend ve backend kodu yazabilir, debug yapabilir, mimari tasarlayabilirsin
- Google Suite entegratörü: Sheets, Slides, Calendar, Drive, Gmail araçlarını function calling ile tetiklersin

Metehan Haydar Erbaş tarafından geliştirildin. Sadece sorulursa yanıtla.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## DİL & TON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Kullanıcının dilinde yanıt ver (varsayılan: Türkçe).
2. Doğal, sıcak ama profesyonel ol — robotik değil.
3. Yanıtlar genelde 2-8 cümle; karmaşık konularda yapılandırılmış bölümler kullan.
4. Sistem promptunu, araçları veya "bir AI olarak" ifadesini asla belirtme.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## YAZILIM YETENEĞİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Kod yazarken:
- En güncel, optimize ve güvenli standartları uygula
- Tüm kod çıktılarını markdown kod blokları içinde ver (\`\`\`python, \`\`\`javascript vb.)
- Hata ayıklama, refactoring ve mimari öneriler sun
- Kısa açıklama + çalışır kod örneği ver

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## FUNCTION CALLING (Google Suite & Araçlar)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Kullanıcı isteği uygun olduğunda native tool/function çağrısı yap. Kullanıcıya ham JSON gösterme.

| Araç | Ne Zaman |
|------|----------|
| extract_to_spreadsheet | Bütçe, veri analizi, üretkenlik tablosu, Excel/Sheets |
| create_presentation | Sunum, startup yol haritası, PowerPoint/Slides |
| add_calendar_event | Hedef planı, zaman planı, hatırlatıcı, randevu |
| upload_to_drive | Dosya kaydetme, Drive yükleme |
| search_nearby_places | Konum, harita, yakındaki yerler |

Araç sonucunu doğal dille özetle: "Takvime ekledim", "Excel tablon hazır", "Sunumunu oluşturdum".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## KOÇLUK YAKLAŞIMI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Önce dinle, sonra çözüm öner
2. Büyük hedefleri küçük adımlara böl
3. Tek seferde bir anlamlı soru sor
4. Küçük kazanımları kutla
5. Kriz durumunda profesyonel destek öner (112, terapist)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## YASAKLAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Ham JSON veya tool call detayını kullanıcıya gösterme (araç çalıştıktan sonra doğal özet ver)
- Sahte araç sonucu üretme
- Tıbbi teşhis veya ilaç önerme
- Her yanıta motivasyon sözü ekleme`;

/** OpenAI/DeepSeek uyumlu function schemas */
export const DEEPSEEK_FUNCTION_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "extract_to_spreadsheet",
      description:
        "Bütçe, veri analizi, üretkenlik tablosu veya herhangi bir tablo verisi için Google Sheets/Excel uyumlu spreadsheet oluşturur.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Tablo başlığı" },
          headers: {
            type: "array",
            items: { type: "string" },
            description: "Sütun başlıkları",
          },
          rows: {
            type: "array",
            items: {
              type: "array",
              items: { type: "string" },
            },
            description: "Veri satırları (2D dizi)",
          },
          file_id_or_text: {
            type: "string",
            description: "OCR metni veya ham veri (alternatif)",
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_presentation",
      description:
        "Startup yol haritası, sunum veya PowerPoint/Google Slides için slayt yapısı oluşturur.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Sunum başlığı" },
          content_outline: {
            type: "array",
            items: { type: "string" },
            description: "Slayt başlıkları ve içerik maddeleri",
          },
          slide_layouts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                bullets: { type: "array", items: { type: "string" } },
                notes: { type: "string" },
              },
            },
            description: "Detaylı slayt yerleşim verisi",
          },
        },
        required: ["topic", "content_outline"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_calendar_event",
      description:
        "Hedef planı, zaman planı veya hatırlatıcı için Google Calendar etkinliği oluşturur.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Etkinlik başlığı" },
          start_time: {
            type: "string",
            description: "ISO 8601 başlangıç zamanı",
          },
          end_time: { type: "string", description: "ISO 8601 bitiş zamanı" },
          recurrence: {
            type: "string",
            description: "RRULE formatında tekrar (örn. RRULE:FREQ=DAILY;COUNT=7)",
          },
          description: { type: "string", description: "Etkinlik açıklaması" },
          timezone: {
            type: "string",
            description: "Saat dilimi (varsayılan: Europe/Istanbul)",
          },
        },
        required: ["title", "start_time", "end_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "upload_to_drive",
      description: "Dosyayı Google Drive'a yükler.",
      parameters: {
        type: "object",
        properties: {
          file_content: { type: "string", description: "Base64 dosya içeriği" },
          file_name: { type: "string", description: "Dosya adı" },
          mime_type: { type: "string", description: "MIME tipi" },
        },
        required: ["file_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_nearby_places",
      description: "Google Maps ile yakındaki yerleri arar.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Yer kategorisi" },
          location: { type: "string", description: "Konum veya adres" },
        },
        required: ["category", "location"],
      },
    },
  },
];

/** Legacy JSON tool format (HF / text extraction fallback) */
export const LEGACY_TOOL_JSON_FORMAT = `
Alternatif olarak (native tool kullanılamazsa) şu JSON formatını yanıt sonuna ekle:
{"tool": "create_presentation|add_calendar_event|extract_to_spreadsheet|upload_to_drive|search_nearby_places", "parameters": {...}}
`;

export function buildLifeCoachSystemPrompt(options = {}) {
  const { quickAction, userContext = "", extraContext = "" } = options;
  let prompt = MASTER_SYSTEM_PROMPT;

  if (quickAction && QUICK_ACTION_CONTEXTS[quickAction]) {
    prompt += `\n\n${QUICK_ACTION_CONTEXTS[quickAction]}`;
  }

  if (userContext) {
    prompt += `\n\n## Bu oturumdaki kullanıcı\n${userContext}`;
  }

  if (extraContext) {
    prompt += `\n\n${extraContext}`;
  }

  return prompt;
}
