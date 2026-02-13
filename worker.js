/**
 * Cloudflare Worker - LifeCoach AI Backend
 *
 * Bu dosya, uygulamanın tüm backend mantığını içerir.
 * - API Yönlendirme
 * - Rate Limiting (KV ile)
 * - Kullanıcı Yönetimi (KV ile)
 * - OpenRouter AI Çağrıları
 */

// --- Helper: Standart JSON Yanıtı ---
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, // CORS için
  });
}

// --- Helper: OpenRouter AI Çağrısı ---
async function callOpenRouter(messages, env) {
  const OPENROUTER_MODELS = [
    "arcee-ai/trinity-large-preview:free",
    "deepseek/deepseek-r1-0528:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "google/gemma-3-27b-it:free",
    "openrouter/free"
  ];

  for (const model of OPENROUTER_MODELS) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://lifecoach-ai.pages.dev", // Proje URL'nizi buraya yazın
          "X-Title": "LifeCoach AI"
        },
        body: JSON.stringify({ model, messages })
      });
      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (e) {
      console.warn(`Model ${model} error:`, e);
    }
  }
  throw new Error("All AI models failed.");
}

// --- Güvenlik: Rate Limit Kontrolü (KV ile) ---
async function checkRateLimit(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || '127.0.0.1';
  const ua = request.headers.get('user-agent') || 'unknown';
  const body = await request.clone().json(); // Body'yi klonlayarak okuyoruz
  const fingerprint = body.fingerprintID || 'none';

  // Edge uyumlu Web Crypto API ile kimlik oluşturma
  const msgBuffer = new TextEncoder().encode(`${ip}-${ua}-${fingerprint}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const identity = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const limitsJSON = await env.LIMITS_KV.get('user_limits');
  const limits = limitsJSON ? JSON.parse(limitsJSON) : {};
  const now = Date.now();

  if (!limits[identity]) {
    limits[identity] = { messageCount: 0, lastReset: now, isBlocked: false, lastActivity: now };
  }

  const user = limits[identity];
  user.lastActivity = now;

  // Not: Periyodik temizlik (setInterval) serverless ortamda bu şekilde çalışmaz.
  // Bu işlev için Cloudflare Cron Triggers kullanılmalıdır.

  if (user.isBlocked) {
    return { allowed: false, error: "Hesabınız engellendi.", retryAfter: "Süresiz" };
  }

  if (now - user.lastReset > 2 * 60 * 60 * 1000) { // 2 saat
    user.messageCount = 0;
    user.lastReset = now;
  }

  const MAX_MESSAGES = 10;
  if (user.messageCount >= MAX_MESSAGES) {
    const timeLeft = (2 * 60 * 60 * 1000) - (now - user.lastReset);
    const minutesLeft = Math.ceil(timeLeft / 60000);
    return { allowed: false, error: `Üzgünüm, işlem limitine ulaştın. Lütfen ${minutesLeft} dakika sonra tekrar gel.`, retryAfter: minutesLeft };
  }

  user.messageCount++;
  await env.LIMITS_KV.put('user_limits', JSON.stringify(limits));

  return { allowed: true };
}

// --- API Rota İşleyicileri (Handlers) ---

async function handleChat(request, env) {
  const limitStatus = await checkRateLimit(request, env);
  if (!limitStatus.allowed) {
    return jsonResponse({ error: limitStatus.error, retryAfter: limitStatus.retryAfter }, 429);
  }

  const { message, history, email, sessionId } = await request.json();
  
  // server.js'deki sistem prompt'u buraya taşındı
  const systemPrompt = `SYSTEM NAME: LifeCoach AI... (Tüm sistem prompt metni buraya gelecek)`;

  try {
    const aiResponse = await callOpenRouter(
      [{ "role": "system", "content": systemPrompt }, ...history, { "role": "user", "content": message }],
      env
    );

    // Veritabanı güncelleme mantığı (KV ile)
    let newSessionId = sessionId;
    if (email) {
      const usersJSON = await env.LIFE_COACH_KV.get('users');
      const users = usersJSON ? JSON.parse(usersJSON) : [];
      const userIndex = users.findIndex(u => u.email === email);

      if (userIndex !== -1) {
        // ... (server.js'deki seans kaydetme mantığı buraya uyarlanacak)
        // Örnek:
        if (!users[userIndex].sessions) users[userIndex].sessions = [];
        let session = newSessionId ? users[userIndex].sessions.find(s => s.id == newSessionId) : null;
        if (!session) {
            newSessionId = Date.now();
            session = { id: newSessionId, title: message.substring(0, 30) + "...", messages: [] };
            users[userIndex].sessions.unshift(session);
        }
        session.messages.push({ role: 'user', content: message });
        session.messages.push({ role: 'assistant', content: aiResponse });
        await env.LIFE_COACH_KV.put('users', JSON.stringify(users));
      }
    }

    return jsonResponse({ response: aiResponse, sessionId: newSessionId });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function handleLogin(request, env) {
  const { email, password } = await request.json();
  if (!email || !password) return jsonResponse({ error: "Invalid email or password." }, 400);

  const usersJSON = await env.LIFE_COACH_KV.get('users');
  const users = usersJSON ? JSON.parse(usersJSON) : [];
  const user = users.find(u => u.email === email && u.password === password);

  if (user) return jsonResponse({ success: true, user: { name: user.name, email: user.email } });
  return jsonResponse({ error: "Invalid email or password." }, 401);
}

async function handleRegister(request, env) {
  const { name, email, password } = await request.json();
  if (!name || !email || !password) return jsonResponse({ error: "Please fill in all fields." }, 400);

  const usersJSON = await env.LIFE_COACH_KV.get('users');
  const users = usersJSON ? JSON.parse(usersJSON) : [];

  if (users.find(u => u.email === email)) {
    return jsonResponse({ error: "This email address is already in use." }, 400);
  }

  const newUser = { id: Date.now(), name, email, password }; // Şifreler her zaman hashlenmelidir!
  users.push(newUser);
  await env.LIFE_COACH_KV.put('users', JSON.stringify(users));

  return jsonResponse({ success: true, user: { name, email } });
}

async function handleHistory(request, env) {
    const { email } = await request.json();
    if (!email) return jsonResponse({ error: "Email is required." }, 400);

    const usersJSON = await env.LIFE_COACH_KV.get('users');
    const users = usersJSON ? JSON.parse(usersJSON) : [];
    const user = users.find(u => u.email === email);

    if (user && user.sessions) {
        const history = user.sessions.map(s => ({ id: s.id, title: s.title }));
        return jsonResponse(history);
    }
    return jsonResponse([]);
}

async function handleGetSession(request, env) {
    const { email, sessionId } = await request.json();
    const usersJSON = await env.LIFE_COACH_KV.get('users');
    const users = usersJSON ? JSON.parse(usersJSON) : [];
    const user = users.find(u => u.email === email);

    if (user && user.sessions) {
        const session = user.sessions.find(s => s.id == sessionId);
        if (session) return jsonResponse(session);
    }
    return jsonResponse({ error: "Session not found." }, 404);
}

// ... Diğer API rotaları (reset-password, update-profile vb.) benzer şekilde buraya eklenebilir.


// --- Ana Worker Fonksiyonu ---
export default {
  async fetch(request, env, ctx) {
    // CORS preflight isteklerini işle
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);

    // Basit yönlendirici (Router)
    switch (url.pathname) {
      case '/api/chat':
        return handleChat(request, env);

      case '/api/login':
        return handleLogin(request, env);

      case '/api/register':
        return handleRegister(request, env);

      case '/api/history':
        return handleHistory(request, env);
        
      case '/api/get-session':
        return handleGetSession(request, env);

      // Buraya diğer rotaları ekleyin
      // case '/api/reset-password':
      //   return handleResetPassword(request, env);

      default:
        return new Response('Not Found', { status: 404 });
    }
  },
};