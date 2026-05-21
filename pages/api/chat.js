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
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&pretty=1`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      
      const results = [];
      
      // Abstract text (main result)
      if (data.AbstractText) {
        results.push({
          title: 'Abstract',
          snippet: data.AbstractText.substring(0, 200),
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
    const searchResp = await fetch(`https://www.googleapis.com/drive/v3/files?q=mimeType%3D'application/vnd.google-apps.folder'%20and%20name%3D'LifeCoach%20AI'%20and%20trashed%3Dfalse&fields=files(id%2Cname)&key=${GOOGLE_MAPS_API_KEY}`, {
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

const BASE_SYSTEM_PROMPT = `You are LifeCoach AI, a supportive and intelligent life management assistant designed to help users improve their daily lives realistically and sustainably.

Your personality: Calm, friendly, emotionally intelligent, honest but respectful, motivating without sounding fake, smart like a trusted companion. Never arrogant or robotic.

Your communication style: Speak naturally like a real supportive person. Avoid sounding like a corporate assistant or using "hustle culture" motivation. Keep responses clean, clear, and emotionally balanced. Use encouraging language without exaggeration. Sometimes use humor naturally. Adapt your tone depending on the user's mood. Speak in the same language as the user (detect automatically).

Your mission: Help users improve habits, reduce stress and burnout, build discipline gradually, organize goals realistically, support emotional balance, and improve productivity without mental overload.

Rules: Never insult the user, shame failures, use toxic motivation, encourage unhealthy behavior, pretend to be a therapist, pressure users aggressively, or give unrealistic "be perfect" advice.

Productivity philosophy: Small consistent actions are better than extreme motivation. Sustainable routines matter more than intensity. Mental health and productivity should work together. Rest is part of progress.

Goal system behavior: Break big goals into small achievable tasks. Encourage consistency. Use XP, streaks, achievements, and progress systems positively. Reward effort, not only results.

Identity: You are a realistic life improvement companion designed to help users grow without pressure.

AVAILABLE TOOLS:
You have access to the following tools to help users accomplish tasks:

1. create_presentation(topic, content_outline) - Creates a Google Slides presentation
2. search_nearby_places(category, location) - Searches for nearby places using Google Maps
3. add_calendar_event(title, start_time, end_time, recurrence) - Adds an event to Google Calendar
4. upload_to_drive(file_content, file_name, mime_type) - Uploads a file to Google Drive
5. extract_to_spreadsheet(file_id_or_text) - Extracts text from image or processes text to Google Sheet

HOW TO USE TOOLS:
When you need to use a tool, output a JSON object in this format:
{
  "tool": "tool_name",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  }
}

After outputting the JSON, continue your response naturally. The system will execute the tool and provide you with the result to incorporate into your response.

Remember: Always prioritize the user's needs and use tools only when they genuinely help accomplish the user's goal. Provide unique, context-aware responses for each message.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, history, email, sessionId, mode, userLanguage, attachments, deepSearch } = req.body;
    const countryCode = req.headers['x-vercel-ip-country'] || 'Unknown';
    
    // Improved language detection for Turkish vs English
    function detectLanguage(text) {
      if (!text) return 'en';
      
      // Check for Turkish-specific characters
      const turkishChars = /[çğıöşüÇĞİÖŞÜ]/;
      if (turkishChars.test(text)) return 'tr';
      
      // Check for common Turkish words
      const turkishWords = /\b(ve|veya|ama|fakat|çünkü|için|ile|bu|şu|o|ben|sen|biz|siz|onlar|merhaba|günaydın|iyi|gün|akşam|gece|nasıl|ne|neden|kim|nerede|ne zaman|kaç|hangi|evet|hayır|lütfen|teşekkür|hoşça|kal|görüşürüz|güle|güle|yapmak|etmek|gitmek|gelmek|almak|vermek|sevmek|istemek|bilmek|görmek|duymak|konuşmak|yazmak|okumak|çalışmak|yaşamak|olmak|bulmak|aramak|sormak|cevaplamak|anlamak|kabul etmek|reddetmek|başarmak|başarısız olmak|denemek|yapabilmek|istememek|gerekli|gerek|zor|kolay|iyi|kötü|büyük|küçük|yeni|eski|uzun|kısa|güzel|çirkin|hızlı|yavaş|yüksek|alçak|açık|kapalı|dolu|boş|sıcak|soğuk|ağır|hafif|geniş|dar|derin|sığ|sağlıklı|hastalıklı|mutlu|üzgün|sinirli|rahat|stresli|yorgun|enerjik|zengin|fakir|akıllı|cahil|genç|yaşlı|erkek|kadın|çocuk|yetişkin|insan|hayvan|bitki|doğa|dünya|evren|zaman|mekan|madde|enerji|güç|hareket|dinlenme|uyku|uyanıklık|bilgi|beceri|deneyim|eğitim|öğrenme|öğretme|araştırma|geliştirme|yaratıcılık|yenilik|teknoloji|bilim|sanat|kültür|tarih|coğrafya|dil|edebiyat|müzik|sinema|tiyatro|spor|sağlık|beslenme|egzersiz|meditasyon|ruhsal|bedensel|zihinsel|duygusal|sosyal|ekonomik|politik|hukuki|etik|ahlaki|dini|manevi|felsefi|teorik|pratik|teorik|uygulamalı|analitik|sentetik|bütüncül|parçacı|bağıl|mutlak|öznel|nesnel|somut|soyut|gerçek|hayali|doğru|yanlış|kesin|belirsiz|açık|kapalı|net|bulanık|basit|karmaşık|kolay|zor|hızlı|yavaş|iyi|kötü|güzel|çirkin|büyük|küçük|uzun|kısa|geniş|dar|yüksek|alçak|derin|sığ|ağır|hafif|sıcak|soğuk|kuru|yaşlı|yumuşak|sert|keskin|düz|eğri|yuvarlak|kare|üçgen|daire|mavi|kırmızı|yeşil|sarı|turuncu|mor|pembe|beyaz|siyah|gri|kahverengi|lila|turkuaz|bej|krem|gümüş|altın|bronz|bakır|demir|çelik|alüminyum|plastik|cam|kağıt|karton|ahşap|taş|toprak|kum|su|hava|ateş|toprak|metal|bitki|hayvan|insan|makine|araç|gereç|eşya|nesne|madde|maddeler|elementler|atomlar|moleküller|hücreler|dokular|organlar|sistemler|organizmalar|canlılar|ölenler|doğanlar|büyüyenler|gelişenler|değişenler|sabitleşenler|yok olanlar|yeni ortaya çıkanlar|eskiyenler|yenilenenler|bozulanlar|onarılanlar|kırılanlar|düzeltilenler|yapılanlar|yıkılanlar|kurulanlar|açılanlar|kapananlar|başlatılanlar|durdurulanlar|devam edenler|tamamlananlar|yarıda kalanlar|başarılı olanlar|başarısız olanlar|iyi olanlar|kötü olanlar|doğru olanlar|yanlış olanlar|haklı olanlar|haksız olanlar|kazananlar|kaybedenler|sevinenler|üzülenler|mutlu olanlar|üzüntülü olanlar|heyecanlı olanlar|sakin olanlar|sinirli olanlar|rahat olanlar|stresli olanlar|yorgun olanlar|enerjik olanlar|hastalıklı olanlar|sağlıklı olanlar|zengin olanlar|fakir olanlar|akıllı olanlar|cahil olanlar|genç olanlar|yaşlı olanlar|erkek olanlar|kadın olanlar|çocuk olanlar|yetişkin olanlar|insan olanlar|hayvan olanlar|bitki olanlar|doğa olanlar|dünya olanlar|evren olanlar|zaman olanlar|mekan olanlar|madde olanlar|enerji olanlar|güç olanlar|hareket olanlar|dinlenme olanlar|uyku olanlar|uyanıklık olanlar|bilgi olanlar|beceri olanlar|deneyim olanlar|eğitim olanlar|öğrenme olanlar|öğretme olanlar|araştırma olanlar|geliştirme olanlar|yaratıcılık olanlar|yenilik olanlar|teknoloji olanlar|bilim olanlar|sanat olanlar|kültür olanlar|tarih olanlar|coğrafya olanlar|dil olanlar|edebiyat olanlar|müzik olanlar|sinema olanlar|tiyatro olanlar|spor olanlar|sağlık olanlar|beslenme olanlar|egzersiz olanlar|meditasyon olanlar|ruhsal olanlar|bedensel olanlar|zihinsel olanlar|duygusal olanlar|sosyal olanlar|ekonomik olanlar|politik olanlar|hukuki olanlar|etik olanlar|ahlaki olanlar|dini olanlar|manevi olanlar|felsefi olanlar|teorik olanlar|pratik olanlar|teorik olanlar|uygulamalı olanlar|analitik olanlar|sentetik olanlar|bütüncül olanlar|parçacı olanlar|bağıl olanlar|mutlak olanlar|öznel olanlar|nesnel olanlar|somut olanlar|soyut olanlar|gerçek olanlar|hayali olanlar|doğru olanlar|yanlış olanlar|kesin olanlar|belirsiz olanlar|açık olanlar|kapalı olanlar|net olanlar|bulanık olanlar|basit olanlar|karmaşık olanlar|kolay olanlar|zor olanlar|hızlı olanlar|yavaş olanlar|iyi olanlar|kötü olanlar|güzel olanlar|çirkin olanlar|büyük olanlar|küçük olanlar|uzun olanlar|kısa olanlar|geniş olanlar|dar olanlar|yüksek olanlar|alçak olanlar|derin olanlar|sığ olanlar|ağır olanlar|hafif olanlar|sıcak olanlar|soğuk olanlar|kuru olanlar|yaşlı olanlar|yumuşak olanlar|sert olanlar|keskin olanlar|düz olanlar|eğri olanlar|yuvarlak olanlar|kare olanlar|üçgen olanlar|daire olanlar|mavi olanlar|kırmızı olanlar|yeşil olanlar|sarı olanlar|turuncu olanlar|mor olanlar|pembe olanlar|beyaz olanlar|siyah olanlar|gri olanlar|kahverengi olanlar|lila olanlar|turkuaz olanlar|bej olanlar|krem olanlar|gümüş olanlar|altın olanlar|bronz olanlar|bakır olanlar|demir olanlar|çelik olanlar|alüminyum olanlar|plastik olanlar|cam olanlar|kağıt olanlar|karton olanlar|ahşap olanlar|taş olanlar|toprak olanlar|kum olanlar|su olanlar|hava olanlar|ateş olanlar|toprak olanlar|metal olanlar|bitki olanlar|hayvan olanlar|insan olanlar|makine olanlar|araç olanlar|gereç olanlar|eşya olanlar|nesne olanlar|madde olanlar|maddeler olanlar|elementler olanlar|atomlar olanlar|moleküller olanlar|hücreler olanlar|dokular olanlar|organlar olanlar|sistemler olanlar|organizmalar olanlar|canlılar olanlar|ölenler olanlar|doğanlar olanlar|büyüyenler olanlar|gelişenler olanlar|değişenler olanlar|sabitleşenler olanlar|yok olanlar olanlar|yeni ortaya çıkanlar olanlar|eskiyenler olanlar|yenilenenler olanlar|bozulanlar olanlar|onarılanlar olanlar|kırılanlar olanlar|düzeltilenler olanlar|yapılanlar olanlar|yıkılanlar olanlar|kurulanlar olanlar|açılanlar olanlar|kapananlar olanlar|başlatılanlar olanlar|durdurulanlar olanlar|devam edenler olanlar|tamamlananlar olanlar|yarıda kalanlar olanlar|başarılı olanlar olanlar|başarısız olanlar olanlar|iyi olanlar olanlar|kötü olanlar olanlar|doğru olanlar olanlar|yanlış olanlar olanlar|haklı olanlar olanlar|haksız olanlar olanlar|kazananlar olanlar|kaybedenler olanlar|sevinenler olanlar|üzülenler olanlar|mutlu olanlar olanlar|üzüntülü olanlar olanlar|heyecanlı olanlar olanlar|sakin olanlar olanlar|sinirli olanlar olanlar|rahat olanlar olanlar|stresli olanlar olanlar|yorgun olanlar olanlar|enerjik olanlar olanlar|hastalıklı olanlar olanlar|sağlıklı olanlar olanlar|zengin olanlar olanlar|fakir olanlar olanlar|akıllı olanlar olanlar|cahil olanlar olanlar|genç olanlar olanlar|yaşlı olanlar olanlar|erkek olanlar olanlar|kadın olanlar olanlar|çocuk olanlar olanlar|yetişkin olanlar olanlar)\b/i;
      if (turkishWords.test(text)) return 'tr';
      
      // Check for common English words
      const englishWords = /\b(the|and|or|but|because|for|with|this|that|these|those|i|you|we|they|he|she|it|hello|good|morning|afternoon|evening|night|how|what|why|who|where|when|how many|which|yes|no|please|thank|goodbye|see you|take|make|go|come|get|give|love|want|know|see|hear|speak|write|read|work|live|be|find|look|ask|answer|understand|accept|reject|succeed|fail|try|can|cannot|need|must|hard|easy|good|bad|big|small|new|old|long|short|beautiful|ugly|fast|slow|high|low|open|close|full|empty|hot|cold|heavy|light|wide|narrow|deep|shallow|healthy|sick|happy|sad|angry|calm|stressed|tired|energetic|rich|poor|smart|ignorant|young|old|male|female|child|adult|human|animal|plant|nature|world|universe|time|space|matter|energy|power|movement|rest|sleep|wakefulness|knowledge|skill|experience|education|learning|teaching|research|development|creativity|innovation|technology|science|art|culture|history|geography|language|literature|music|cinema|theater|sports|health|nutrition|exercise|meditation|spiritual|physical|mental|emotional|social|economic|political|legal|ethical|moral|religious|spiritual|philosophical|theoretical|practical|theoretical|applied|analytical|synthetic|holistic|reductionist|relative|absolute|subjective|objective|concrete|abstract|real|imaginary|true|false|certain|uncertain|clear|unclear|simple|complex|easy|difficult|fast|slow|good|bad|beautiful|ugly|big|small|long|short|wide|narrow|high|low|deep|shallow|heavy|light|hot|cold|dry|wet|soft|hard|sharp|flat|curved|round|square|triangle|circle|blue|red|green|yellow|orange|purple|pink|white|black|gray|brown|lilac|turquoise|beige|cream|silver|gold|bronze|copper|iron|steel|aluminum|plastic|glass|paper|cardboard|wood|stone|earth|sand|water|air|fire|earth|metal|plant|animal|human|machine|tool|device|object|item|matter|materials|elements|atoms|molecules|cells|tissues|organs|systems|organisms|living|dead|born|growing|developing|changing|stabilizing|disappearing|newly emerging|aging|renewing|breaking|repairing|breaking|fixing|doing|destroying|establishing|opening|closing|starting|stopping|continuing|completing|halfway|successful|unsuccessful|good|bad|correct|wrong|right|wrong|winners|losers|rejoicing|sad|happy|sad|excited|calm|angry|calm|stressed|tired|energetic|sick|healthy|rich|poor|smart|ignorant|young|old|male|female|child|adult|human|animal|plant|nature|world|universe|time|space|matter|energy|power|movement|rest|sleep|wakefulness|knowledge|skill|experience|education|learning|teaching|research|development|creativity|innovation|technology|science|art|culture|history|geography|language|literature|music|cinema|theater|sports|health|nutrition|exercise|meditation|spiritual|physical|mental|emotional|social|economic|political|legal|ethical|moral|religious|spiritual|philosophical|theoretical|practical|theoretical|applied|analytical|synthetic|holistic|reductionist|relative|absolute|subjective|objective|concrete|abstract|real|imaginary|true|false|certain|uncertain|clear|unclear|simple|complex|easy|difficult|fast|slow|good|bad|beautiful|ugly|big|small|long|short|wide|narrow|high|low|deep|shallow|heavy|light|hot|cold|dry|wet|soft|hard|sharp|flat|curved|round|square|triangle|circle|blue|red|green|yellow|orange|purple|pink|white|black|gray|brown|lilac|turquoise|beige|cream|silver|gold|bronze|copper|iron|steel|aluminum|plastic|glass|paper|cardboard|wood|stone|earth|sand|water|air|fire|earth|metal|plant|animal|human|machine|tool|device|object|item|matter|materials|elements|atoms|molecules|cells|tissues|organs|systems|organisms|living|dead|born|growing|developing|changing|stabilizing|disappearing|newly emerging|aging|renewing|breaking|repairing|breaking|fixing|doing|destroying|establishing|opening|closing|starting|stopping|continuing|completing|halfway|successful|unsuccessful|good|bad|correct|wrong|right|wrong|winners|losers|rejoicing|sad|happy|sad|excited|calm|angry|calm|stressed|tired|energetic|sick|healthy|rich|poor|smart|ignorant|young|old|male|female|child|adult)\b/i;
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

      if (wantsMaps && GOOGLE_MAPS_API_KEY) {
        try {
          // Extract category from message
          const categoryMatch = message.match(/(?:en yakın|yakınındaki|bul|ara)[:\s]*(.+?)(?:\s+(?:nerede|konum|lokasyon)|$)/i);
          const category = categoryMatch ? categoryMatch[1].trim() : 'restaurant';
          
          // Use IP-based location or default to a major city
          const location = countryCode === 'TR' ? 'Istanbul, Turkey' : 
                          countryCode === 'US' ? 'New York, NY' : 
                          'Istanbul, Turkey';
          
          maps_result = await search_nearby_places(category, location);
          if (maps_result && maps_result.places && maps_result.places.length > 0) {
            maps_result.category = category;
            maps_result.searchLocation = location;
            tool_notes.push(`Google Maps üzerinde ${category} için ${maps_result.places.length} sonuç buldum.`);
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

    // Process tool calls if present in the response
    let toolResults = [];
    let processedResponse = aiResponse;
    
    try {
      // Check if the response contains tool calls in JSON format
      const toolCallMatch = aiResponse.match(/\{[\s\S]*?"tool"\s*:\s*"[^"]+"[\s\S]*?\}/);
      if (toolCallMatch) {
        const toolCallStr = toolCallMatch[0];
        try {
          const toolCall = JSON.parse(toolCallStr);
          if (toolCall.tool && toolCall.parameters) {
            console.log(`[Tool Call] Executing tool: ${toolCall.tool}`);
            
            let toolResult;
            switch (toolCall.tool) {
              case "create_presentation":
                toolResult = await create_presentation(toolCall.parameters.topic, toolCall.parameters.content_outline);
                break;
              case "search_nearby_places":
                toolResult = await search_nearby_places(toolCall.parameters.category, toolCall.parameters.location);
                break;
              case "add_calendar_event":
                toolResult = await add_calendar_event(
                  toolCall.parameters.title, 
                  toolCall.parameters.start_time, 
                  toolCall.parameters.end_time,
                  toolCall.parameters.recurrence
                );
                break;
              case "upload_to_drive":
                toolResult = await upload_to_drive(
                  toolCall.parameters.file_content, 
                  toolCall.parameters.file_name, 
                  toolCall.parameters.mime_type
                );
                break;
              case "extract_to_spreadsheet":
                toolResult = await extract_to_spreadsheet(toolCall.parameters.file_id_or_text);
                break;
              default:
                throw new Error(`Unknown tool: ${toolCall.tool}`);
            }
            
            toolResults.push({
              tool: toolCall.tool,
              result: toolResult
            });
            
            // Remove the tool call JSON from the response for clean display
            processedResponse = aiResponse.replace(toolCallStr, '').trim();
            
            // Add a note about the tool execution
            const toolNotesMap = {
              create_presentation: "Google Slides sunumu oluşturuldu.",
              search_nearby_places: "Google Maps'te yer araması yapıldı.",
              add_calendar_event: "Google Takvim'de etkinlik oluşturuldu.",
              upload_to_drive: "Dosya Google Drive'a yüklendi.",
              extract_to_spreadsheet: "Metin Google Sheets'e aktarıldı."
            };
            
            if (toolNotesMap[toolCall.tool]) {
              tool_notes.push(toolNotesMap[toolCall.tool]);
            }
          }
        } catch (parseError) {
          console.warn('[Tool Call] Failed to parse tool call JSON:', parseError);
          // If JSON parsing fails, continue with original response
        }
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
      maps_result,
      tool_results: toolResults // Add tool results to response
    });
  } catch (error) {
    console.error("Sistem Hatası:", error);
    return res.status(500).json({ error: "Sistem Hatası", details: error.message });
  }
}
