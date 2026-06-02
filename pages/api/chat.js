import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import mammoth from 'mammoth'; 
import * as xlsx from 'xlsx';
import { JWT } from 'google-auth-library';
import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';

// Prisma: append ?pgbouncer=true for Vercel serverless (transaction mode = 1 conn per query)
const dbUrl = process.env.DATABASE_URL || '';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl.includes('pgbouncer') ? dbUrl : dbUrl + (dbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true&connection_limit=1&pool_timeout=5',
    },
  },
});
const HF_TOKEN = process.env.HF_TOKEN;
const HF_PROVIDER = process.env.HF_PROVIDER || 'auto';
const hf = HF_TOKEN ? new HfInference(HF_TOKEN) : null;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// CONCURRENCY LOCK: Simple in-memory lock to prevent overlapping chat requests per session
const chatLocks = new Map(); // sessionId -> Promise
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

// --- DuckDuckGo Web Search (Fast & Accurate) ---
async function searchWithSerpAPI(query, options = {}) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    console.warn('[SerpAPI] SERPAPI_API_KEY not set');
    return null;
  }
  const useAiMode = options.aiMode || false;
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      q: query,
      hl: 'tr',
      gl: 'tr',
      num: options.numResults || 10,
    });
    if (useAiMode) {
      params.set('engine', 'google_ai_mode');
      console.log(`[SerpAPI] 🔍 AI Mode search: "${query}"`);
    } else {
      params.set('engine', 'google');
      console.log(`[SerpAPI] 🔍 Google search: "${query}"`);
    }
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`SerpAPI ${res.status}: ${errBody}`);
    }
    const data = await res.json();
    if (useAiMode) {
      // AI Mode returns a single AI-generated response + sources
      const aiResponse = data.ai_response || data.ai_answer || '';
      const sources = (data.sources || data.ai_sources || []).slice(0, 5).map(s => ({
        title: s.title || 'Kaynak',
        snippet: s.snippet || '',
        url: s.source || s.url || '',
      }));
      if (aiResponse) {
        return {
          aiMode: true,
          answer: aiResponse,
          sources,
        };
      }
      return null;
    }
    // Standard Google results
    const results = (data.organic_results || []).slice(0, 5).map(r => ({
      title: r.title || '',
      snippet: r.snippet || '',
      url: r.link || '',
    }));
    if (results.length === 0) return null;
    return { aiMode: false, results };
  } catch (err) {
    console.error('[SerpAPI] Error:', err.message);
    return null;
  }
}


// --- GOOGLE SLIDES ---
async function create_presentation(topic, content_outline) {
  try {
    if (!GOOGLE_SERVICE_ACCOUNT) throw new Error('GOOGLE_SERVICE_ACCOUNT env not set');
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

    // Create presentation
    const createResp = await fetch('https://slides.googleapis.com/v1/presentations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: topic })
    });
    if (!createResp.ok) {
      const txt = await createResp.text();
      throw new Error('Slides API error: ' + txt);
    }
    const createData = await createResp.json();
    const presentationId = createData.presentationId;

    // Add slides based on outline
    const requests = [];
    let slideIndex = 0;
    
    // Add title slide
    requests.push({
      createSlide: {
        slideLayoutReference: {
          predefinedLayout: 'TITLE'
        },
        placeholderIdMappings: [
          {
            layoutPlaceholder: {
              type: 'TITLE',
              index: 0
            },
            objectId: `title_${slideIndex}`
          },
          {
            layoutPlaceholder: {
              type: 'BODY',
              index: 0
            },
            objectId: `body_${slideIndex}`
          }
        ]
      }
    });
    
    // Add content slides
    for (const [index, content] of content_outline.entries()) {
      slideIndex++;
      requests.push({
        createSlide: {
          slideLayoutReference: {
            predefinedLayout: 'TITLE_AND_BODY'
          },
          placeholderIdMappings: [
            {
              layoutPlaceholder: {
                type: 'TITLE',
                index: 0
              },
              objectId: `title_${slideIndex}`
            },
            {
              layoutPlaceholder: {
                type: 'BODY',
                index: 0
              },
              objectId: `body_${slideIndex}`
            }
          ]
        }
      });
      
      // Add text to title placeholder
      requests.push({
        insertText: {
          objectId: `title_${slideIndex}`,
          text: content
        }
      });
      
      // Add bullet points to body placeholder (simplified)
      requests.push({
        insertText: {
          objectId: `body_${slideIndex}`,
          text: content
        }
      });
    }
    
    // Batch update to add slides and content
    if (requests.length > 0) {
      await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests })
      });
    }

    return {
      presentationId,
      presentationUrl: `https://docs.google.com/presentation/d/${presentationId}/edit`
    };
  } catch (err) {
    console.error('[Google Slides] error', err);
    throw err;
  }
}

// --- GOOGLE MAPS ---
async function search_nearby_places(category, location) {
  try {
    if (!GOOGLE_MAPS_API_KEY) throw new Error('GOOGLE_MAPS_API_KEY not set');
    
    // First, geocode the location to get coordinates
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${GOOGLE_MAPS_API_KEY}`;
    const geocodeRes = await fetch(geocodeUrl);
    if (!geocodeRes.ok) throw new Error('Geocoding failed');
    const geocodeData = await geocodeRes.json();
    
    if (!geocodeData.results || geocodeData.results.length === 0) {
      throw new Error('Location not found');
    }
    
    const { lat, lng } = geocodeData.results[0].geometry.location;
    
    // Then search for nearby places
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=${category}&key=${GOOGLE_MAPS_API_KEY}`;
    const placesRes = await fetch(placesUrl);
    if (!placesRes.ok) throw new Error('Places search failed');
    const placesData = await placesRes.json();
    
    if (!placesData.results || placesData.results.length === 0) {
      return { message: `No ${category} places found near ${location}` };
    }
    
    // Format results
    const places = placesData.results.slice(0, 5).map(place => ({
      name: place.name,
      address: place.vicinity || '',
      rating: place.rating || null,
      user_ratings_total: place.user_ratings_total || 0,
      place_id: place.place_id,
      location: place.geometry.location,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${place.name.replace(/ /g, '+')},${place.vicinity || ''}`
    }));
    
    return {
      location: { lat, lng },
      places,
      totalResults: placesData.results.length
    };
  } catch (err) {
    console.error('[Google Maps] error', err);
    throw err;
  }
}

// --- GOOGLE CALENDAR ---
async function add_calendar_event(title, start_time, end_time, recurrence) {
  try {
    if (!GOOGLE_SERVICE_ACCOUNT) throw new Error('GOOGLE_SERVICE_ACCOUNT env not set');
    if (!GOOGLE_CALENDAR_USER) throw new Error('GOOGLE_CALENDAR_USER env not set');
    
    const key = JSON.parse(GOOGLE_SERVICE_ACCOUNT);
    const client = new JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: GOOGLE_CALENDAR_SCOPES
    });
    await client.authorize();
    let token = client.credentials?.access_token;
    if (!token) {
      const at = await client.getAccessToken();
      token = (at && (at.token || at)) || null;
    }
    if (!token) throw new Error('Could not obtain Google access token');

    const event = {
      summary: title,
      start: {
        dateTime: start_time,
        timeZone: 'America/New_York' // Default, should be configurable
      },
      end: {
        dateTime: end_time,
        timeZone: 'America/New_York'
      }
    };

    if (recurrence) {
      event.recurrence = [recurrence];
    }

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
    return {
      eventId: data.id,
      htmlLink: data.htmlLink,
      summary: data.summary
    };
  } catch (err) {
    console.error('[Google Calendar] error', err);
    throw err;
  }
}

// --- GOOGLE DRIVE ---
async function upload_to_drive(file_content, file_name, mime_type) {
  try {
    if (!GOOGLE_SERVICE_ACCOUNT) throw new Error('GOOGLE_SERVICE_ACCOUNT env not set');
    
    // Get or create "LifeCoach AI" folder
    let folderId = await getOrCreateLifeCoachFolder();
    
    const token = await getGoogleAccessToken([...GOOGLE_DRIVE_SCOPES], GOOGLE_DRIVE_USER);
    const boundary = `-------LifeCoachDrive${Date.now()}`;
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify({ name: file_name, mimeType, parents: [folderId] }),
      `--${boundary}`,
      `Content-Type: ${mime_type}`,
      'Content-Transfer-Encoding: base64',
      '',
      file_content,
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
      fileId: data.id,
      webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`
    };
  } catch (err) {
    console.error('[Google Drive] error', err);
    throw err;
  }
}

// Helper function to get or create LifeCoach AI folder in Drive
async function getOrCreateLifeCoachFolder() {
  try {
    const token = await getGoogleAccessToken([...GOOGLE_DRIVE_SCOPES], GOOGLE_DRIVE_USER);
    
    // Search for existing folder
    const searchResp = await fetch(`https://www.googleapis.com/drive/v3/files?q=mimeType%3D'application/vnd.google-apps.folder'%20and%20name%3D'LifeCoach%20AI'%20and%20trashed%3Dfalse&fields=files(id%2Cname)`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!searchResp.ok) throw new Error('Failed to search for LifeCoach folder');
    const searchData = await searchResp.json();
    
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
    
    // Create folder if it doesn't exist
    const createResp = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'LifeCoach AI',
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    
    if (!createResp.ok) {
      const text = await createResp.text();
      throw new Error(`Failed to create LifeCoach folder: ${text}`);
    }
    
    const createData = await createResp.json();
    return createData.id;
  } catch (err) {
    console.error('[Google Drive folder] error', err);
    throw err;
  }
}

// --- GOOGLE SHEETS & OCR ---
async function extract_to_spreadsheet(file_id_or_text) {
  try {
    // Check if input is base64 image or plain text
    const isBase64 = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}=)?$/.test(file_id_or_text);
    
    let extractedText = '';
    
    if (isBase64 && file_id_or_text.length > 100) { // Likely an image
      // Use Google Vision API for OCR
      extractedText = await extractTextFromImage(file_id_or_text);
    } else {
      // Plain text
      extractedText = file_id_or_text;
    }
    
    if (!extractedText || extractedText.trim() === '') {
      throw new Error('No text could be extracted from the input');
    }
    
    // Normalize text into rows for spreadsheet
    const rows = normalizeSpreadsheetRows(extractedText);
    
    // Create new Google Sheet
    if (!GOOGLE_SERVICE_ACCOUNT) throw new Error('GOOGLE_SERVICE_ACCOUNT env not set');
    const key = JSON.parse(GOOGLE_SERVICE_ACCOUNT);
    const client = new JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: [...GOOGLE_DRIVE_SCOPES, 'https://www.googleapis.com/auth/spreadsheets']
    });
    await client.authorize();
    let token = client.credentials?.access_token;
    if (!token) {
      const at = await client.getAccessToken();
      token = (at && (at.token || at)) || null;
    }
    if (!token) throw new Error('Could not obtain Google access token');
    
    // Create spreadsheet
    const createResp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: `LifeCoach Extracted Data ${new Date().toISOString().slice(0,10)}`
        }
      })
    });
    
    if (!createResp.ok) {
      const text = await createResp.text();
      throw new Error(`Spreadsheet creation failed: ${text}`);
    }
    
    const createData = await createResp.json();
    const spreadsheetId = createData.spreadsheetId;
    
    // Write data to spreadsheet
    const writeResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:valueInputOption?valueInputOption=RAW`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: 'Sheet1!A1',
        majorDimension: 'ROWS',
        values: rows
      })
    });
    
    if (!writeResp.ok) {
      const text = await writeResp.text();
      throw new Error(`Failed to write to spreadsheet: ${text}`);
    }
    
    return {
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    };
  } catch (err) {
    console.error('[Google Sheets & OCR] error', err);
    throw err;
  }
}

// Check if a string looks like a YouTube URL
function isYouTubeUrl(input) {
  return isYouTubeLink(input);
}

// Extract YouTube video ID from any URL format or return video ID directly
function extractYouTubeVideoId(input) {
  if (!input || typeof input !== 'string') return null;
  const idOnly = /^([a-zA-Z0-9_-]{11})$/;
  if (idOnly.test(input.trim())) return input.trim();

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Fetch YouTube video details using YouTube Data API v3
async function getYouTubeVideoDetails(videoId) {
  if (!YOUTUBE_API_KEY) return null;
  try {
    const youtube = google.youtube({ version: 'v3', auth: YOUTUBE_API_KEY });
    const res = await youtube.videos.list({
      part: ['snippet', 'contentDetails', 'statistics'],
      id: [videoId],
    });
    const item = res.data.items?.[0];
    if (!item) return null;
    return {
      title: item.snippet?.title || '',
      description: (item.snippet?.description || '').substring(0, 3000),
      channelTitle: item.snippet?.channelTitle || '',
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || '',
      duration: item.contentDetails?.duration || '',
      viewCount: item.statistics?.viewCount || '0',
      publishedAt: item.snippet?.publishedAt || '',
      tags: item.snippet?.tags?.slice(0, 10) || [],
    };
  } catch (err) {
    console.error('[YouTube Video Details] Error:', err.message);
    return null;
  }
}

// YouTube transcript via SerpAPI video transcript engine — pure API call, no downloads
async function transcribeYouTubeViaSerpAPI(videoId) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    console.warn('[SerpAPI] SERPAPI_API_KEY not set for transcript');
    return null;
  }
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      engine: 'youtube_video_transcript',
      video_id: videoId,
    });
    console.log(`[SerpAPI] Fetching transcript for video ${videoId}...`);
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`SerpAPI transcript ${res.status}: ${errBody}`);
    }
    const data = await res.json();
    const segments = data.transcript || data.transcript_segments || data.captions || [];
    if (!segments.length) {
      console.warn('[SerpAPI] No transcript segments found');
      return null;
    }
    const fullText = segments
      .map(s => s.text || s.snippet || '')
      .filter(Boolean)
      .join(' ');
    if (!fullText.trim()) {
      console.warn('[SerpAPI] Empty transcript');
      return null;
    }
    console.log('[SerpAPI] Transcript length:', fullText.length, 'chars');
    return fullText;
  } catch (err) {
    console.error('[SerpAPI] Transcript error:', err.message);
    return null;
  }
}

// ─── SerpAPI: Amazon Product Search ─────────────────────────────────────────
async function searchAmazonProducts(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'amazon', q: query, hl: 'tr', gl: 'tr' });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const results = (data.organic_results || []).slice(0, 3).map(r => ({
      title: r.title || '',
      price: r.price || r.extracted_price || '',
      rating: r.rating || r.reviews_rating || '',
      reviews: r.reviews_count || '',
      thumbnail: r.thumbnail || r.image || '',
      link: r.link || r.product_url || '',
    }));
    return results.length ? results : null;
  } catch (err) {
    console.error('[SerpAPI Amazon]', err.message);
    return null;
  }
}

// ─── SerpAPI: Google Maps ───────────────────────────────────────────────────
async function searchGoogleMaps(query, options = {}) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  const location = options.location || '';
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'google_maps', q: query, hl: 'tr' });
    if (location) params.set('ll', `@${location.lat},${location.lng},14z`);
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const places = (data.local_results || []).slice(0, 5).map(p => ({
      name: p.title || p.name || '',
      address: p.address || '',
      rating: p.rating || '',
      reviews: p.reviews || p.reviews_count || '',
      phone: p.phone || '',
      coordinates: p.gps_coordinates || null,
      thumbnail: p.thumbnail || '',
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.title || p.name || '') + ', ' + (p.address || ''))}`,
    }));
    return places.length ? { places, searchQuery: query } : null;
  } catch (err) {
    console.error('[SerpAPI Maps]', err.message);
    return null;
  }
}

// ─── SerpAPI: Google Finance ────────────────────────────────────────────────
async function searchGoogleFinance(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'google_finance', q: query, hl: 'tr', gl: 'TR' });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const gainers = (data.market_trends?.gainers || data.gainers || []).slice(0, 5).map(s => ({
      name: s.name || s.title || '',
      price: s.price || s.current_price || '',
      change: s.change || s.price_change || '',
      changePercent: s.change_percent || s.extracted_price_change_percent || '',
      link: s.link || s.stock_link || '',
    }));
    const losers = (data.market_trends?.losers || data.losers || []).slice(0, 5).map(s => ({
      name: s.name || s.title || '',
      price: s.price || s.current_price || '',
      change: s.change || s.price_change || '',
      changePercent: s.change_percent || s.extracted_price_change_percent || '',
      link: s.link || s.stock_link || '',
    }));
    const mostActives = (data.most_actives || data.active_stocks || []).slice(0, 3).map(s => ({
      name: s.name || s.title || '',
      price: s.price || '',
      change: s.change || '',
      link: s.link || '',
    }));
    return { gainers, losers, mostActives };
  } catch (err) {
    console.error('[SerpAPI Finance]', err.message);
    return null;
  }
}

// ─── SerpAPI: Google Scholar ────────────────────────────────────────────────
async function searchGoogleScholar(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'google_scholar', q: query, hl: 'tr', num: 3 });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const articles = (data.organic_results || []).slice(0, 3).map(a => ({
      title: a.title || '',
      authors: a.authors?.[0]?.name || a.publication_info?.authors?.[0] || '',
      publication: a.publication_info?.summary || a.publication || '',
      year: a.publication_info?.summary?.match(/\b(19|20)\d{2}\b/)?.[0] || '',
      snippet: a.snippet || a.publication_info?.summary || '',
      link: a.link || a.results_link || '',
      citedBy: a.inline_links?.cited_by?.total || a.cited_by || '',
    }));
    return articles.length ? articles : null;
  } catch (err) {
    console.error('[SerpAPI Scholar]', err.message);
    return null;
  }
}

// ─── SerpAPI: Google Travel Explore ─────────────────────────────────────────
async function searchGoogleTravel(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  const tryQuery = async (q) => {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'google_travel_explore', q, hl: 'tr', gl: 'TR', currency: 'TRY' });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const destinations = (data.destinations || data.results || []).slice(0, 10).map(d => ({
      name: d.name || d.title || '',
      type: d.type || d.destination_type || 'Bölge',
      price: d.price || d.extracted_price || '',
      rating: d.rating || '',
      description: d.description || d.snippet || '',
      image: d.image || d.thumbnail || '',
      link: d.link || d.flights_link || '',
    }));
    return destinations.length ? destinations : null;
  };
  let result = await tryQuery(query);
  if (!result) result = await tryQuery('yaz tatili');
  if (!result) result = await tryQuery('Türkiye tatil');
  return result;
}

// ─── SerpAPI: Instagram Profile Search ──────────────────────────────────────
async function searchInstagramProfile(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'instagram_profile', q: query, hl: 'tr' });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const profile = {
      username: data.username || data.name || '',
      fullName: data.full_name || data.title || '',
      biography: data.biography || data.description || '',
      followers: data.followers || data.followers_count || '',
      following: data.following || data.following_count || '',
      postsCount: data.posts_count || data.video_count || '',
      isPrivate: data.is_private || false,
      isVerified: data.is_verified || false,
      profilePic: data.profile_pic || data.thumbnail || '',
      link: data.link || data.profile_link || `https://instagram.com/${data.username || query}`,
    };
    const posts = (data.posts || data.media || []).slice(0, 4).map(p => ({
      caption: p.caption || p.description || '',
      likes: p.likes || p.likes_count || '',
      comments: p.comments || p.comments_count || '',
      image: p.image || p.thumbnail || '',
      link: p.link || p.post_link || '',
    }));
    return profile.username ? { profile, posts } : null;
  } catch (err) {
    console.error('[SerpAPI Instagram]', err.message);
    return null;
  }
}

// ─── SerpAPI: Google Shopping ───────────────────────────────────────────────
async function searchGoogleShopping(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'google_shopping', q: query, hl: 'tr', gl: 'tr', currency: 'TRY' });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const results = (data.shopping_results || []).slice(0, 5).map(r => ({
      title: r.title || '',
      price: r.price || r.extracted_price || '',
      store: r.source || r.store || r.seller || '',
      rating: r.rating || '',
      reviews: r.reviews_count || '',
      thumbnail: r.thumbnail || '',
      link: r.link || r.product_link || '',
    }));
    return results.length ? results : null;
  } catch (err) {
    console.error('[SerpAPI Shopping]', err.message);
    return null;
  }
}

// ─── SerpAPI: Google Flights ────────────────────────────────────────────────
async function searchGoogleFlights(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'google_flights', q: query, hl: 'tr', gl: 'TR', currency: 'TRY' });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const flights = (data.flights || data.best_flights || data.other_flights || []).slice(0, 5).map(f => ({
      airline: f.airline || f.carrier || '',
      departure: f.departure?.airport || f.departure_airport || '',
      arrival: f.arrival?.airport || f.arrival_airport || '',
      price: f.price || f.extracted_price || '',
      duration: f.duration || f.total_duration || '',
      stops: f.stops || f.number_of_stops || 0,
      link: f.link || f.booking_link || '',
    }));
    return flights.length ? flights : null;
  } catch (err) {
    console.error('[SerpAPI Flights]', err.message);
    return null;
  }
}

// ─── SerpAPI: Google Jobs ───────────────────────────────────────────────────
async function searchGoogleJobs(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'google_jobs', q: query, hl: 'tr', gl: 'tr' });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const jobs = (data.jobs || data.jobs_results || []).slice(0, 5).map(j => ({
      title: j.title || '',
      company: j.company || j.employer || '',
      location: j.location || j.job_location || '',
      salary: j.salary || j.extracted_salary || '',
      type: j.type || j.job_type || '',
      description: j.description || j.snippet || '',
      link: j.link || j.job_link || '',
    }));
    return jobs.length ? jobs : null;
  } catch (err) {
    console.error('[SerpAPI Jobs]', err.message);
    return null;
  }
}

// ─── SerpAPI: Google News ───────────────────────────────────────────────────
async function searchGoogleNews(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'google_news', q: query, hl: 'tr', gl: 'TR' });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const articles = (data.news_results || []).slice(0, 6).map(n => ({
      title: n.title || '',
      source: n.source || n.publisher || '',
      date: n.date || n.published_at || '',
      snippet: n.snippet || n.description || '',
      image: n.thumbnail || n.image || '',
      link: n.link || n.article_link || '',
    }));
    return articles.length ? articles : null;
  } catch (err) {
    console.error('[SerpAPI News]', err.message);
    return null;
  }
}

// ─── SerpAPI: Google Events ─────────────────────────────────────────────────
async function searchGoogleEvents(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'google_events', q: query, hl: 'tr', gl: 'TR' });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const events = (data.events || data.events_results || []).slice(0, 5).map(e => ({
      title: e.title || '',
      date: e.date || e.when || '',
      venue: e.venue || e.location || '',
      description: e.description || e.snippet || '',
      image: e.image || e.thumbnail || '',
      link: e.link || e.event_link || '',
    }));
    return events.length ? events : null;
  } catch (err) {
    console.error('[SerpAPI Events]', err.message);
    return null;
  }
}

// ─── SerpAPI: Google Trends ─────────────────────────────────────────────────
async function searchGoogleTrends(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'google_trends', q: query, hl: 'tr', gl: 'TR' });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const trending = (data.trending_searches || data.related_queries || []).slice(0, 8).map(t => ({
      title: t.title || t.query || '',
      traffic: t.traffic || t.search_volume || '',
      link: t.link || '',
    }));
    return trending.length ? trending : null;
  } catch (err) {
    console.error('[SerpAPI Trends]', err.message);
    return null;
  }
}

// ─── SerpAPI: YouTube Search ────────────────────────────────────────────────
async function searchYouTubeVideosSerpAPI(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'youtube', search_query: query, hl: 'tr', gl: 'TR' });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const videos = (data.video_results || []).slice(0, 5).map(v => ({
      title: v.title || '',
      channel: v.channel?.name || v.channel || '',
      views: v.views || v.view_count || '',
      duration: v.duration || v.length || '',
      published: v.published_date || v.date || '',
      thumbnail: v.thumbnail?.static || v.thumbnail || '',
      link: v.link || v.video_link || '',
    }));
    return videos.length ? videos : null;
  } catch (err) {
    console.error('[SerpAPI YouTube]', err.message);
    return null;
  }
}

// ─── Weather (wttr.in - free, no key) ───────────────────────────────────────
async function searchWeather(query) {
  try {
    const location = query.replace(/hava durumu|weather|nasıl|kaç derece/gi, '').trim() || 'Istanbul';
    const res = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`);
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current_condition?.[0];
    if (!current) return null;
    return {
      location: data.nearest_area?.[0]?.areaName?.[0]?.value || location,
      country: data.nearest_area?.[0]?.country?.[0]?.value || '',
      temp: current.temp_C || '',
      feelsLike: current.FeelsLikeC || '',
      condition: current.weatherDesc?.[0]?.value || '',
      humidity: current.humidity || '',
      windSpeed: current.windspeedKmph || '',
      windDir: current.winddir16Point || '',
      visibility: current.visibility || '',
    };
  } catch (err) {
    console.error('[Weather]', err.message);
    return null;
  }
}

// ─── SerpAPI: Recipes ───────────────────────────────────────────────────────
async function searchRecipes(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'recipes', q: query, hl: 'tr', gl: 'TR' });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const recipes = (data.recipes || []).slice(0, 5).map(r => ({
      title: r.title || '',
      ingredients: r.ingredients_count || '',
      time: r.cooking_time || r.total_time || '',
      rating: r.rating || '',
      image: r.image || r.thumbnail || '',
      link: r.link || r.recipe_link || '',
    }));
    return recipes.length ? recipes : null;
  } catch (err) {
    console.error('[SerpAPI Recipes]', err.message);
    return null;
  }
}

// ─── SerpAPI: Currency Converter ────────────────────────────────────────────
async function searchCurrencyConversion(query) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'google_finance', q: query, hl: 'tr', gl: 'TR' });
    const res = await fetch(`https://serpapi.com/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const conversions = (data.currency_conversions || []).slice(0, 3).map(c => ({
      from: c.from || '',
      to: c.to || '',
      rate: c.rate || c.exchange_rate || '',
      change: c.change || '',
    }));
    if (!conversions.length && data.summary?.exchange_rate) {
      return [{ from: 'USD', to: 'TRY', rate: data.summary.exchange_rate, change: data.summary.change || '' }];
    }
    return conversions.length ? conversions : null;
  } catch (err) {
    console.error('[SerpAPI Currency]', err.message);
    return null;
  }
}

// Analyze MP4 video file using OpenAI Whisper for transcription
async function transcribeVideoWithWhisper(videoBase64) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.warn('[Video Transcription] OPENAI_API_KEY not set, skipping Whisper transcription');
    return null;
  }
  try {
    const openai = new OpenAI({ apiKey: openaiKey });
    // Convert base64 -> buffer, write to temp file, then create File object for Whisper
    const buffer = Buffer.from(videoBase64, 'base64');

    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const tmpFile = path.join(os.tmpdir(), `lifecoach-video-${Date.now()}.mp4`);
    fs.writeFileSync(tmpFile, buffer);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tmpFile),
      model: 'whisper-1',
      language: 'tr',
      response_format: 'text',
    });

    fs.unlinkSync(tmpFile);
    const fullText = transcription || '';
    console.log('Çekilen Transkript Metni:', fullText);
    return fullText;
  } catch (err) {
    console.error('[Video Transcription] Error:', err.message);
    // Cleanup temp file if it exists
    try { const fs = require('fs'); const tmpFile = `/tmp/lifecoach-video-${Date.now()}.mp4`; if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (_) {}
    return null;
  }
}

// Build video context text for the AI prompt
function buildVideoContextForAI(youtubeInfo, transcript, filename) {
  const parts = [];

  if (youtubeInfo) {
    parts.push(`\n\n📺 [YOUTUBE VİDEOSU ANALİZİ]`);
    parts.push(`Başlık: ${youtubeInfo.title}`);
    parts.push(`Kanal: ${youtubeInfo.channelTitle}`);
    parts.push(`Açıklama: ${youtubeInfo.description}`);
    parts.push(`İzlenme: ${Number(youtubeInfo.viewCount).toLocaleString('tr-TR')}`);
    parts.push(`Yayınlanma: ${new Date(youtubeInfo.publishedAt).toLocaleDateString('tr-TR')}`);
    if (youtubeInfo.tags.length > 0) parts.push(`Etiketler: ${youtubeInfo.tags.join(', ')}`);
    parts.push(`Ses tanıma (Whisper STT) ile çözümlenen içerik:\n${transcript || 'Video sesi çözümlenemedi, sadece başlık ve açıklama ile analiz yap.'}`);
  } else if (filename && transcript) {
    parts.push(`\n\n🎬 [MP4 VİDEOSU ANALİZİ]`);
    parts.push(`Dosya: ${filename}`);
    parts.push(`Video içeriğinin transkripti:\n${transcript}`);
  } else if (filename) {
    parts.push(`\n\n🎬 [MP4 VİDEOSU]`);
    parts.push(`Dosya: ${filename}`);
    parts.push(`Video gönderildi ancak transkript çıkarılamadı. Video hakkında mevcut bilgilerle kapsamlı bir analiz ve özet yap.`);
  }

  return parts.join('\n');
}

// === END VIDEO UNDERSTANDING HELPERS ===

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

// --- HUGGING FACE: Intent-based open-model routing ---
const HF_MODEL_CATALOG = {
  general: process.env.HF_MODEL_GENERAL || 'cohere-for-ai/c4ai-aya-expanse-8b',
  generalAlt: 'meta-llama/Llama-3.1-8B-Instruct',
  coding: process.env.HF_MODEL_CODING || 'Qwen/Qwen2.5-Coder-7B-Instruct',
  codingAlt: 'meta-llama/Llama-3.1-8B-Instruct',
  vision: process.env.HF_MODEL_VISION || 'xtuner/llava-llama-3-8b-v1_1',
  visionAlt: 'google/paligemma-3b-pt-448',
  tools: process.env.HF_MODEL_TOOLS || 'meta-llama/Llama-3.1-8B-Instruct',
};

const HF_VISION_MODELS = new Set([
  HF_MODEL_CATALOG.vision,
  HF_MODEL_CATALOG.visionAlt,
  'xtuner/llava-llama-3-8b-v1_1',
  'google/paligemma-3b-pt-448',
]);

function selectHFModelByIntent(message, options = {}) {
  const { hasImages = false } = options;
  if (!message || typeof message !== 'string') {
    return HF_MODEL_CATALOG.general;
  }

  const msgLower = message.toLowerCase().trim();

  const visionKeywords = /\b(resim|görsel|görüntü|foto|fotoğraf|ocr|metin oku|image|picture|photo|screenshot|ekran görüntüsü|analyze image|görüntü analiz|multimodal)\b/i;
  if (hasImages || visionKeywords.test(msgLower)) {
    console.log(`[HF Router] 🖼️ Vision/OCR intent → ${HF_MODEL_CATALOG.vision}`);
    return HF_MODEL_CATALOG.vision;
  }

  const codingKeywords = /\b(kod|programlama|script|code|programming|developer|javascript|python|function|class|api|debug|fix bug|hata düzelt|yazılım|software|backend|frontend|database|sql|query|algorithm|algoritma|typescript|react|vue|angular|node|express|django|flask|java|c\+\+|c#|php|git|github|docker|kubernetes)\b/i;
  if (codingKeywords.test(msgLower)) {
    console.log(`[HF Router] 🎯 Coding intent → ${HF_MODEL_CATALOG.coding}`);
    return HF_MODEL_CATALOG.coding;
  }

  const googleKeywords = /\b(harita|konum|takvim|calendar|gmail|excel|drive|slides|docs|sheet|google|maps|email gönder|mail at|dosya yükle|sunum oluştur|presentation|spreadsheet|tablo|event|etkinlik|reminder|hatırlatıcı|appointment|randevu|schedule|planlama|location|yer|navigasyon|nearby|yakınındaki|upload|download)\b/i;
  if (googleKeywords.test(msgLower)) {
    console.log(`[HF Router] 🔧 Google tools intent → ${HF_MODEL_CATALOG.tools}`);
    return HF_MODEL_CATALOG.tools;
  }

  console.log(`[HF Router] 💬 General/multilingual intent → ${HF_MODEL_CATALOG.general}`);
  return HF_MODEL_CATALOG.general;
}

function isHFVisionModel(model) {
  return HF_VISION_MODELS.has(model) || /llava|paligemma|vlm|vision/i.test(model || '');
}

function buildHfChatMessages(systemPrompt, userMessages, imageBase64List = []) {
  const messages = [{ role: 'system', content: systemPrompt }];
  const normalized = (userMessages || []).filter(m => m && m.role !== 'system');

  for (let i = 0; i < normalized.length; i++) {
    const msg = normalized[i];
    const isLastUser = msg.role === 'user' && i === normalized.length - 1;
    const attachImages = isLastUser && imageBase64List.length > 0;

    if (attachImages) {
      const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text },
          ...imageBase64List.map(img => ({
            type: 'image_url',
            image_url: { url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}` },
          })),
        ],
      });
    } else if (msg.role === 'assistant') {
      messages.push({ role: 'assistant', content: typeof msg.content === 'string' ? msg.content : String(msg.content) });
    } else if (msg.role === 'user') {
      messages.push({ role: 'user', content: typeof msg.content === 'string' ? msg.content : String(msg.content) });
    }
  }

  return messages;
}

async function callHuggingFaceAPI(systemPrompt, userMessages, model, options = {}) {
  if (!hf) throw new Error('HF_TOKEN ayarlı değil.');
  const maxTokens = options.maxTokens || 4096;
  const imageBase64List = options.images || [];
  const useVisionFormat = options.forceVision || (imageBase64List.length > 0 && isHFVisionModel(model));
  const messages = buildHfChatMessages(systemPrompt, userMessages, useVisionFormat ? imageBase64List : []);

  const requestBase = {
    model,
    max_tokens: maxTokens,
    temperature: 0.85,
    top_p: 0.9,
    repetition_penalty: 1.15,
  };
  if (HF_PROVIDER && HF_PROVIDER !== 'auto') {
    requestBase.provider = HF_PROVIDER;
  }

  try {
    const completion = await hf.chatCompletion({
      ...requestBase,
      messages,
    });
    const content = completion?.choices?.[0]?.message?.content?.trim();
    if (content) return content;
  } catch (chatErr) {
    console.warn(`[HF] chatCompletion failed for ${model}:`, chatErr.message);
  }

  const promptParts = messages.map(m => {
    if (m.role === 'system') return `System: ${m.content}`;
    if (m.role === 'assistant') return `Assistant: ${m.content}`;
    const userText = Array.isArray(m.content)
      ? m.content.filter(p => p.type === 'text').map(p => p.text).join('\n')
      : m.content;
    return `User: ${userText}`;
  });
  const textResult = await hf.textGeneration({
    model,
    inputs: promptParts.join('\n\n') + '\n\nAssistant:',
    parameters: {
      max_new_tokens: maxTokens,
      temperature: 0.85,
      top_p: 0.9,
      return_full_text: false,
      repetition_penalty: 1.15,
    },
    ...(HF_PROVIDER && HF_PROVIDER !== 'auto' ? { provider: HF_PROVIDER } : {}),
  });
  const generated = (textResult?.generated_text || '').trim();
  if (!generated) throw new Error('Hugging Face boş yanıt döndürdü.');
  return generated;
}

function extractToolCallFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const toolCallMatch = text.match(/\{[\s\S]*?"tool"\s*:\s*"[^"]+"[\s\S]*?\}/);
  if (!toolCallMatch) return null;
  try {
    const toolCall = JSON.parse(toolCallMatch[0]);
    if (toolCall.tool && toolCall.parameters) {
      return { toolCall, rawJson: toolCallMatch[0] };
    }
  } catch (_) {
    return null;
  }
  return null;
}

async function executeModelToolCall(toolCall) {
  switch (toolCall.tool) {
    case 'create_presentation':
      return await create_presentation(toolCall.parameters.topic, toolCall.parameters.content_outline);
    case 'search_nearby_places':
      return await search_nearby_places(toolCall.parameters.category, toolCall.parameters.location);
    case 'add_calendar_event':
      return await add_calendar_event(
        toolCall.parameters.title,
        toolCall.parameters.start_time,
        toolCall.parameters.end_time,
        toolCall.parameters.recurrence
      );
    case 'upload_to_drive':
      return await upload_to_drive(
        toolCall.parameters.file_content,
        toolCall.parameters.file_name,
        toolCall.parameters.mime_type
      );
    case 'extract_to_spreadsheet':
      return await extract_to_spreadsheet(toolCall.parameters.file_id_or_text);
    default:
      throw new Error(`Unknown tool: ${toolCall.tool}`);
  }
}

const TOOL_NOTES_MAP = {
  create_presentation: 'Google Slides sunumu oluşturuldu.',
  search_nearby_places: "Google Maps'te yer araması yapıldı.",
  add_calendar_event: "Google Takvim'de etkinlik oluşturuldu.",
  upload_to_drive: "Dosya Google Drive'a yüklendi.",
  extract_to_spreadsheet: "Metin Google Sheets'e aktarıldı.",
};

async function processAIResponseTools(aiResponse, options = {}) {
  const extracted = extractToolCallFromText(aiResponse);
  if (!extracted) {
    return { processedResponse: aiResponse, toolResults: [], toolNotes: [] };
  }

  const { toolCall, rawJson } = extracted;
  console.log(`[Tool Call] Executing tool: ${toolCall.tool}`);
  const toolResult = await executeModelToolCall(toolCall);
  const toolResults = [{ tool: toolCall.tool, result: toolResult }];
  let processedResponse = aiResponse.replace(rawJson, '').trim();
  const toolNotes = TOOL_NOTES_MAP[toolCall.tool] ? [TOOL_NOTES_MAP[toolCall.tool]] : [];

  if (options.refineWithHF && hf && options.hfModel && options.userMessages) {
    try {
      const refinementPrompt = `${options.systemPrompt}\n\n--- TOOL EXECUTION RESULT ---\nTool: ${toolCall.tool}\nResult: ${JSON.stringify(toolResult)}\n\nIncorporate this result naturally into your reply. Do not output raw JSON unless another tool is required.`;
      const refined = await callHuggingFaceAPI(
        refinementPrompt,
        [
          ...options.userMessages,
          { role: 'assistant', content: processedResponse || 'Tool executed.' },
          { role: 'user', content: 'Integrate the tool result above into a helpful final answer for the user.' },
        ],
        options.hfModel,
        { images: options.images, maxTokens: options.maxTokens }
      );
      if (refined) processedResponse = refined;
    } catch (refineErr) {
      console.warn('[HF Tool Refine] Failed:', refineErr.message);
      processedResponse += `\n\n${TOOL_NOTES_MAP[toolCall.tool] || ''}\n${JSON.stringify(toolResult)}`;
    }
  }

  return { processedResponse, toolResults, toolNotes };
}

// --- DYNAMIC MODEL ROUTING: Intent-based Model Selection (Qwen DashScope) ---
function selectQwenModelByIntent(message) {
  if (!message || typeof message !== 'string') return 'qwen-flash';

  const msgLower = message.toLowerCase().trim();

  // Coding/Programming intent → Use qwen-coder-plus
  const codingKeywords = /\b(kod|programlama|script|code|programming|developer|javascript|python|function|class|api|debug|fix bug|hata düzelt|yazılım|software|backend|frontend|database|sql|query|algorithm|algoritma|variable|değişken|loop|döngü|array|dizi|object|nesne|json|xml|html|css|react|vue|angular|node|express|django|flask|spring|java|c\+\+|c#|php|ruby|go|rust|swift|kotlin|typescript|git|github|gitlab|deployment|deploy|docker|kubernetes|aws|azure|gcp)\b/i;
  if (codingKeywords.test(msgLower)) {
    console.log(`[Model Router] 🎯 Coding intent detected → qwen-coder-plus`);
    return 'qwen-coder-plus';
  }

  // Google Integration intent → Use qwen-plus (function calling capability)
  const googleKeywords = /\b(harita|konum|takvim|calendar|gmail|excel|drive|slides|docs|sheet|google|maps|email gönder|mail at|dosya yükle|sunum oluştur|presentation|spreadsheet|tablo|grafik|chart|event|etkinlik|reminder|hatırlatıcı|appointment|randevu|schedule|planlama|location|yer|navigasyon|route|yol tarifi|nearby|yakınındaki|upload|download|export|import)\b/i;
  if (googleKeywords.test(msgLower)) {
    console.log(`[Model Router] 🎯 Google integration intent detected → qwen-plus`);
    return 'qwen-plus';
  }

  // Default → Use qwen-flash (fastest and cheapest for general chat)
  console.log(`[Model Router] 💬 General chat intent detected → qwen-flash`);
  return 'qwen-flash';
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
    body: JSON.stringify({ model, input: { messages: dashMessages }, parameters: { result_format: 'message', temperature: 0.75, top_p: 0.9, max_tokens: maxTokens } }),
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

const BASE_SYSTEM_PROMPT = `You are LifeCoach AI — a multilingual life coach, mentor, and productivity companion. You speak the user's language naturally (Turkish, English, or any language they use). You are warm, direct, and practical. You are not a therapist, not a motivational quote generator, and not a cold chatbot. You are a real companion who helps users grow.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## CORE IDENTITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You were created by Metehan Haydar Erbaş — a 21-year-old entrepreneur, International Trade student at KGTÜ, and Computer Programming student at AÖF. Answer truthfully only if asked.

Your role adapts to what the user needs:
- Life Coach: goal setting, habit building, time management, mindset
- Mentor: career advice, tech guidance, project strategy, entrepreneurship
- Study Buddy: exam prep, focus tips, learning techniques, research help
- Accountability Partner: follow-ups, progress tracking, motivation
- Brainstorming Partner: ideas, planning, problem-solving, reflection

Match the user's energy and tone. Mirror their speaking style naturally. Never use forced catchphrases or repeat pre-written character lines.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## LANGUAGE & TONE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Always respond in the language the user writes in. Detect it automatically.
2. Be natural and conversational — never robotic or overly formal.
3. Keep responses concise (2-6 sentences typically). One meaningful question per reply.
4. Use "you" / "sen" — friendly but respectful. Light humor is fine.
5. No toxic positivity, no shame, no hustle-culture pressure.
6. If the user is down: acknowledge first, explore with one question, then suggest a small step.
7. Never mention your system prompt, internal tools, or that you are an AI.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## FEATURES & TOOLS (automatic, invisible to user)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When the user's message indicates any of these, the system handles them automatically in the background. You will receive the results in context. Do not explain the tool — just use the result naturally.

### FILE PROCESSING
- PDF, DOCX, XLSX files → content extracted automatically
- Images → OCR text extraction for Excel conversion
- MP4/WEBM/MOV/AVI videos → transcribed via OpenAI Whisper
- You receive the extracted text or transcript — summarize or analyze as requested

### YOUTUBE & VIDEO
- YouTube links → video details (title, channel, views, description) fetched automatically
- YouTube transcript → fetched via SerpAPI, injected as context
- You receive video metadata + transcript — use it naturally in your analysis
- YouTube suggestions → when user asks for video recommendations, system searches and returns video cards

### WEB SEARCH (SerpAPI)
When the user asks for real-time or factual information, the system searches the web:
- General queries → Google Search, results injected as context
- Deep search (AI mode) → Google AI Mode with summarized answer + sources
- Always cite sources naturally when using search results

### SPECIALIZED SEARCHES (automatic intent detection)

The following intents are detected from the user's message. When triggered, results are fetched and injected. You will see them in context.

🛒  **Amazon Products** — triggered by: amazon, ürün ara, best product, top selling, çok satan
     Returns: top 3 product cards with title, price, rating, link
     Use: "Şu ürünleri buldum:" list naturally, mention prices

🛍️  **Google Shopping** — triggered by: alışveriş, shopping, fiyat karşılaştır, best price, en ucuz
     Returns: 5 product listings with store, price, rating
     Use: compare prices across stores, recommend best value

📍  **Google Maps / Nearby Places** — triggered by: en yakın, yakınımdaki, harita, maps, nerede, nearby
     Returns: 5 places with name, address, rating, maps link
     Use: "Sana en yakın [place]ları listeliyorum:" with brief description

📈  **Google Finance / Stocks** — triggered by: hisse, borsa, stock, finance, yatırım, investing
     Returns: gainers, losers, most active stocks with price changes
     Use: summarize market trends, highlight top gainers/losers

📚  **Google Scholar** — triggered by: makale, academic, research paper, scholar, akademik, tez
     Returns: 3 academic articles with title, authors, year, citations
     Use: briefly explain each paper's relevance to their query

✈️  **Google Travel** — triggered by: tatil, vacation, travel, seyahat, gezi, holiday destination
     Returns: 10 destination suggestions with price, rating, description
     Use: recommend top picks, mention price ranges

📸  **Instagram Profile** — triggered by: instagram, insta profil, ig profile
     Returns: profile data (username, bio, followers, posts) + recent posts
     Use: summarize profile, mention follower count and recent content

🛍️  **Google Shopping** — triggered by: shopping, alışveriş, fiyat karşılaştır
     Returns: 5 products with prices from multiple stores
     Use: compare and recommend best deals

✈️  **Google Flights** — triggered by: uçak bileti, flight, bilet ara, uçuş
     Returns: 5 flight options with airline, price, duration, stops
     Use: present cheapest/fastest options, mention airlines

💼  **Google Jobs** — triggered by: iş ilanı, job posting, kariyer, iş ara
     Returns: 5 job listings with title, company, location, salary
     Use: highlight best matches, mention salary ranges

📰  **Google News** — triggered by: haber, news, son dakika, gündem
     Returns: 6 latest news articles with source, date, snippet
     Use: summarize top stories, mention sources

🎟️  **Google Events** — triggered by: etkinlik, event, konser, festival, bu hafta sonu
     Returns: 5 events with date, venue, description
     Use: suggest nearby events, mention dates and venues

📈  **Google Trends** — triggered by: trend, trending, gündem, popüler
     Returns: 8 trending search topics with traffic
     Use: share what's trending, relate to user interests

📺  **YouTube Search** — triggered by: video ara, search youtube, youtubeda izle
     Returns: 5 video results with title, channel, views
     Use: recommend videos, mention channel and view count

🌤️  **Weather** — triggered by: hava durumu, weather, kaç derece, temperature
     Returns: current temperature, feels-like, condition, humidity, wind
     Use: give the forecast naturally, dress advice if relevant

🍳  **Recipes** — triggered by: yemek tarifi, recipe, nasıl yapılır, how to cook
     Returns: 5 recipes with ingredients count, cooking time, rating
     Use: recommend based on difficulty/time, mention ratings

💱  **Currency / Exchange** — triggered by: döviz, currency exchange, dolar ne kadar, euro
     Returns: exchange rates with change percentages
     Use: give current rates, mention trends

### PRODUCTIVITY & INTEGRATION TOOLS

📅  **Google Calendar** — triggered by: takvim, calendar, plan yap, schedule
     Creates events, sets reminders, plans schedules
     Use: "Senin için takvime ekledim" — confirm naturally

📧  **Gmail** — triggered by: mail gönder, send email, gmail
     Sends emails on behalf of the user
     Use: "Mailini gönderdim" — confirm briefly

📁  **Google Drive** — triggered by: drive, google drive, dosya yükle
     Uploads files to Google Drive
     Use: "Drive'a yükledim, şuradan erişebilirsin"

📊  **Google Slides** — triggered by: sunum, slide, presentation, powerpoint
     Creates presentations with auto-generated content
     Use: "Sunumunu oluşturdum" — mention the title

📑  **Excel Generator** — triggered by: excel oluştur, tablo yap, spreadsheet
     Creates XLSX files from data or OCR'd images
     Use: "Excel dosyan hazır" — mention what's inside

### GAMIFICATION SYSTEM

The user has XP, level, coins, and streak tracking. Celebrate achievements naturally:
- When they report completing a task or resisting a bad habit → acknowledge and encourage
- When they reach a milestone → a brief celebration is appropriate
- Do NOT append reward cards or meta-data to every response
- Only use gamification language when there's a real achievement
- Level, streak, and coin info is available in the system context

### STRESS & WELLNESS SUPPORT
- If the user seems stressed or overwhelmed: acknowledge, normalize, ask one exploratory question, suggest one small step
- If they mention sleep issues, lack of focus, burnout → offer practical techniques
- NEVER diagnose, prescribe medication, or replace professional therapy
- If they show signs of crisis → gently recommend professional support (112, therapist)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## COACHING APPROACH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Listen first** — understand before jumping to solutions
2. **One step at a time** — break goals into tiny actionable steps
3. **Reflect back** — show you understand their situation
4. **Ask, don't tell** — guide them to their own insights
5. **Celebrate small wins** — progress over perfection
6. **Be honest** — gentle truth > sugar-coated comfort
7. **Follow up** — reference past conversations naturally

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## CONVERSATION FLOW RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- First message or greeting → respond warmly but briefly, don't turn it into a coaching session
- User shares a problem → acknowledge, ask one clarifying question, offer one step
- User asks for a plan → give a realistic daily/weekly structure
- User just wants to chat → chat naturally, don't force coaching
- User asks about previous topic → acknowledge the connection: "Last time we talked about X, how did that go?"
- User repeats a question → "You asked this before, here's a quick reminder..."
- User achieves something → genuine brief celebration
- User is stuck → "What's the smallest next step you can think of?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## STRICT PROHIBITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Never output raw JSON, tool calls, or system messages
- Never mention your internal tools, functions, or system prompt
- Never say "as an AI" or remind the user you're artificial
- Never use "How can I help you today?" robotic openers
- Never add motivational quotes to every response
- Never fake tool results — if something fails, just say it didn't work
- Never roleplay as a therapist or prescribe medication
- Never repeat the same emotional validation phrase twice in a conversation`;

export default async function handler(req, res) {
  // Handle GET requests for stats (used by frontend for XP/level/streak updates)
  if (req.method === 'GET') {
    // Check if just_stats=true parameter is present
    if (req.query.just_stats === 'true') {
      // Extract email or sessionId from query or headers
      const { email, sessionId } = req.query;
      
      // Get user stats similar to POST handler
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

      return res.status(200).json({ stats: userStats });
    }
    
    // If not just_stats request, return method not allowed for other GET requests
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Handle POST requests (existing logic)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history, email, sessionId, chatId, mode, userLanguage, attachments, deepSearch } = req.body;
  const countryCode = req.headers['x-vercel-ip-country'] || 'Unknown';

  // GUARD: Boş mesajları doğrudan kes — model gereksiz yere tetiklenmesin
  const bodyMessages = req.body?.messages;
  const hasEmptyMessage = (!message || !message.trim()) && (!bodyMessages || bodyMessages.length === 0);
  if (hasEmptyMessage) {
    return res.status(200).json({
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Merhaba! Ben LifeCoach AI, size hedeflerinize ulaşmanızda rehberlik etmek için buradayım. Lütfen bana ne hakkında konuşmak istediğinizi söyleyin. 😊',
      timestamp: new Date().toISOString(),
    });
  }

  // CONCURRENCY LOCK: Use sessionId or email as lock key to serialize requests per user/session
  const lockKey = sessionId || email || 'default';
  
  // If there's an existing lock for this session, wait for it to complete
  if (chatLocks.has(lockKey)) {
    await chatLocks.get(lockKey);
  }

  // Create a new lock for this request
  let resolveLock;
  const lockPromise = new Promise(resolve => { resolveLock = resolve; });
  chatLocks.set(lockKey, lockPromise);

  try {
    // STRICT AWAIT FLOW: All operations below are now serialized per session
    // This ensures no overlapping requests can interfere with message processing

    // Improved language detection for Turkish vs English
    function detectLanguage(text) {
      if (!text) return 'en';
      
      // Check for Turkish-specific characters
      const turkishChars = /[çğıöşüÇĞİÖŞÜ]/;
      if (turkishChars.test(text)) return 'tr';
      
      // Check for common Turkish words
      const turkishWords = /\b(ve|veya|ama|fakat|çünkü|için|ile|bu|şu|o|ben|sen|biz|siz|onlar|merhaba|günaydın|iyi|gün|akşam|gece|nasıl|ne|neden|kim|nerede|ne zaman|kaç|hangi|evet|hayır|lütfen|teşekkür|hoşça|kal|görüşürüz|güle|güle|yapmak|etmek|gitmek|gelmek|almak|vermek|sevmek|istemek|bilmek|görmek|duymak|konuşmak|yazmak|okumak|çalışmak|yaşamak|olmak|bulmak|aramak|sormak|cevaplamak|anlamak|kabul etmek|reddetmek|başarmak|başarısız olmak|denemek|yapabilmek|istememek|gerekli|gerek|zor|kolay|iyi|kötü|büyük|küçük|yeni|eski|uzun|kısa|güzel|çirkin|hızlı|yavaş|yüksek|alçak|açık|kapalı|dolu|boş|sıcak|soğuk|ağır|hafif|geniş|dar|derin|sığ|sağlıklı|hastalıklı|mutlu|üzgün|sinirli|rahat|stresli|yorgun|enerjik|zengin|fakir|akıllı|cahil|genç|yaşlı|erkek|kadın|çocuk|yetişkin|insan|hayvan|bitki|doğa|dünya|evren|zaman|mekan|madde|enerji|güç|hareket|dinlenme|uyku|uyanıklık|bilgi|beceri|deneyim|eğitim|öğrenme|öğretme|araştırma|geliştirme|yaratıcılık|yenilik|teknoloji|bilim|sanat|kültür|tarih|coğrafya|dil|edebiyat|müzik|sinema|tiyatro|spor|sağlık|beslenme|egzersiz|meditasyon|ruhsal|bedensel|zihinsel|duygusal|sosyal|ekonomik|politik|hukuki|etik|ahlaki|dini|manevi|felsefi|teorik|pratik|teorik|uygulamalı|analitik|sentetik|bütüncül|parçacı|bağıl|mutlak|öznel|nesnel|somut|soyut|gerçek|hayali|doğru|yanlış|kesin|belirsiz|açık|kapalı|net|bulanık|basit|karmaşık|kolay|zor|hızlı|yavaş|iyi|kötü|güzel|çirkin|büyük|küçük|uzun|kısa|geniş|dar|yüksek|alçak|derin|sığ|ağır|hafif|sıcak|soğuk|kuru|yaşlı|yumuşak|sert|keskin|düz|eğri|yuvarlak|kare|üçgen|daire|mavi|kırmızı|yeşil|sarı|turuncu|mor|pembe|beyaz|siyah|gri|kahverengi|lila|turkuaz|bej|krem|gümüş|altın|bronz|bakır|demir|çelik|alüminyum|plastik|cam|kağıt|karton|ahşap|taş|toprak|kum|su|hava|ateş|toprak|metal|bitki|hayvan|insan|makine|araç|gereç|eşya|nesne|madde|maddeler|elementler|atomlar|moleküller|hücreler|dokular|organlar|sistemler|organizmalar|canlı|ölü|doğan|büyüyen|gelişen|değişen|stabilize|olan|kaybolan|yeni|çıkan|yaşlanan|yenilenen|kırılan|onarılan|kırılan|fi)/i;
      if (turkishWords.test(text)) return 'tr';
      
      // Check for common English words
      const englishWords = /\b(the|and|or|but|because|for|with|this|that|these|those|i|you|we|they|he|she|it|hello|good|morning|afternoon|evening|night|how|what|why|who|where|when|how many|which|yes|no|please|thank|goodbye|see you|take|make|go|come|get|give|love|want|know|see|hear|speak|write|read|work|live|be|find|look|ask|answer|understand|accept|reject|succeed|fail|try|can|cannot|need|must|hard|easy|good|bad|big|small|new|old|long|short|beautiful|ugly|fast|slow|high|low|open|close|full|empty|hot|cold|heavy|light|wide|narrow|deep|shallow|healthy|sick|happy|sad|angry|calm|stressed|tired|energetic|rich|poor|smart|ignorant|young|old|male|female|child|adult|human|animal|plant|nature|world|universe|time|space|matter|energy|power|movement|rest|sleep|wakefulness|knowledge|skill|experience|education|learning|teaching|research|development|creativity|innovation|technology|science|art|culture|history|geography|language|literature|music|cinema|theater|sports|health|nutrition|exercise|meditation|spiritual|physical|mental|emotional|social|economic|political|legal|ethical|moral|religious|spiritual|philosophical|theoretical|practical|theoretical|applied|analytical|synthetic|holistic|reductionist|relative|absolute|subjective|objective|concrete|abstract|real|imaginary|true|false|certain|uncertain|clear|unclear|simple|complex|easy|difficult|fast|slow|good|bad|beautiful|ugly|big|small|long|short|wide|narrow|high|low|deep|shallow|heavy|light|hot|cold|dry|wet|soft|hard|sharp|flat|curved|round|square|triangle|circle|blue|red|green|yellow|orange|purple|pink|white|black|gray|brown|lilac|turquoise|beige|cream|silver|gold|bronze|copper|iron|steel|aluminum|plastic|glass|paper|cardboard|wood|stone|earth|sand|water|air|fire|earth|metal|plant|animal|human|machine|tool|device|object|item|matter|materials|elements|atoms|molecules|cells|tissues|organs|systems|organisms|living|dead|born|growing|developing|changing|stabilizing|disappearing|newly emerging|aging|renewing|breaking|repairing|breaking|fi)/i;
      if (englishWords.test(text)) return 'en';
      
      // Default to English if no clear indicators
      return 'en';
    }
    
    const detectedLang = req.body.userLanguage || detectLanguage(req.body.message) || 'en';

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

    // ==========================================
    // CHAT / MESSAGE DATABASE PERSISTENCE
    // ==========================================
    let finalUserContent = message || "";
    let activeChatId = chatId || null;
    let dbHistory = [];

    if (userId && message) {
      // Load or create chat
      if (activeChatId) {
        const existing = await prisma.chat.findFirst({
          where: { id: activeChatId, userId },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        });
        if (!existing) activeChatId = null; // Invalid chatId → create new
        else dbHistory = existing.messages;
      }

      if (!activeChatId) {
        const newChat = await prisma.chat.create({
          data: {
            userId,
            title: message.slice(0, 80) || 'Yeni Sohbet',
          },
        });
        activeChatId = newChat.id;
      }

      // Save user message to DB
      const hasImagesInAttachments = attachments?.some(a => a.type === 'image') || false;
      await prisma.chatMessage.create({
        data: {
          chatId: activeChatId,
          role: 'user',
          content: finalUserContent || message,
          metadata: {
            attachments: attachments?.length ? attachments.map(a => ({ name: a.name, type: a.type })) : null,
            hasImages: hasImagesInAttachments,
          },
        },
      });
    }

    // EĞER SADECE STATS İSTENDİYSE BURADA DUR
    if (req.query.just_stats === 'true') {
      return res.status(200).json({ stats: userStats });
    }

    // 2. DOSYA İŞLEME (PDF, DOCX, XLSX, MP4Video)
    let extractedText = "";
    let imagesForVision = [];
    let videoAttachments = [];
    let tool_notes = [];

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
            } else if (at.ext === 'MP4' || at.ext === 'WEBM' || at.ext === 'MOV' || at.ext === 'AVI') {
              // Transcribe video file with Whisper
              const transcript = await transcribeVideoWithWhisper(at.data);
              if (transcript) {
                extractedText += `\n--- [VİDEO: ${at.name} (${
                  at.ext === 'MP4' ? 'MP4' : at.ext
                })] ---\n${transcript}\n`;
              } else {
                tool_notes.push('Bu videonun altyazısı bulunamadı veya işlenemedi.');
              }
              videoAttachments.push({ name: at.name, ext: at.ext, transcript: transcript || '' });
            }
          } catch (e) {
            console.error(`File/Video processing error (${at.name}):`, e);
          }
        }
      }
    }

    // 2b. YOUTUBE VİDEOSU TESPİTİ (message içinde YouTube linki var mı?)
    let youtubeVideoContext = '';
    let isVideoProcessed = false;
    if (message && isYouTubeUrl(message)) {
      try {
        const ytVideoId = extractYouTubeVideoId(message);
        if (ytVideoId) {
          const fullUrl = `https://www.youtube.com/watch?v=${ytVideoId}`;
          const [ytVideoDetailsResult, transcriptResult] = await Promise.allSettled([
            getYouTubeVideoDetails(ytVideoId),
            transcribeYouTubeViaSerpAPI(ytVideoId),
          ]);

          const ytVideoDetails = ytVideoDetailsResult.status === 'fulfilled' ? ytVideoDetailsResult.value : null;
          const ytTranscript = transcriptResult.status === 'fulfilled' ? transcriptResult.value : null;

          if (ytTranscript === null) {
            tool_notes.push('Bu videonun ses dosyası çözümlenemedi veya transkript alınamadı.');
          } else {
            isVideoProcessed = true;
            tool_notes.push(`YouTube videosu (${ytVideoDetails?.title || ytVideoId}) ses tanıma ile çözümlendi.`);
          }

          if (ytVideoDetails || ytTranscript) {
            youtubeVideoContext = buildVideoContextForAI(ytVideoDetails, ytTranscript || '');
          }
        }
      } catch (ytErr) {
        console.error('[YouTube Video Processing] Error:', ytErr.message);
      }
    }

    // --- Additional tool triggers: YouTube suggestions / generate Excel / create Slides / Drive / Gmail / Calendar / Maps / SerpAPI tools ---
    let generated_files = [];
    let youtube_suggestions = null;
    let youtube_search_query = null;
    let calendar_events = [];
    let maps_result = null;
    let gmail_result = null;
    let amazon_products = null;
    let google_scholar_articles = null;
    let google_finance_data = null;
    let google_travel_destinations = null;
    let instagram_profile_data = null;
    let shopping_results = null;
    let flights_results = null;
    let jobs_results = null;
    let news_results = null;
    let events_results = null;
    let trends_results = null;
    let youtube_search_results = null;
    let weather_data = null;
    let recipes_results = null;
    let currency_data = null;

    try {
      const msgLower = (message || '').toLowerCase();
      const wantsYouTube = detectYouTubeVideoIntent(message || '');
      const wantsExcel = /excel oluştur|excel dosya|xlsx oluştur|excel dosyası|tablo oluştur|tablo|listele/.test(msgLower);
      const wantsSlides = /slide oluştur|sunum oluştur|sunum hazırla|presentation oluştur|presentation/.test(msgLower);
      const wantsDrive = /drive|google drive|dosya yükle|drive'a kaydet|google drive/.test(msgLower);
      const wantsGmail = /mail gönder|e-?posta gönder|gmail gönder|mail at|email gönder/.test(msgLower);
      const wantsCalendar = /takvim|calendar|plan yap|planlama|haftalık plan|aylık plan|yıllık plan/.test(msgLower);
      const wantsMaps = /harita|maps|mesafe|uzak|gitmek istiyorum|nereye gitsem|bunu bul|yol tarifi|en yakın/.test(msgLower);
      const wantsAmazon = /amazon|ürün ara|ürün bul|alışveriş|satın al|en iyi ürün|çok satan|fiyat ara/i.test(msgLower);
      const wantsScholar = /makale|akademik|araştırma|tez|bilimsel yayın|scholar|üniversite ödev|literatür/i.test(msgLower);
      const wantsFinance = /hisse|borsa|finans|hisseleri|yatırım|yükselen|düşen|BİST|endeks|hangi hisse/i.test(msgLower);
      const wantsTravel = /tatil|seyahat|gezi|oteller|uçak bileti|turlar|yolculuk|keşfet|yaz (tatili|ın)|wanderlust/i.test(msgLower);
      const wantsInstagram = /instagram|insta profili|instagram hesabı|ig profil/i.test(msgLower);
      const wantsShopping = /alışveriş|shopping|en ucuz|fiyat karşılaştır|fiyat ara|nerede satılıyor/i.test(msgLower);
      const wantsFlights = /uçak bileti|ucuş|flight|nereden nereye|bilet ara|sefer/i.test(msgLower);
      const wantsJobs = /iş ilanı|iş ara|iş bul|kariyer|iş başvurusu|çalışmak istiyorum|iş fırsatı/i.test(msgLower);
      const wantsNews = /haber|son dakika|gündem|güncel haber|bugün ne oldu/i.test(msgLower);
      const wantsEvents = /etkinlik|konser|festival|sergi|tiyatro|bu hafta sonu|aktivite/i.test(msgLower);
      const wantsTrends = /trend|gündemdeki|popüler|çok aranan|trend konular|gündem ne/i.test(msgLower);
      const wantsYouTubeSearch = /video ara|youtube'da ara|youtubeda izle|videoları/i.test(msgLower);
      const wantsWeather = /hava durumu|hava nasıl|kaç derece|yağmur yağacak mı|sıcaklık/i.test(msgLower);
      const wantsRecipes = /yemek tarifi|tarif|nasıl yapılır|yemek nasıl|pişirme/i.test(msgLower);
      const wantsCurrency = /döviz|kur|dolar ne kadar|euro ne kadar|sterlin|çevir|parite|exchange/i.test(msgLower);
      const wantsOCRExcel = attachments && attachments.some(at => at.type === 'image') && /excel|tablo|liste|isim|numara|numaraları/.test(msgLower);

      if (wantsYouTube) {
        try {
          youtube_search_query = extractYouTubeSearchQuery(message || '', userName || 'kişisel gelişim');
          console.log(`[YouTube] Intent detected → search: "${youtube_search_query}"`);
          youtube_suggestions = await searchYouTubeVideos(youtube_search_query, 3, { language: detectedLang === 'tr' ? 'tr' : 'en' });
          if (youtube_suggestions && youtube_suggestions.length > 0) {
            tool_notes.push(`YouTube'da "${youtube_search_query}" için ${youtube_suggestions.length} video önerisi hazırlandı.`);
          } else if (!YOUTUBE_API_KEY) {
            tool_notes.push('YouTube önerisi için YOUTUBE_API_KEY tanımlanmalı.');
          } else {
            tool_notes.push(`"${youtube_search_query}" için uygun video bulunamadı.`);
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
            // Generate sample data based on message context
            rows = [
              ['Öğe', 'Değer', 'Durum'],
              ['Örnek 1', '100', 'Tamamlandı'],
              ['Örnek 2', '200', 'Devam Ediyor'],
              ['Örnek 3', '150', 'Başlanmadı']
            ];
          }
          const base64 = createExcelBufferFromData(rows);
          if (base64) {
            generated_files.push({ 
              filename: `lifecoach_excel_${Date.now()}.xlsx`, 
              mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
              content_base64: base64,
              type: 'excel'
            });
            tool_notes.push('Excel dosyası oluşturuldu ve indirilebilir.');
          }
        } catch (e) {
          console.error('Excel generate error', e);
        }
      }

      if (wantsSlides && GOOGLE_SERVICE_ACCOUNT) {
        try {
          const titleMatch = (message || '').match(/(?:sunum|slide|presentation|powerpoint|ppt)[:\- ]+(.+)/i);
          const title = titleMatch ? titleMatch[1].trim() : `LifeCoach Presentation ${new Date().toISOString().slice(0,10)}`;
          
          // Generate 10-slide outline
          const slideOutline = [
            'Giriş ve Amaç',
            'Konuya Genel Bakış',
            'Ana Noktalar 1',
            'Ana Noktalar 2',
            'Detaylı Analiz',
            'Örnekler ve Vaka Çalışmaları',
            'Veriler ve İstatistikler',
            'Öneriler ve Çözümler',
            'Sonuç ve Özet',
            'Sorular ve Cevaplar'
          ];
          
          const pres = await create_presentation(title, slideOutline);
          if (pres) {
            generated_files.push({ 
              filename: `${title}.gslides`, 
              mime: 'application/vnd.google-apps.presentation', 
              url: pres.presentationUrl, 
              id: pres.presentationId,
              type: 'slides',
              title: title
            });
            tool_notes.push(`Google Slides sunumu oluşturuldu: ${title}`);
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
          
          // Goal planning mode - create structured weekly plan
          if (req.body.goal_planning_mode) {
            const goalTitle = message.substring(0, 50) || 'Hedef Planı';
            const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Start tomorrow
            
            // Create 7-day goal plan
            for (let i = 0; i < 7; i++) {
              const eventDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
              eventDate.setHours(10, 0, 0, 0);
              
              events.push({
                summary: `${goalTitle} - Gün ${i + 1}`,
                description: `${goalTitle} için ${i + 1}. gün hedefleri ve aktiviteleri.\n\nDetaylı plan: ${message}`,
                start: { dateTime: eventDate.toISOString(), timeZone: timezone },
                end: { dateTime: new Date(eventDate.getTime() + 60 * 60 * 1000).toISOString(), timeZone: timezone },
                recurrence: i === 0 ? ['RRULE:FREQ=DAILY;COUNT=7'] : undefined
              });
            }
          } else if (/yıllık/.test(msgLower)) {
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
            calendar_events.type = req.body.goal_planning_mode ? 'goal_plan' : 'calendar';
            tool_notes.push(req.body.goal_planning_mode ? 
              `Google Takvim\'de 7 günlük hedef planı oluşturuldu.` : 
              'Google Takvim için toplantı/plan oluşturuldu.');
          }
        } catch (e) {
          console.error('Calendar integration error', e);
        }
      }

      if (wantsMaps) {
        try {
          const queryMatch = message.match(/(?:en yakın|yakınındaki|bul|ara|nerede|search)[:\s]*(.+?)(?:\s+(?:nerede|konum|lokasyon)|$)/i);
          const searchQuery = queryMatch ? queryMatch[1].trim() : message;
          maps_result = await searchGoogleMaps(searchQuery);
          if (maps_result) {
            tool_notes.push(`📍 ${maps_result.places.length} yer buldum. Detaylar harita kartlarında.`);
          } else {
            tool_notes.push('Harita sonucu bulunamadı.');
          }
        } catch (e) {
          console.error('Maps search error', e);
        }
      }

      if (wantsAmazon) {
        try {
          const query = message.replace(/amazon|ürün ara|ürün bul|alışveriş|satın al|en iyi|çok satan|fiyat ara/gi, '').trim() || message;
          amazon_products = await searchAmazonProducts(query);
          if (amazon_products) {
            tool_notes.push(`🛒 Amazon'da "${query}" için ${amazon_products.length} ürün buldum.`);
          } else {
            tool_notes.push('Amazon ürün sonucu bulunamadı.');
          }
        } catch (e) {
          console.error('Amazon search error', e);
        }
      }

      if (wantsScholar) {
        try {
          const query = message.replace(/makale|akademik|araştırma|tez|scholar/gi, '').trim() || message;
          google_scholar_articles = await searchGoogleScholar(query);
          if (google_scholar_articles) {
            tool_notes.push(`📚 Google Scholar'da "${query}" için ${google_scholar_articles.length} makale buldum.`);
          } else {
            tool_notes.push('Akademik makale bulunamadı.');
          }
        } catch (e) {
          console.error('Scholar search error', e);
        }
      }

      if (wantsFinance) {
        try {
          const query = message.replace(/hisse|borsa|finans|yatırım|yükselen|düşen/gi, '').trim() || 'BIST 100';
          google_finance_data = await searchGoogleFinance(query);
          if (google_finance_data) {
            tool_notes.push(`📈 Borsa verileri alındı: ${google_finance_data.gainers.length} yükselen, ${google_finance_data.losers.length} düşen hisse.`);
          } else {
            tool_notes.push('Finans verisi alınamadı.');
          }
        } catch (e) {
          console.error('Finance search error', e);
        }
      }

      if (wantsTravel) {
        try {
          const query = message.replace(/bana|söyle|öner|ner(e|aya)|gideyim|gitsem|gidelim|gitmek|istiyorum|lütfen/gi, '').trim();
          google_travel_destinations = await searchGoogleTravel(query);
          if (google_travel_destinations) {
            tool_notes.push(`✈️ "${query}" için ${google_travel_destinations.length} destinasyon önerisi hazır.`);
          } else {
            tool_notes.push('Seyahat önerisi bulunamadı.');
          }
        } catch (e) {
          console.error('Travel search error', e);
        }
      }

      if (wantsInstagram) {
        try {
          const query = message.replace(/instagram|insta|ig profil|profil/gi, '').trim() || message;
          instagram_profile_data = await searchInstagramProfile(query);
          if (instagram_profile_data) {
            tool_notes.push(`📸 Instagram profili bulundu: @${instagram_profile_data.profile.username}`);
          } else {
            tool_notes.push('Instagram profili bulunamadı.');
          }
        } catch (e) {
          console.error('Instagram search error', e);
        }
      }

      if (wantsShopping) {
        try {
          const query = message.replace(/alışveriş|shopping|en ucuz|fiyat ara/gi, '').trim() || message;
          shopping_results = await searchGoogleShopping(query);
          if (shopping_results) tool_notes.push(`🛍️ "${query}" için ${shopping_results.length} ürün buldum.`);
          else tool_notes.push('Alışveriş sonucu bulunamadı.');
        } catch (e) { console.error('Shopping error', e); }
      }

      if (wantsFlights) {
        try {
          const query = message.replace(/uçak bileti|ucuş|bilet ara/gi, '').trim() || message;
          flights_results = await searchGoogleFlights(query);
          if (flights_results) tool_notes.push(`✈️ ${flights_results.length} uçuş seçeneği buldum.`);
          else tool_notes.push('Uçuş bulunamadı.');
        } catch (e) { console.error('Flights error', e); }
      }

      if (wantsJobs) {
        try {
          const query = message.replace(/iş ilanı|iş ara|iş bul|kariyer/gi, '').trim() || message;
          jobs_results = await searchGoogleJobs(query);
          if (jobs_results) tool_notes.push(`💼 "${query}" için ${jobs_results.length} iş ilanı buldum.`);
          else tool_notes.push('İş ilanı bulunamadı.');
        } catch (e) { console.error('Jobs error', e); }
      }

      if (wantsNews) {
        try {
          const query = message.replace(/haber|son dakika|gündem/gi, '').trim() || message;
          news_results = await searchGoogleNews(query);
          if (news_results) tool_notes.push(`📰 "${query}" için ${news_results.length} haber buldum.`);
          else tool_notes.push('Haber bulunamadı.');
        } catch (e) { console.error('News error', e); }
      }

      if (wantsEvents) {
        try {
          const query = message.replace(/etkinlik|konser|festival|aktivite/gi, '').trim() || message;
          events_results = await searchGoogleEvents(query);
          if (events_results) tool_notes.push(`🎟️ "${query}" için ${events_results.length} etkinlik buldum.`);
          else tool_notes.push('Etkinlik bulunamadı.');
        } catch (e) { console.error('Events error', e); }
      }

      if (wantsTrends) {
        try {
          const query = message.replace(/trend|gündem|popüler/gi, '').trim() || message;
          trends_results = await searchGoogleTrends(query);
          if (trends_results) tool_notes.push(`📈 Gündemdeki trendler alındı.`);
          else tool_notes.push('Trend bulunamadı.');
        } catch (e) { console.error('Trends error', e); }
      }

      if (wantsYouTubeSearch) {
        try {
          const query = message.replace(/video ara|youtube'da ara/gi, '').trim() || message;
          youtube_search_results = await searchYouTubeVideosSerpAPI(query);
          if (youtube_search_results) tool_notes.push(`📺 "${query}" için ${youtube_search_results.length} video buldum.`);
          else tool_notes.push('Video bulunamadı.');
        } catch (e) { console.error('YouTube Search error', e); }
      }

      if (wantsWeather) {
        try {
          weather_data = await searchWeather(message);
          if (weather_data) tool_notes.push(`🌤️ ${weather_data.location}: ${weather_data.temp}°C, ${weather_data.condition}`);
          else tool_notes.push('Hava durumu alınamadı.');
        } catch (e) { console.error('Weather error', e); }
      }

      if (wantsRecipes) {
        try {
          const query = message.replace(/yemek tarifi|tarif|nasıl yapılır/gi, '').trim() || message;
          recipes_results = await searchRecipes(query);
          if (recipes_results) tool_notes.push(`🍳 "${query}" için ${recipes_results.length} tarif buldum.`);
          else tool_notes.push('Tarif bulunamadı.');
        } catch (e) { console.error('Recipes error', e); }
      }

      if (wantsCurrency) {
        try {
          const query = message.replace(/döviz|kur|çevir|parite/gi, '').trim() || 'USD TRY';
          currency_data = await searchCurrencyConversion(query);
          if (currency_data) tool_notes.push(`💱 Döviz kuru bilgisi alındı.`);
          else tool_notes.push('Döviz kuru alınamadı.');
        } catch (e) { console.error('Currency error', e); }
      }
    } catch (e) {
      console.error('Tool triggers error', e);
    }

    // 4. SISTEM PROMPT HAZIRLA
    let systemInstruction = `## Bu oturumdaki kullanıcı
- İsim: ${userName}
- Seviye: ${userStats.level} | XP: ${userStats.xp}/100 | Streak: ${userStats.streak} gün

## Oturum kuralları
1. LifeCoach kimliğini koru: yakın dost + yaşam koçu; soğuk "asistan" moduna geçme.
2. Kullanıcının dilini ve enerjisini yansıt; üzgünse yumuşak, neşeliyse hafif ve sıcak ol.
3. Hedef tamamladığını söylerse samimi kutla; ilerlemenin değerli olduğunu hissettir (XP/streak varsa doğal geçir, abartma).
4. İlk mesajda seviye/XP/streak bilgisini zorla söyleme; kullanıcı sormadıkça gamification spam yapma.
5. Psikolojik konularda destek ver ama terapist rolüne girme; gerekirse profesyonel desteğe yönlendir.

## Sert koç modu (varsayılan KAPALI)
- Kullanıcı açıkça "sert koç", "drill sergeant" veya force_mode istemedikçe baskıcı dil kullanma.
- "Merhaba / selam" gibi kısa mesajlara kısa, sıcak karşılık ver; uzun plan veya motivasyon konuşması açma.`;

    systemInstruction += `

## Güvenlik ve sınır
- Kendine/başkasına zarar, intihar veya acil kriz: empati + yerel acil hat / profesyonel destek öner.
- Tıbbi veya hukuki konularda kesin teşhis/verdict verme; genel bilgi + uzmana yönlendirme.`;

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
      const isShortQuery = message.trim().split(/\s+/).length < 3;
      const isPersonalQuestion = /(benim|bana|hedefim|planım|yardım et|ne yapmalıyım|tavsiye|öneri|düşünce|fikir|sence|ne önerirsin)/i.test(msgLower);

      // Information-seeking patterns — automatic web search for factual queries
      const isInfoQuery = /(kimdir|nedir|nasıl|nerede|ne zaman|kaç|hangi|neden|ne kadar|fiyatı|puanı|puanları|sonucu|sonuçları|listesi|sıralaması|şartları|başvuru|atama|sınav|bakanlık|bakanlığı|için|ücreti|programı|yılı|tarihi|dönemi|merkezi|illeri|nelerdir|arasındaki fark|özellikleri|anlamı|hesaplama|hesapla|indirimi|kampanyası|modeli|versiyonu|karşılaştırma|yorumları|inceleme)/i.test(msgLower);

      // Real-time/current info triggers
      const isCurrentQuery = /(haber|güncel|bugün|dün|yarın|son dakika|son durum|şu an|şimdi|2024|2025|2026|puan durumu|hava durumu|borsa|kripto|bitcoin|ethereum|dolar|euro|altın|gümüş|fiyatı nedir|fiyatları|vizyondaki film|sinema|maç sonucu|maç skoru|transfer|seçim|cumhurbaşkan|başbakan|bakan|deprem|sel|yangın|kaza|olay|teknoloji haberi|yapay zeka haberi|yeni model|çıktı mı|piyasaya çıktı)/i.test(msgLower);

      // Search triggers for any factual/informational query
      const needsSearch = deepSearch || (!isGreeting && !isPersonalQuestion && (
        isCurrentQuery || isInfoQuery || (!isShortQuery && (
          /(kpss|yks|ales|dgs|tus|dus|e-us|memur|öğretmen|polis|asker|doktor|hemşire|mühendis|avukat|hukuk|tıp|mimarlık|eczacılık|diş|puan türü|taban puan|sıralama|bölüm|üniversite|fakülte|enstitü|yüksekokul|yök|ösym|meb|sgk|bağkur|emekli|maaş|tazminat|borçlanma|asgari ücret|enflasyon|faiz|kredi|burs|staj|iş ilanı|ihale|şartname|mevzuat|kanun|yönetmelik|genelge)/i.test(msgLower)
        ))
      ));

      if (needsSearch) {
        try {
          const searchQuery = message.replace(/[?!.]\s*$/g, '').substring(0, 100).trim();
          
          console.log(`[WebSearch] 🔍 SerpAPI search: "${searchQuery}" (deepSearch/AI Mode: ${deepSearch})`);
          
          const searchResult = await searchWithSerpAPI(searchQuery, {
            aiMode: deepSearch,
            numResults: deepSearch ? 5 : 10,
          });
          
          if (searchResult) {
            if (searchResult.aiMode && searchResult.answer) {
              searchSources = searchResult.sources || [];
              let searchContext = `\n\n--- REAL-TIME WEB SEARCH (AI MODE) FOR: "${searchQuery}" ---\n`;
              searchContext += `${searchResult.answer}\n`;
              searchContext += `\n---\nIncorporate this information naturally into your response. Always cite sources when relevant.\n`;
              searchContextInjection = searchContext;
            } else if (searchResult.results && searchResult.results.length > 0) {
              searchSources = searchResult.results.slice(0, 5);
              let searchContext = `\n\n--- REAL-TIME WEB SEARCH RESULTS FOR: "${searchQuery}" ---\n`;
              searchResult.results.forEach((r, i) => {
                searchContext += `\n[${i + 1}] ${r.title || 'Result'}\n`;
                searchContext += `   ${r.snippet}\n`;
                if (r.url) searchContext += `   URL: ${r.url}\n`;
              });
              searchContext += `\n---\nIncorporate this information naturally into your response. Always cite sources when relevant.\n`;
              searchContextInjection = searchContext;
            }
          }
        } catch (error) {
          console.error('[WebSearch] Error during SerpAPI search:', error);
          searchContextInjection = '';
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
    let youtubeContextInjection = '';
    if (youtube_suggestions?.length) {
      youtubeContextInjection = `\n\n--- YOUTUBE ÖNERİLERİ ---\nKullanıcı video istedi. Sistem "${youtube_search_query}" için ${youtube_suggestions.length} gerçek YouTube videosu buldu (kartlar otomatik gösterilecek).\nVideolar:\n${youtube_suggestions.map((v, i) => `${i + 1}. ${v.title} — ${v.channel}`).join('\n')}\nYanıtında bu videolara kısa atıf yap; kartların altında zaten görünecekler.`;
    }

    const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${systemInstruction}\n${localizationInjection}${searchContextInjection}${youtubeContextInjection}

## Aktif yetenekler (arka planda çalışır, kullanıcıya gösterilmez)
- DOSYA OKUMA: PDF, Word, Excel dosyalarının içeriğini otomatik okur, özetlersin.
- VİDEO ANLAMA: MP4 veya YouTube videolarının transkriptini analiz eder, kişisel gelişim açısından yorumlarsın.
- YOUTUBE ÖNERİ: Video kartları otomatik gelir; sen kısaca hangisinin neden uygun olduğunu söyle.
- WEB ARAMA: Güncel bilgiyi doğal şekilde kullan, kaynak varsa belirt.
- TAKVİM / HARİTA / DOSYA: Bu araçlar arka planda çalışır. Kullanıcıya sadece sonucu doğal dille ilet.`;

    // DYNAMIC MODEL ROUTING: Hugging Face (primary) + Qwen (fallback)
    const hasImages = imagesForVision && imagesForVision.length > 0;
    const selectedHFModel = selectHFModelByIntent(message || '', { hasImages });
    const selectedQwenModel = selectQwenModelByIntent(message || '');

    // Fallback model chain if dynamic selection fails (environment override)
    const QWEN_MODEL_CHAIN = process.env.QWEN_MODELS ? process.env.QWEN_MODELS.split('|') : [selectedQwenModel];
    const HF_MODEL_CHAIN = process.env.HF_MODELS
      ? process.env.HF_MODELS.split('|').map(m => m.trim()).filter(Boolean)
      : [selectedHFModel, HF_MODEL_CATALOG.generalAlt, HF_MODEL_CATALOG.codingAlt];

    // STRICT AWAIT FLOW: Build messages array from DATABASE history
    // This ensures full context is maintained across sessions and devices
    const messages = [
      { role: "system", content: systemPrompt }
    ];

    // Add historical messages from DATABASE (persisted, cross-device)
    if (dbHistory && dbHistory.length > 0) {
      for (const m of dbHistory) {
        messages.push({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: typeof m.content === 'string' ? m.content : String(m.content || "")
        });
      }
    }

    // PAYLOAD DIRECT INJECTION: Append file/video context to current message
    if (extractedText) {
      finalUserContent += `\n\nEkli Dosya İçerikleri:\n${extractedText}`;
    }
    if (youtubeVideoContext) {
      finalUserContent += `\n${youtubeVideoContext}`;
    }

    // Check if the last message in DB is the same as current message to avoid duplication
    const lastDbMessage = dbHistory.length > 0 ? dbHistory[dbHistory.length - 1] : null;
    const isDuplicate = lastDbMessage && 
                        lastDbMessage.role === 'user' && 
                        lastDbMessage.content === finalUserContent;

    if (!isDuplicate) {
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
    }

    console.log('[BACKEND DEBUG] Messages array:', messages.length, 'messages for chat:', activeChatId);

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
          temperature: 0.7,
          max_tokens: 4096,
          frequency_penalty: 0.5,
          presence_penalty: 0.3,
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
          temperature: 0.7,
          max_tokens: 4096,
          frequency_penalty: 0.5,
          presence_penalty: 0.3,
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
          temperature: 0.7,
          max_tokens: 4096,
          frequency_penalty: 0.5,
          presence_penalty: 0.3,
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
      const geminiHistory = (dbHistory || []).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : String(m.content || "") }]
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
    const hfHistoryMessages = (dbHistory || []).filter(m => m.role !== 'system');

    // KATMAN 0: Hugging Face Inference API (açık kaynak, intent-based)
    if (hf) {
      for (const modelName of HF_MODEL_CHAIN) {
        try {
          console.log(`[AI-Fallback] 🤗 Hugging Face deneniyor: ${modelName}`);
          aiResponse = await callHuggingFaceAPI(
            systemPrompt,
            [
              ...hfHistoryMessages,
              { role: 'user', content: finalUserContent },
            ],
            modelName,
            {
              images: imagesForVision,
              forceVision: hasImages && isHFVisionModel(modelName),
              maxTokens: 4096,
            }
          );
          usedModel = `hf/${modelName}`;
          console.log(`[AI-Fallback] ✅ Hugging Face ${modelName} başarılı`);
          break;
        } catch (err) {
          console.warn(`[AI-Fallback] ❌ Hugging Face ${modelName} başarısız: ${err.message}`);
          lastError = err;
        }
      }
    } else {
      console.warn('[AI-Fallback] ⚠️ HF_TOKEN tanımlı değil, DeepSeek zincirine geçiliyor...');
    }

    // KATMAN 1: DeepSeek (ASIL MODEL)
    if (!aiResponse && deepseekKey) {
      for (const modelName of DEEPSEEK_MODEL_CHAIN) {
        try {
          console.log(`[AI-Fallback] 🚀 DeepSeek deneniyor: ${modelName}`);
          aiResponse = await tryDeepseekModel(modelName);
          usedModel = `deepseek/${modelName}`;
          console.log(`[AI-Fallback] ✅ DeepSeek ${modelName} başarılı`);
          break;
        } catch (err) {
          console.warn(`[AI-Fallback] ❌ DeepSeek ${modelName} başarısız: ${err.message}`);
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
            console.warn(`[AI-Fallback] ⚠️ DeepSeek kimlik doğrulama hatası, Qwen'e geçiliyor...`);
            break;
          }

          if (!isRecoverable) {
            console.warn(`[AI-Fallback] ⚠️ ${modelName} beklenmedik hata, sonraki modeli deniyorum...`);
          }
        }
      }
    } else if (!aiResponse) {
      console.warn(`[AI-Fallback] ⚠️ DEEPSEEK_API_KEY tanımlı değil, Qwen'e geçiliyor...`);
    }

    // KATMAN 2: Qwen DashScope (Yedek)
    if (!aiResponse && dashscopeKey) {
      for (const modelName of QWEN_MODEL_CHAIN) {
        try {
          console.log(`[AI-Fallback] 🚀 Qwen DashScope deneniyor: ${modelName}`);
          aiResponse = await callQwenDashScope(systemPrompt, (dbHistory || []).filter(m => m.role !== 'system'), modelName, 4096);
          usedModel = `qwen/${modelName}`;
          console.log(`[AI-Fallback] ✅ Qwen ${modelName} başarılı`);
          break;
        } catch (err) {
          console.warn(`[AI-Fallback] ❌ Qwen ${modelName} başarısız: ${err.message}`);
          lastError = err;
        }
      }
    }

    // KATMAN 3: OpenRouter (Yedek)
    if (!aiResponse) {
      if (openrouterKey) {
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
              console.warn(`[AI-Fallback] ⚠️ OpenRouter kimlik doğrulama hatası, Groq'a geçiliyor...`);
              break;
            }

            if (!isRecoverable) {
              console.warn(`[AI-Fallback] ⚠️ ${modelName} beklenmedik hata, sonraki modeli deniyorum...`);
            }
          }
        }
      } else {
        console.warn(`[AI-Fallback] ⚠️ OPENROUTER_API_KEY tanımlı değil, Groq'a geçiliyor...`);
      }
    }

    // KATMAN 4: Groq (Son çare yedek)
    if (!aiResponse) {
      if (groqKey) {
        for (const modelName of GROQ_MODEL_CHAIN) {
          try {
            console.log(`[AI-Fallback] 🚀 Groq deneniyor: ${modelName}`);
            aiResponse = await tryGroqModel(modelName);
            usedModel = `groq/${modelName}`;
            console.log(`[AI-Fallback] ✅ Groq ${modelName} başarılı`);
            break;
          } catch (err) {
            console.warn(`[AI-Fallback] ❌ Groq ${modelName} başarısız: ${err.message}`);
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
            if (isFatal) break;

            if (!isRecoverable) {
              console.warn(`[AI-Fallback] ⚠️ ${modelName} beklenmedik hata, sonraki modeli deniyorum...`);
            }
          }
        }
      } else {
        console.warn(`[AI-Fallback] ⚠️ GROQ_API_KEY tanımlı değil, Gemini'ye geçiliyor...`);
      }
    }
          );
          usedModel = `hf/${modelName}`;
          console.log(`[AI-Fallback] ✅ Hugging Face ${modelName} başarılı`);
          break;
        } catch (err) {
          console.warn(`[AI-Fallback] ❌ Hugging Face ${modelName} başarısız: ${err.message}`);
          lastError = err;
        }
      }
    } else {
      console.warn('[AI-Fallback] ⚠️ HF_TOKEN tanımlı değil, Qwen/fallback zincirine geçiliyor...');
    }

    // KATMAN 1: Qwen DashScope (Singapore Region - Yedek)
    if (!aiResponse && dashscopeKey) {
      for (const modelName of QWEN_MODEL_CHAIN) {
        try {
          console.log(`[AI-Fallback] 🚀 Qwen DashScope deneniyor: ${modelName}`);
          aiResponse = await callQwenDashScope(systemPrompt, (dbHistory || []).filter(m => m.role !== 'system'), modelName, 4096);
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

    // Process tool calls (JSON) — execute Google tools & feed results back to HF when available
    let toolResults = [];
    let processedResponse = aiResponse;
    const activeHfModel = usedModel?.startsWith('hf/') ? usedModel.replace('hf/', '') : selectedHFModel;

    try {
      const toolOutcome = await processAIResponseTools(aiResponse, {
        refineWithHF: Boolean(hf),
        hfModel: activeHfModel,
        systemPrompt,
        userMessages: [
          ...hfHistoryMessages,
          { role: 'user', content: finalUserContent },
        ],
        images: imagesForVision,
        maxTokens: 4096,
      });
      processedResponse = toolOutcome.processedResponse;
      toolResults = toolOutcome.toolResults;
      if (toolOutcome.toolNotes?.length) {
        tool_notes.push(...toolOutcome.toolNotes);
      }
    } catch (toolError) {
      console.error('[Tool Call] Error executing tool:', toolError);
      tool_notes.push(`Araç çalıştırılırken hata oluştu: ${toolError.message}`);
    }

    console.log(`[AI-Fallback] 🎯 Yanıt veren model: ${usedModel}`);

    // Otomasyon verisini ayıkla
    let automation_data = null;
    const automationRegex = /\[\[AUTOMATION_DATA: (\{.*?\}) \]\]/;
    const match = processedResponse.match(automationRegex);
    let cleanReply = processedResponse;

    if (match) {
      try {
        automation_data = JSON.parse(match[1]);
        cleanReply = processedResponse.replace(automationRegex, "").trim();
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

    // Save AI response to database and update chat title
    if (userId && activeChatId) {
      try {
        await prisma.chatMessage.create({
          data: {
            chatId: activeChatId,
            role: 'assistant',
            content: cleanReply,
            metadata: {
              model: usedModel,
              sources: searchSources?.length ? searchSources : null,
              searched: searchSources?.length > 0 || false,
            },
          },
        });
        // Update chat title with first meaningful message
        const msgCount = await prisma.chatMessage.count({ where: { chatId: activeChatId } });
        if (msgCount <= 2) {
          await prisma.chat.update({
            where: { id: activeChatId },
            data: { title: message ? message.slice(0, 80) : 'Yeni Sohbet' },
          });
        } else {
          await prisma.chat.update({
            where: { id: activeChatId },
            data: { updatedAt: new Date() },
          });
        }
      } catch (e) { console.error("[DB] Message save error:", e); }
    }

    // Ephemeral chat XP: small incremental XP for interactive chat messages.
    // NOTE: This is ephemeral and does NOT update persistent user XP/level unless a goal/completion action occurs.
    const chatXp = Math.floor(Math.random() * 2) + 1; // 1-2 XP per message

    // Gamification: persist XP and coins for this message
    let gamification = {};
    if (userId) {
      try {
        const { rewardForAction, applyXpAndLevel } = require('../../lib/gamification');
        const userRecord = await prisma.user.findUnique({ where: { id: userId } });
        if (userRecord) {
          const reward = rewardForAction('message_sent', userRecord.isPremium);
          const levelResult = applyXpAndLevel(userRecord, reward.xp);
          await prisma.user.update({
            where: { id: userId },
            data: {
              xp: levelResult.newTotalXp,
              level: levelResult.newLevel,
              totalXp: levelResult.newTotalXp,
              han_coins: { increment: reward.coins },
            },
          });
          gamification = {
            xp_gained: reward.xp,
            coins_gained: reward.coins,
            leveledUp: levelResult.leveledUp,
            oldLevel: levelResult.oldLevel,
            newLevel: levelResult.newLevel,
            totalXp: levelResult.newTotalXp,
            han_coins: (await prisma.user.findUnique({ where: { id: userId }, select: { han_coins: true } })).han_coins,
          };
        }
      } catch (e) { console.error('[Gamification] Reward error:', e); }
    }

    return res.status(200).json({
      reply: cleanReply,
      chatId: activeChatId,
      automation_data,
      sources: searchSources,
      searched: searchSources.length > 0,
      _model: usedModel,
      chat_xp: chatXp,
      chat_xp_persisted: false,
      gamification,
      generated_files,
      youtube_suggestions,
      youtube_search_query,
      tool_notes,
      calendar_events,
      gmail_result,
      maps_result,
      amazon_products,
      google_scholar_articles,
      google_finance_data,
      google_travel_destinations,
      instagram_profile_data,
      shopping_results,
      flights_results,
      jobs_results,
      news_results,
      events_results,
      trends_results,
      youtube_search_results,
      weather_data,
      recipes_results,
      currency_data,
      tool_results: toolResults,
      video_notes: videoAttachments && videoAttachments.length > 0
        ? videoAttachments.map(v => ({ 
            name: v.name, 
            ext: v.ext, 
            hasTranscript: (v.transcript || '').length > 0 
          }))
        : null,
      youtube_video: youtubeVideoContext ? {
        context_injected: true,
        is_video_processed: isVideoProcessed || false,
      } : null
    });
  } catch (error) {
    console.error("Sistem Hatası:", error);
    return res.status(500).json({ error: "Sistem Hatası", details: error.message });
  } finally {
    // CONCURRENCY LOCK: Always release the lock when done (success or error)
    if (resolveLock) {
      resolveLock();
    }
  }
}
