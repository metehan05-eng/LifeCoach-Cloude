import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import mammoth from 'mammoth'; 
import * as xlsx from 'xlsx';
import { JWT } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GOOGLE_SERVICE_ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT; // JSON string of service account
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_DELEGATED_USER = process.env.GOOGLE_DELEGATED_USER;
const GOOGLE_GMAIL_USER = process.env.GOOGLE_GMAIL_USER || GOOGLE_DELEGATED_USER;
const GOOGLE_CALENDAR_USER = process.env.GOOGLE_CALENDAR_USER || GOOGLE_DELEGATED_USER;
const GOOGLE_DRIVE_USER = process.env.GOOGLE_DRIVE_USER || GOOGLE_DELEGATED_USER;
const GOOGLE_SLIDES_SCOPES = ['https://www.googleapis.com/auth/presentations'];
const GOOGLE_DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const GOOGLE_GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar'];
const GOOGLE_VISION_SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

function parseGoogleServiceAccount() {
  if (!GOOGLE_SERVICE_ACCOUNT) return null;
  try {
    return JSON.parse(GOOGLE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error('[Google] Service account JSON parse error', err);
    return null;
  }
}

async function getGoogleAccessToken(scopes, subject) {
  const key = parseGoogleServiceAccount();
  if (!key) throw new Error('GOOGLE_SERVICE_ACCOUNT env not set or invalid');
  const client = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes,
    subject: subject || key.client_email
  });
  await client.authorize();
  let token = client.credentials?.access_token;
  if (!token) {
    const accessResponse = await client.getAccessToken();
    token = (accessResponse && (accessResponse.token || accessResponse)) || null;
  }
  if (!token) throw new Error('Could not obtain Google access token');
  return token;
}

async function extractTextFromImage(base64Image) {
  try {
    const token = await getGoogleAccessToken(GOOGLE_VISION_SCOPES);
    const resp = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: 'TEXT_DETECTION', maxResults: 10 }]
          }
        ]
      })
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Vision API error: ${text}`);
    }
    const data = await resp.json();
    return data.responses?.[0]?.fullTextAnnotation?.text || data.responses?.[0]?.textAnnotations?.[0]?.description || '';
  } catch (err) {
    console.error('[Vision] error', err);
    return '';
  }
}

function normalizeSpreadsheetRows(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(0, 200);
  if (lines.length === 0) return [['Extracted Text']];
  const rows = [];
  lines.forEach(line => {
    let cells = line.split(/\t| {2,}|,|;|\|/).map(c => c.trim()).filter(Boolean);
    if (cells.length <= 1) {
      const tokens = line.split(/\s+/).filter(Boolean);
      if (tokens.length <= 1) {
        cells = [line];
      } else {
        const mid = Math.ceil(tokens.length / 2);
        cells = [tokens.slice(0, mid).join(' '), tokens.slice(mid).join(' ')];
      }
    }
    rows.push(cells);
  });
  if (rows.length > 0 && rows[0].length === 1) {
    rows.unshift(['Item']);
  }
  return rows;
}

async function uploadFileToDrive(name, mimeType, base64Data) {
  const token = await getGoogleAccessToken([...GOOGLE_DRIVE_SCOPES], GOOGLE_DRIVE_USER);
  const boundary = `-------LifeCoachDrive${Date.now()}`;
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify({ name, mimeType }),
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    'Content-Transfer-Encoding: base64',
    '',
    base64Data,
    `--${boundary}--`
  ].join('\r\n');
  const resp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Drive upload failed: ${text}`);
  }
  const data = await resp.json();
  return {
    id: data.id,
    url: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`
  };
}

async function sendGmailMessage(to, subject, content) {
  if (!GOOGLE_GMAIL_USER) throw new Error('GOOGLE_GMAIL_USER env not set');
  const token = await getGoogleAccessToken(GOOGLE_GMAIL_SCOPES, GOOGLE_GMAIL_USER);
  const raw = Buffer.from([
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    content
  ].join('\r\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gmail send failed: ${text}`);
  }
  return await resp.json();
}

async function createCalendarEvents(events) {
  if (!GOOGLE_CALENDAR_USER) throw new Error('GOOGLE_CALENDAR_USER env not set');
  const token = await getGoogleAccessToken(GOOGLE_CALENDAR_SCOPES, GOOGLE_CALENDAR_USER);
  const results = [];
  for (const event of events) {
    const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Calendar event creation failed: ${text}`);
    }
    const data = await resp.json();
    results.push({ id: data.id, htmlLink: data.htmlLink, summary: data.summary });
  }
  return results;
}

async function searchGoogleMaps(query) {
  if (!GOOGLE_MAPS_API_KEY) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.results?.[0];
    if (!place) return null;
    return {
      name: place.name,
      address: place.formatted_address,
      location: place.geometry?.location,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.formatted_address)}`
    };
  } catch (err) {
    console.error('[GoogleMaps] error', err);
    return null;
  }
}

// --- DuckDuckGo Web Search (Fast & Accurate) ---
async function searchWithDuckDuckGo(query) {
  try {
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const response = await fetch(searchUrl, {
      headers: { 'User-Agent': 'LifeCoach-AI/1.0' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) throw new Error('DuckDuckGo search failed');
    const data = await response.json();
    
    let results = [];
    
    // Instant answer/abstract
    if (data.AbstractText) {
      results.push({
        source: 'DuckDuckGo',
        snippet: data.AbstractText,
        url: data.AbstractURL || ''
      });
    }
    
    // Related topics (up to 3)
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, 3).forEach(topic => {
        if (topic.Text) {
          results.push({
            title: topic.FirstURL ? 'Search Result' : 'Related Topic',
            snippet: topic.Text.substring(0, 200),
            url: topic.FirstURL || ''
          });
        }
      });
    }
    
    return results.length > 0 ? results : null;
  } catch (error) {
    console.error('[DuckDuckGo Search] Error:', error.message);
    return null;
  }
}

// --- YouTube Video Suggestions ---
async function searchYouTubeVideos(query, maxResults = 1) {
  if (!YOUTUBE_API_KEY) return null;
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(query)}&relevanceLanguage=tr&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url, { headers: { 'Referer': 'https://lifecoach.ai/' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;
    return data.items.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || ''
    }));
  } catch (err) {
    console.error('[YouTube] Error:', err);
    return null;
  }
}

// --- Excel (XLSX) generator ---
function createExcelBufferFromData(dataArray2D = [['No data']]) {
  try {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet(dataArray2D);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buffer.toString('base64');
  } catch (err) {
    console.error('[Excel] generation error', err);
    return null;
  }
}

// --- Minimal Google Slides creator (requires service account JSON in env) ---
async function createGooglePresentation(title = 'New Presentation') {
  if (!GOOGLE_SERVICE_ACCOUNT) throw new Error('GOOGLE_SERVICE_ACCOUNT env not set');
  try {
    const key = JSON.parse(GOOGLE_SERVICE_ACCOUNT);
    const client = new JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: GOOGLE_SLIDES_SCOPES
    });
    await client.authorize();
    let token = client.credentials?.access_token;
    if (!token) {
      const at = await client.getAccessToken();
      token = (at && (at.token || at)) || null;
    }
    if (!token) throw new Error('Could not obtain Google access token');

    const resp = await fetch('https://slides.googleapis.com/v1/presentations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error('Slides API error: ' + txt);
    }
    const data = await resp.json();
    return {
      presentationId: data.presentationId,
      presentationUrl: `https://docs.google.com/presentation/d/${data.presentationId}/edit`
    };
  } catch (err) {
    console.error('[GoogleSlides] error', err);
    throw err;
  }
}

// --- Qwen DashScope Service (Singapore Region) ---
async function callQwenDashScope(systemPrompt, userMessages, model = 'qwen-flash', maxTokens = 4096) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY ayarlı değil.');
  
  const dashMessages = [{ role: 'system', content: systemPrompt }];
  for (const msg of userMessages) {
    if (msg.role === 'user') dashMessages.push({ role: 'user', content: msg.content });
    else if (msg.role === 'assistant') dashMessages.push({ role: 'assistant', content: msg.content });
  }

  // Singapore region endpoint (dashscope-intl.aliyuncs.com routes to SG data center)
  const response = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: { messages: dashMessages }, parameters: { result_format: 'message', temperature: 0.7, top_p: 0.8, max_tokens: maxTokens } }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) throw new Error(`Qwen API Error: ${response.status}`);
  const data = await response.json();
  const content = data?.output?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Qwen boş yanıt döndürdü.');
  return content;
}

// --- SUPABASE HAZIRLIĞI ---
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

const BASE_SYSTEM_PROMPT = `You are LifeCoach AI, a supportive and intelligent life management assistant designed to help users improve their daily lives realistically and sustainably.

Your personality:
- Calm
- Friendly
- Emotionally intelligent
- Honest but respectful
- Motivating without sounding fake
- Smart like a trusted companion
- Never arrogant or robotic

Your communication style:
- Speak naturally like a real supportive person
- Avoid sounding like a corporate assistant
- Avoid cringe “hustle culture” motivation
- Keep responses clean, clear, and emotionally balanced
- Use encouraging language without exaggeration
- Sometimes use humor naturally
- Adapt your tone depending on the user's mood
- Speak in the same language as the user (detect automatically). If user writes in Turkish, respond in Turkish; if in English, respond in English; support all languages.

How to talk with users:
- If the user is stressed:
  Speak calmly and simplify things

Example:
“Let’s slow things down a little. You don’t need to solve everything tonight.”

- If the user feels unmotivated:
  Encourage small progress

Example:
“You don’t need a perfect day. One small step is still progress.”

- If the user succeeds:
  Celebrate naturally without overreacting

Example:
“Nice work. Consistency like this matters more than perfection.”

- If the user feels overwhelmed:
  Reduce pressure and organize priorities

Example:
“Focus on one thing first. We can build the rest step-by-step.”

- If the user talks casually:
  Respond casually and comfortably while staying helpful

Example:
“Yeah, that sounds exhausting honestly. Let’s make it simpler.”

Your mission:
- Help users improve habits
- Help users reduce stress and burnout
- Build discipline gradually
- Help users organize goals realistically
- Support emotional balance
- Improve productivity without mental overload

Rules:
- Never insult the user
- Never shame failures
- Never use toxic motivation
- Never encourage unhealthy behavior
- Never pretend to be a therapist
- Never pressure users aggressively
- Never give unrealistic “be perfect” advice

Productivity philosophy:
- Small consistent actions are better than extreme motivation
- Sustainable routines matter more than intensity
- Mental health and productivity should work together
- Rest is part of progress

Goal system behavior:
- Break big goals into small achievable tasks
- Encourage consistency
- Use XP, streaks, achievements, and progress systems positively
- Reward effort, not only results

Examples of good responses:
- “Progress takes time.”
- “You’re doing better than you think.”
- “Let’s make today manageable first.”
- “Small improvements still count.”
- “Consistency beats perfection.”

Identity:
You are not just an AI chatbot.
You are a realistic life improvement companion designed to help users grow without pressure.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, history, email, sessionId, mode, userLanguage, attachments, deepSearch } = req.body;
    const countryCode = req.headers['x-vercel-ip-country'] || 'Unknown';
    // Detect language from user input or default to English
    const detectedLang = req.body.userLanguage || 
                      (req.body.message && /[a-zA-Z]/.test(req.body.message) ? 'en' : 'tr') || 
                      'en';

    // 1. KULLANICI VERILERINI CEK (XP, LEVEL, STREAK)
    let userId = null;
    let userName = "User";
    let userStats = { xp: 0, level: 1, streak: 0, nextLevelXp: 100 };

    if (email) {
      try {
        const userData = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, xp: true, level: true, currentStreak: true, totalXp: true, plan: true, usageLimit: true, usageCount: true, lastActiveAt: true }
        });
        if (userData) {
          userId = userData.id;
          userName = userData.name || "Gezgin";

          let updatedUsageCount = userData.usageCount;
          // 5-Saatlik Sıfırlama Mantığı
          if (userData.plan === 'FREE' && userData.lastActiveAt) {
            const hoursSinceLastActive = (new Date() - new Date(userData.lastActiveAt)) / (1000 * 60 * 60);
            if (hoursSinceLastActive >= 5) {
              updatedUsageCount = 0;
            }
          }

          userStats = {
            xp: userData.xp,
            level: userData.level,
            streak: userData.currentStreak,
            nextLevelXp: 100,
            plan: userData.plan,
            usageLimit: userData.usageLimit,
            usageCount: updatedUsageCount
          };
        }
      } catch (e) { console.error("User fetch error:", e); }
    }

    // --- SUBSCRIPTION LIMIT CHECK ---
    if (userId && userStats.plan === 'FREE' && userStats.usageCount >= userStats.usageLimit) {
      return res.status(403).json({
        error: "LIMIT_REACHED",
        message: "Günlük mesaj limitine ulaştın. Sınırsız erişim ve daha güçlü modeller için Premium'a geç!"
      });
    }

    // EĞER SADECE STATS İSTENDİYSE BURADA DUR
    if (req.query.just_stats === 'true') {
      return res.status(200).json({ stats: userStats });
    }

    // 2. DOSYA İŞLEME (PDF, DOCX, XLSX)
    let extractedText = "";
    let imagesForVision = [];

    if (attachments && attachments.length > 0) {
      for (const at of attachments) {
        if (at.type === 'image') {
          imagesForVision.push(at.data);
        } else if (at.type === 'file') {
          const buffer = Buffer.from(at.data, 'base64');
          try {
            if (at.ext === 'PDF') {
              const data = await pdf(buffer);
              extractedText += `\n--- [DOSYA: ${at.name} (PDF)] ---\n${data.text}\n`;
            } else if (at.ext === 'DOCX') {
              const { value } = await mammoth.extractRawText({ buffer });
              extractedText += `\n--- [DOSYA: ${at.name} (WORD)] ---\n${value}\n`;
            } else if (at.ext === 'XLSX') {
              const workbook = xlsx.read(buffer);
              const sheetName = workbook.SheetNames[0];
              const csv = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]);
              extractedText += `\n--- [DOSYA: ${at.name} (EXCEL)] ---\n${csv}\n`;
            }
          } catch (e) {
            console.error(`File parsing error (${at.name}):`, e);
          }
        }
      }
    }

    // --- Additional tool triggers: YouTube suggestions / generate Excel / create Slides / Drive / Gmail / Calendar / Maps ---
    let generated_files = [];
    let youtube_suggestions = null;
    let tool_notes = [];
    let calendar_events = [];
    let maps_result = null;
    let gmail_result = null;

    try {
      const msgLower = (message || '').toLowerCase();
      const wantsYouTube = /youtube|video öneri|video önerileri|youtube öneri|youtube önerileri/.test(msgLower);
      const wantsExcel = /excel oluştur|excel dosya|xlsx oluştur|excel dosyası|tablo oluştur|tablo|listele/.test(msgLower);
      const wantsSlides = /slide oluştur|sunum oluştur|sunum hazırla|presentation oluştur|presentation/.test(msgLower);
      const wantsDrive = /drive|google drive|dosya yükle|drive'a kaydet|google drive/.test(msgLower);
      const wantsGmail = /mail gönder|e-?posta gönder|gmail gönder|mail at|email gönder/.test(msgLower);
      const wantsCalendar = /takvim|calendar|plan yap|planlama|haftalık plan|aylık plan|yıllık plan/.test(msgLower);
      const wantsMaps = /harita|maps|mesafe|uzak|gitmek istiyorum|nereye gitsem|bunu bul|yol tarifi/.test(msgLower);
      const wantsOCRExcel = attachments && attachments.some(at => at.type === 'image') && /excel|tablo|liste|isim|numara|numaraları/.test(msgLower);

      if (wantsYouTube) {
        try {
          youtube_suggestions = await searchYouTubeVideos(message || userName, 1);
          if (youtube_suggestions && youtube_suggestions.length > 0) {
            tool_notes.push('YouTube için size tek bir video önerisi buldum.');
          }
        } catch (e) {
          console.error('YouTube suggestion error', e);
        }
      }

      if (wantsOCRExcel && GOOGLE_SERVICE_ACCOUNT) {
        try {
          const image = attachments.find(at => at.type === 'image');
          const extracted = image ? await extractTextFromImage(image.data) : '';
          if (extracted) {
            const rows = normalizeSpreadsheetRows(extracted);
            const base64 = createExcelBufferFromData(rows);
            if (base64) {
              generated_files.push({ filename: `image-extracted-${Date.now()}.xlsx`, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', content_base64: base64 });
              tool_notes.push('Görüntüdeki metni Excel tablosuna dönüştürdüm.');
            }
          }
        } catch (e) {
          console.error('OCR Excel error', e);
        }
      }

      if (wantsExcel && !generated_files.some(f => f.mime.includes('spreadsheet'))) {
        try {
          let rows = [];
          if (extractedText) {
            rows = normalizeSpreadsheetRows(extractedText);
          }
          if (rows.length === 0) {
            rows = [['Sample', 'Value'], ['Example', '1']];
          }
          const base64 = createExcelBufferFromData(rows);
          if (base64) {
            generated_files.push({ filename: `lifecoach_${Date.now()}.xlsx`, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', content_base64: base64 });
            tool_notes.push('Excel dosyası oluşturuldu.');
          }
        } catch (e) {
          console.error('Excel generate error', e);
        }
      }

      if (wantsSlides && GOOGLE_SERVICE_ACCOUNT) {
        try {
          const titleMatch = (message || '').match(/(?:sunum|slide|presentation)[:\- ]+(.+)/i);
          const title = titleMatch ? titleMatch[1].trim() : `LifeCoach Presentation ${new Date().toISOString().slice(0,10)}`;
          const pres = await createGooglePresentation(title);
          if (pres) {
            generated_files.push({ filename: `${title}.gslides`, mime: 'application/vnd.google-apps.presentation', url: pres.presentationUrl, id: pres.presentationId });
            tool_notes.push('Google Slides sunumu oluşturuldu.');
          }
        } catch (e) {
          console.error('Slides create error', e);
        }
      }

      if (wantsDrive && GOOGLE_SERVICE_ACCOUNT) {
        try {
          if (generated_files.length > 0 && generated_files[0].content_base64) {
            const file = generated_files[0];
            const driveFile = await uploadFileToDrive(file.filename, file.mime, file.content_base64);
            file.url = driveFile.url;
            tool_notes.push('Dosyanız Google Drive’a yüklendi.');
          } else {
            const textContent = extractedText || message || 'LifeCoach AI notları';
            const base64 = Buffer.from(textContent.substring(0, 10000), 'utf8').toString('base64');
            const driveFile = await uploadFileToDrive(`lifecoach-note-${Date.now()}.txt`, 'text/plain', base64);
            generated_files.push({ filename: `lifecoach-note-${Date.now()}.txt`, mime: 'text/plain', url: driveFile.url });
            tool_notes.push('Google Drive’da bir not dosyası oluşturdum.');
          }
        } catch (e) {
          console.error('Drive integration error', e);
        }
      }

      if (wantsGmail && GOOGLE_SERVICE_ACCOUNT && GOOGLE_GMAIL_USER) {
        try {
          const emailMatch = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
          const subjectMatch = message.match(/(?:konu|subject)[:\-]\s*([^\n]+)/i);
          const bodyMatch = message.match(/(?:mesaj|message)[:\-]\s*([\s\S]+)/i);
          const to = emailMatch?.[0];
          const subject = subjectMatch?.[1]?.trim() || 'LifeCoach AI Gönderisi';
          const body = bodyMatch?.[1]?.trim() || message.replace(emailMatch?.[0] || '', '').trim();
          if (to) {
            const gmailResponse = await sendGmailMessage(to, subject, body);
            gmail_result = gmailResponse;
            tool_notes.push(`E-posta ${to} adresine gönderildi.`);
          } else {
            tool_notes.push('E-posta göndermek için geçerli bir alıcı adresi bulunamadı.');
          }
        } catch (e) {
          console.error('Gmail send error', e);
        }
      }

      if (wantsCalendar && GOOGLE_SERVICE_ACCOUNT && GOOGLE_CALENDAR_USER) {
        try {
          const now = new Date();
          let events = [];
          const timezone = 'Europe/Istanbul';
          if (/yıllık/.test(msgLower)) {
            const start = new Date(now.getFullYear() + 1, 0, 2, 10, 0, 0);
            events.push({
              summary: 'Yıllık planlama oturumu',
              description: message,
              start: { dateTime: start.toISOString(), timeZone: timezone },
              end: { dateTime: new Date(start.getTime() + 60 * 60 * 1000).toISOString(), timeZone: timezone }
            });
          } else if (/aylık/.test(msgLower)) {
            const start = new Date(now.getFullYear(), now.getMonth() + 1, 3, 10, 0, 0);
            events.push({
              summary: 'Aylık hedef kontrolü',
              description: message,
              start: { dateTime: start.toISOString(), timeZone: timezone },
              end: { dateTime: new Date(start.getTime() + 60 * 60 * 1000).toISOString(), timeZone: timezone }
            });
          } else {
            const first = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            first.setHours(18, 0, 0, 0);
            events = [
              { summary: 'Haftalık planlama', description: message, start: { dateTime: first.toISOString(), timeZone: timezone }, end: { dateTime: new Date(first.getTime() + 60 * 60 * 1000).toISOString(), timeZone: timezone } },
              { summary: 'Gelişim hedeflerini gözden geçirme', description: message, start: { dateTime: new Date(first.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), timeZone: timezone }, end: { dateTime: new Date(first.getTime() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), timeZone: timezone } }
            ];
          }
          calendar_events = await createCalendarEvents(events);
          if (calendar_events.length > 0) {
            tool_notes.push('Google Takvim için toplantı/plan oluşturuldu.');
          }
        } catch (e) {
          console.error('Calendar integration error', e);
        }
      }

      if (wantsMaps && GOOGLE_MAPS_API_KEY) {
        try {
          maps_result = await searchGoogleMaps(message || userName);
          if (maps_result) {
            tool_notes.push(`Google Maps üzerinde bir sonuç buldum: ${maps_result.name}`);
          }
        } catch (e) {
          console.error('Maps search error', e);
        }
      }
    } catch (e) {
      console.error('Tool triggers error', e);
    }

    // 4. SISTEM PROMPT HAZIRLA
let systemInstruction = `You are HAN AI Life Coach. You are disciplined, efficient, and growth-focused.
User Name: ${userName}
User Level: ${userStats.level}
Current XP: ${userStats.xp}/100
Current Streak: ${userStats.streak} days

RULES:
1. Always encourage user growth.
2. When the user says they have achieved a goal, make them feel they earned XP.
3. Tone: Mentor — supportive and adaptive; mirror the user's tone and language automatically. Do NOT default to an aggressive "drill sergeant" tone unless explicitly requested.
4. Detect and mirror the user's language.`;

  // Enforce hard safety rule: never use coercive/drill-sergeant language unless explicitly requested
  systemInstruction += `

HARD RULES:
- NEVER adopt a coercive, shaming, or 'drill sergeant' style unless the request explicitly contains the phrase "drill sergeant" or the field req.body.force_mode === 'drill_sergeant'.
- If the user sends a simple greeting (e.g., "merhaba", "hello"), reply with a neutral, mirror-style greeting only.
- Do NOT issue commands like "No excuses" or demand rituals unless explicitly requested by the user.`;

    // OTOMASYON MODU ÖZEL TALİMATI
    if (req.body.automation_mode) {
      systemInstruction += `
      Şu an "YAŞAM OTOMASYONU" modundasın. 
      Görevin: Kullanıcının rutin isteğini analiz et ve son mesajında ŞU FORMATTA bir JSON objesi döndür:
      [[AUTOMATION_DATA: {"title": "Görev Adı", "time": "HH:MM", "repeat": "daily", "duration": 30} ]]
      Kullanıcıyla normal konuşmaya devam et ama bu JSON'ı mutlaka gizli bir not gibi cevabına ekle.`;
    }
    // By default do NOT inject full gamification status into system prompt to avoid showing levels on first message.
    // If client explicitly requests gamification context include it via `show_gamification` flag in request body.
    let gamificationInjection = '';
    if (req.body && req.body.show_gamification) {
      gamificationInjection = `\n--- GAMIFICATION STATUS ---\nLevel: ${userStats.level}\nXP: ${userStats.xp}/100\nStreak: ${userStats.streak} Days\nAI NOTE: Inform user about their progress and motivate them to level up. E.g.: "Completing this task will get you to Level ${userStats.level + 1}!"`;
    }
    const localizationInjection = `\n\n--- CONTEXT ---\nUser: ${userName}\nLocation: ${countryCode}\nLanguage: ${detectedLang}${gamificationInjection}`;

    // ==========================================
    // WEB SEARCH ENGINE (DuckDuckGo - Fast & Accurate)
    // Only for real-time information queries
    // ==========================================
    let searchSources = [];  // Sources to display to user
    let searchContextInjection = "";

    if (message) {
      const msgLower = message.toLowerCase().trim();

      // Short messages or greetings → skip search
      const isGreeting = /^(merhaba|selam|hi|hello|hey|günaydın|tünaydın|iyi akşam|iyi gece|nasılsın|naber|ne var|how are)/i.test(msgLower);
      const isShortQuery = message.trim().split(/\s+/).length < 4;
      const isPersonalQuestion = /(benim|bana|hedefim|planım|yardım et|ne yapmalıyım|tavsiye|öneri|düşünce|fikir)/i.test(msgLower);

      // Real-time information triggers
      const needsSearch = deepSearch || (!isGreeting && !isShortQuery && !isPersonalQuestion && (
        /(haber|güncel|bugün|dün|yarın|son dakika|son durum|şu an|şimdi|2024|2025|2026|puan durumu|hava durumu|borsa|kripto|bitcoin|ethereum|dolar|euro|altın|gümüş|fiyatı nedir|fiyatları|kimdir|nedir|vizyondaki film|sinema|maç sonucu|maç skoru|transfer|seçim|cumhurbaşkan|başbakan|bakan|deprem|sel|yangın|kaza|olay|teknoloji haberi|yapay zeka haberi|yeni model|çıktı mı|piyasaya çıktı)/i.test(msgLower)
      ));

      if (needsSearch) {
        try {
          const searchQuery = message.replace(/[?!.]\s*$/g, '').substring(0, 100).trim();
          
          console.log(`[WebSearch] 🔍 DuckDuckGo search: "${searchQuery}" (deepSearch: ${deepSearch})`);
          
          const searchResults = await searchWithDuckDuckGo(searchQuery);
          
          if (searchResults && searchResults.length > 0) {
            searchSources = searchResults.slice(0, 5);
            
            // Inject search context into AI prompt
            let searchContext = `\n\n--- REAL-TIME WEB SEARCH RESULTS FOR: "${searchQuery}" ---\n`;
            searchResults.forEach((r, i) => {
              searchContext += `\n[${i + 1}] ${r.title || 'Result'}\n`;
              searchContext += `   ${r.snippet}\n`;
              if (r.url) searchContext += `   URL: ${r.url}\n`;
            });
            searchContext += `\n---\nIncorporate this information naturally into your response. Always cite sources when relevant.\n`;
            
            searchContextInjection = searchContext;
          }
        } catch (error) {
          console.error('[WebSearch] Error during DuckDuckGo search:', error);
          searchContextInjection = ''; // Graceful degradation
        }
      }
    }

    // 10. MODEL FALLBACK CHAIN - Sadece Groq modelleri
    const GROQ_MODEL_CHAIN = [
      "llama-3.3-70b-versatile",  // En güçlü model
      "llama-3.1-8b-instant",     // Hızlı, düşük gecikme
      "mixtral-8x7b-32768"        // Alternatif
    ];
    // API key sadece environment variable'dan alınır - hardcoded yok
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;  // Son çare yedek için
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const dashscopeKey = process.env.DASHSCOPE_API_KEY;

    // OpenRouter Model Zinciri - En İyi Free Modeller (Sırayla Dene)
    const OPENROUTER_MODEL_CHAIN = (process.env.OPENROUTER_MODELS || 
      'google/gemma-3-27b-it:free|google/gemma-4-31b-it:free|meta-llama/openrouter/free|' +
      'openai/gpt-oss-120b:free|openai/gpt-oss-20b:free|meta-llama/llama-3.3-70b-instruct:free|' +
      'liquid/lfm-2.5-1.2b-thinking:free|liquid/lfm-2.5-1.2b-instruct:free'
    ).split('|');

    // Deepseek Model Zinciri (Sırayla Dene) - Free Tier
    const DEEPSEEK_MODEL_CHAIN = [
      'deepseek-chat',
      'deepseek-coder'
    ];

    // SISTEM PROMPT (Arama bağlamı varsa ekle)
    const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${systemInstruction}\n${localizationInjection}${searchContextInjection}\n\nMOD: DOSYA OKUMA AKTIF. Eğer kullanıcı dosya içeriği gönderdiyse, o içeriği en ince detayına kadar analiz et.`;

    // Qwen DashScope Model Zinciri (Chat - Singapore Region)
    const QWEN_MODEL_CHAIN = (process.env.QWEN_MODELS || 'qwen-flash|qwen3.6-flash').split('|');

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || ""
      }))
    ];

    // Kullanıcı mesajına dosya metinlerini ekle
    let finalUserContent = message || "";
    if (extractedText) {
      finalUserContent += `\n\nEkli Dosya İçerikleri:\n${extractedText}`;
    }

    const hasImages = imagesForVision && imagesForVision.length > 0;
    if (hasImages) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: finalUserContent },
          ...imagesForVision.map(img => ({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${img}` }
          }))
        ]
      });
    } else {
      messages.push({ role: "user", content: finalUserContent });
    }

    // ── OpenRouter API Çağrısı (Model Zinciri) ──
    async function tryOpenRouterModel(modelName) {
      if (!openrouterKey) throw new Error("OPENROUTER_API_KEY ayarlı değil.");
      
      const client = new OpenAI({ 
        apiKey: openrouterKey.trim(), 
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://lifecoach.ai",
          "X-Title": "LifeCoach AI"
        }
      });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const completion = await client.chat.completions.create({
          model: modelName,
          messages: messages,
          temperature: 0.5,
          max_tokens: 4096,
          stream: false
        }, { signal: controller.signal });

        clearTimeout(timeoutId);

        const content = completion.choices?.[0]?.message?.content?.trim();
        if (!content) throw new Error("OpenRouter boş yanıt döndürdü.");
        return content;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    // ── Deepseek API Çağrısı (Model Zinciri) ──
    async function tryDeepseekModel(modelName) {
      if (!deepseekKey) throw new Error("DEEPSEEK_API_KEY ayarlı değil.");

      const client = new OpenAI({ 
        apiKey: deepseekKey.trim(), 
        baseURL: "https://api.deepseek.com/v1" 
      });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const completion = await client.chat.completions.create({
          model: modelName,
          messages: messages,
          temperature: 0.5,
          max_tokens: 4096,
          stream: false
        }, { signal: controller.signal });

        clearTimeout(timeoutId);

        const content = completion.choices?.[0]?.message?.content?.trim();
        if (!content) throw new Error("Deepseek boş yanıt döndürdü.");
        return content;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    // ── Groq API Çağrısı (Belirli Model) ──
    async function tryGroqModel(modelName) {
      const client = new OpenAI({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      try {
        const completion = await client.chat.completions.create({
          model: modelName,
          messages: messages,
          temperature: 0.5,
          max_tokens: 4096,
          stream: false
        }, { signal: controller.signal });

        clearTimeout(timeoutId);

        const content = completion.choices?.[0]?.message?.content;
        if (!content) throw new Error("Model boş yanıt döndürdü.");
        return content;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    // ── Gemini API Son Çare Yedek ──
    async function tryGeminiFallback() {
      if (!geminiKey) throw new Error("GEMINI_API_KEY ayarlı değil.");

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey.trim());

      // Gemini için history'yi düzelt (system mesajını ayır)
      const geminiHistory = (history || []).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || "" }]
      }));

      const geminiModel = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { maxOutputTokens: 4096, temperature: 0.5 },
        systemInstruction: { parts: [{ text: systemPrompt }] }
      }, { apiVersion: 'v1' });

      const contents = [
        ...geminiHistory,
        { role: 'user', parts: [{ text: finalUserContent }] }
      ];

      const result = await geminiModel.generateContent({ contents });
      const text = result.response.text();
      if (!text) throw new Error("Gemini boş yanıt döndürdü.");
      return text;
    }

    // ── ANA YEDEKLEME MANTIĞI ──
    let aiResponse = null;
    let usedModel = null;
    let lastError = null;

    // KATMAN 1: Qwen DashScope (Singapore Region - Öncelik)
    if (dashscopeKey) {
      for (const modelName of QWEN_MODEL_CHAIN) {
        try {
          console.log(`[AI-Fallback] 🚀 Qwen DashScope deneniyor: ${modelName}`);
          aiResponse = await callQwenDashScope(systemPrompt, (history || []).filter(m => m.role !== 'system'), modelName, 4096);
          usedModel = `qwen/${modelName}`;
          console.log(`[AI-Fallback] ✅ Qwen ${modelName} başarılı`);
          break;
        } catch (err) {
          console.warn(`[AI-Fallback] ❌ Qwen ${modelName} başarısız: ${err.message}`);
          lastError = err;
        }
      }
    }

    // KATMAN 2: OpenRouter (ASIL MODEL - Tüm Modeller Sırayla)
    if (!aiResponse) {
      for (const modelName of OPENROUTER_MODEL_CHAIN) {
        try {
          console.log(`[AI-Fallback] 🚀 OpenRouter deneniyor: ${modelName}`);
          aiResponse = await tryOpenRouterModel(modelName);
          usedModel = `openrouter/${modelName}`;

          console.log(`[AI-Fallback] ✅ OpenRouter ${modelName} başarılı`);
          break;
        } catch (err) {
          console.warn(`[AI-Fallback] ❌ OpenRouter ${modelName} başarısız: ${err.message}`);
          lastError = err;

          const isRecoverable = 
            err.message?.includes('rate_limit') ||
            err.message?.includes('quota') ||
            err.message?.includes('context_length') ||
            err.message?.includes('model_not_found') ||
            err.message?.includes('boş yanıt') ||
            err.name === 'AbortError' ||
            err.status === 429 ||
            err.status === 503 ||
            err.status === 404;

          const isFatal = err.status === 401 || err.status === 403;
          if (isFatal) {
            console.warn(`[AI-Fallback] ⚠️ OpenRouter kimlik doğrulama hatası, Deepseek'e geçiliyor...`);
            break;
          }

          if (!isRecoverable) {
            console.warn(`[AI-Fallback] ⚠️ ${modelName} beklenmedik hata, sonraki modeli deniyorum...`);
          }
        }
      }
    } else {
      console.warn(`[AI-Fallback] ⚠️ OPENROUTER_API_KEY tanımlı değil, Deepseek'e geçiliyor...`);
    }

    // KATMAN 2: Deepseek (Yedek - Tüm Modeller Sırayla)
    if (!aiResponse) {
      if (deepseekKey) {
        for (const modelName of DEEPSEEK_MODEL_CHAIN) {
          try {
            console.log(`[AI-Fallback] 🚀 Deepseek deneniyor: ${modelName}`);
            aiResponse = await tryDeepseekModel(modelName);
            usedModel = `deepseek/${modelName}`;

            console.log(`[AI-Fallback] ✅ Deepseek ${modelName} başarılı`);
            break;
          } catch (err) {
            console.warn(`[AI-Fallback] ❌ Deepseek ${modelName} başarısız: ${err.message}`);
            lastError = err;

            const isRecoverable = 
              err.message?.includes('rate_limit') ||
              err.message?.includes('quota') ||
              err.message?.includes('context_length') ||
              err.message?.includes('model_not_found') ||
              err.message?.includes('boş yanıt') ||
              err.message?.includes('deprecated') ||
              err.name === 'AbortError' ||
              err.status === 429 ||
              err.status === 503 ||
              err.status === 404;

            const isFatal = err.status === 401 || err.status === 403;
            if (isFatal) {
              console.warn(`[AI-Fallback] ⚠️ Deepseek kimlik doğrulama hatası, Groq'a geçiliyor...`);
              break;
            }

            if (!isRecoverable) {
              console.warn(`[AI-Fallback] ⚠️ ${modelName} beklenmedik hata, sonraki modeli deniyorum...`);
            }
          }
        }
      } else {
        console.warn(`[AI-Fallback] ⚠️ DEEPSEEK_API_KEY tanımlı değil, Groq'a geçiliyor...`);
      }
    }

    // KATMAN 3: Groq (İkinci Yedek)
    if (!aiResponse) {
      for (const modelName of GROQ_MODEL_CHAIN) {
        try {
          console.log(`[AI-Fallback] Deneniyor (Groq): ${modelName}`);
          aiResponse = await tryGroqModel(modelName);
          usedModel = `groq/${modelName}`;

          console.log(`[AI-Fallback] ✅ Başarılı: ${modelName}`);
          break;
        } catch (err) {
          console.warn(`[AI-Fallback] ❌ ${modelName} başarısız: ${err.message}`);
          lastError = err;

          const isRecoverable = 
            err.message?.includes('rate_limit') ||
            err.message?.includes('quota') ||
            err.message?.includes('context_length') ||
            err.message?.includes('model_not_found') ||
            err.message?.includes('boş yanıt') ||
            err.name === 'AbortError' ||
            err.status === 429 ||
            err.status === 503 ||
            err.status === 404;

          const isFatal = err.status === 401 || err.status === 403;
          if (isFatal) {
            console.warn(`[AI-Fallback] ⚠️ Kimlik doğrulama hatası, Groq atlanıyor...`);
            break;
          }

          if (!isRecoverable) {
            console.warn(`[AI-Fallback] ⚠️ Beklenmedik hata, yine de bir sonraki modeli deniyorum...`);
          }
        }
      }
    }

    // KATMAN 4: Gemini Son Çare
    if (!aiResponse && geminiKey) {
      try {
        console.log(`[AI-Fallback] 🔄 Gemini yedeklemesi başlatılıyor... (Groq hata: ${lastError?.message})`);
        aiResponse = await tryGeminiFallback();
        usedModel = "gemini-1.5-flash";
        console.log(`[AI-Fallback] ✅ Gemini başarılı.`);
      } catch (geminiErr) {
        console.error(`[AI-Fallback] ❌ Gemini de başarısız: ${geminiErr.message}`);
        lastError = geminiErr;
      }
    }

    // Tüm modeller başarısız
    if (!aiResponse) {
      console.error("[AI-Fallback] 💥 Tüm modeller başarısız oldu.");
      return res.status(503).json({
        error: "AI_UNAVAILABLE",
        message: "Yapay zeka servislerine şu an ulaşılamıyor. Lütfen birkaç saniye sonra tekrar deneyin.",
        details: lastError?.message
      });
    }

    console.log(`[AI-Fallback] 🎯 Yanıt veren model: ${usedModel}`);

    // Otomasyon verisini ayıkla
    let automation_data = null;
    const automationRegex = /\[\[AUTOMATION_DATA: (\{.*?\}) \]\]/;
    const match = aiResponse.match(automationRegex);
    let cleanReply = aiResponse;

    if (match) {
      try {
        automation_data = JSON.parse(match[1]);
        cleanReply = aiResponse.replace(automationRegex, "").trim();
      } catch (e) { console.error("Automation parse error"); }
    }

    if (!cleanReply && automation_data) {
      cleanReply = `Harika! "${automation_data.title}" otomasyonunu senin için hazırladım. Ayarlardan kontrol edebilir veya hemen başlatabilirsin. ⚡`;
    } else if (!cleanReply) {
      cleanReply = "Üzgünüm, şu an yanıt veremiyorum. Lütfen tekrar dener misin?";
    }

    // Increment Usage Count internally
    if (userId) {
      try {
        const resetData = userStats.usageCount === 0 ? { usageCount: 1 } : { usageCount: { increment: 1 } };
        await prisma.user.update({
          where: { id: userId },
          data: {
            ...resetData,
            lastActiveAt: new Date()
          }
        });
      } catch (e) { console.error("Usage count update error", e); }
    }

    // Ephemeral chat XP: small incremental XP for interactive chat messages.
    // NOTE: This is ephemeral and does NOT update persistent user XP/level unless a goal/completion action occurs.
    const chatXp = Math.floor(Math.random() * 2) + 1; // 1-2 XP per message

    return res.status(200).json({
      reply: cleanReply,
      automation_data,
      sources: searchSources,
      searched: searchSources.length > 0,
      _model: usedModel,
      chat_xp: chatXp,
      chat_xp_persisted: false,
      generated_files,
      youtube_suggestions,
      tool_notes,
      calendar_events,
      gmail_result,
      maps_result
    });
  } catch (error) {
    console.error("Sistem Hatası:", error);
    return res.status(500).json({ error: "Sistem Hatası", details: error.message });
  }
}
