/**
 * Developer Tool Gerçek Entegrasyonları
 * GitHub / Supabase / Vercel / Lovable / Replit için gerçek API çağrıları.
 * Key'ler sunucu ortam değişkenlerinden (Vercel env) okunur — ortak paylaşımlı.
 */

export const PLUGIN_KEY_ENVS = {
  web_search: ['TAVILY_API_KEY'],
  google_sheets: ['GOOGLE_CLIENT_ID'],
  google_slides: ['GOOGLE_CLIENT_ID'],
  github: ['GITHUB_TOKEN'],
  supabase: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
  vercel: ['VERCEL_TOKEN'],
  lovable: ['LOVABLE_API_KEY'],
  replit: ['REPLIT_API_KEY'],
};

export function getPluginKeyStatus(pluginId) {
  const envs = PLUGIN_KEY_ENVS[pluginId] || [];
  if (!envs.length) return { required: false, configured: true, missing: [] };
  const missing = envs.filter(e => !process.env[e]);
  return { required: true, configured: missing.length === 0, missing };
}

// ─── GITHUB ────────────────────────────────────────────────────────────

async function ghFetch(path, opts = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN sunucu tarafında tanımlı değil. Vercel env değişkeni olarak ekleyin.');
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'han-ai',
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API hata (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json();
}

export async function runGithubAction(action, args) {
  const { repo, query, path, title, body } = args || {};
  switch (action) {
    case 'search_repo': {
      if (!query) throw new Error('search_repo için query gerekli.');
      const data = await ghFetch(`/search/repositories?q=${encodeURIComponent(query)}&per_page=5`);
      return {
        status: 'success',
        action,
        total: data.total_count || 0,
        repositories: (data.items || []).map(r => ({
          name: r.full_name,
          description: r.description,
          stars: r.stargazers_count,
          language: r.language,
          url: r.html_url,
        })),
      };
    }
    case 'read_file': {
      if (!repo || !path) throw new Error('read_file için repo (owner/repo) ve path gerekli.');
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.raw+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'han-ai',
        },
      });
      if (!res.ok) throw new Error(`GitHub hata (${res.status}): dosya bulunamadı veya erişim yok.`);
      const content = await res.text();
      return { status: 'success', action, repo, path, size: content.length, content: content.slice(0, 20000) };
    }
    case 'list_issues': {
      if (!repo) throw new Error('repo (owner/repo) gerekli.');
      const data = await ghFetch(`/repos/${repo}/issues?state=open&per_page=10`);
      return {
        status: 'success',
        action,
        repo,
        issues: (data || []).map(i => ({ number: i.number, title: i.title, state: i.state, comments: i.comments, url: i.html_url })),
      };
    }
    case 'create_issue': {
      if (!repo || !title) throw new Error('create_issue için repo ve title gerekli.');
      const data = await ghFetch(`/repos/${repo}/issues`, { method: 'POST', body: JSON.stringify({ title, body }) });
      return { status: 'success', action, repo, issue_number: data.number, url: data.html_url };
    }
    case 'list_prs': {
      if (!repo) throw new Error('repo (owner/repo) gerekli.');
      const data = await ghFetch(`/repos/${repo}/pulls?state=open&per_page=10`);
      return {
        status: 'success',
        action,
        repo,
        pulls: (data || []).map(p => ({ number: p.number, title: p.title, state: p.state, author: p.user?.login, url: p.html_url })),
      };
    }
    case 'get_commits': {
      if (!repo) throw new Error('repo (owner/repo) gerekli.');
      const data = await ghFetch(`/repos/${repo}/commits?per_page=10`);
      return {
        status: 'success',
        action,
        repo,
        commits: (data || []).map(c => ({
          sha: c.sha?.slice(0, 7),
          message: c.commit?.message?.split('\n')[0],
          author: c.commit?.author?.name,
          date: c.commit?.author?.date,
        })),
      };
    }
    default:
      throw new Error(`Bilinmeyen GitHub action: ${action}`);
  }
}

// ─── SUPABASE (PostgREST) ──────────────────────────────────────────────

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY sunucuda tanımlı değil.');
  return { url: url.replace(/\/$/, ''), key };
}

async function supabaseOpenApiSpec() {
  const { url, key } = supabaseConfig();
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' },
  });
  if (!res.ok) throw new Error(`Supabase OpenAPI hatası (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function tableColumnsFromSpec(spec) {
  const tables = [];
  const seen = new Set();
  for (const p of Object.keys(spec?.paths || {})) {
    const name = p.replace(/^\//, '').split('/')[0];
    if (!name || name.includes('{') || seen.has(name)) continue;
    seen.add(name);
    const getOp = spec.paths[p]?.get;
    const props = getOp?.responses?.['200']?.content?.['application/json']?.schema?.items?.properties || {};
    const columns = Object.keys(props).map(c => ({
      name: c,
      type: props[c]?.format || props[c]?.type || props[c]?.enum ? 'enum' : 'unknown',
    }));
    tables.push({ table: name, columns, columnCount: columns.length });
  }
  return tables;
}

export async function runSupabaseAction(action, args) {
  const { url, key } = supabaseConfig();
  const base = `${url}/rest/v1`;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  switch (action) {
    case 'list_tables': {
      const spec = await supabaseOpenApiSpec();
      const tables = tableColumnsFromSpec(spec).map(t => t.table);
      return { status: 'success', action, tables, count: tables.length };
    }
    case 'explain_schema': {
      const spec = await supabaseOpenApiSpec();
      const tables = tableColumnsFromSpec(spec);
      return { status: 'success', action, tables, tableCount: tables.length };
    }
    case 'query': {
      const table = args?.table;
      if (!table) throw new Error('query için table gerekli.');
      const limit = args.limit || 10;
      const select = args.columns || '*';
      let urlPath = `${base}/${encodeURIComponent(table)}?select=${encodeURIComponent(select)}&limit=${limit}`;
      if (args.filter) urlPath += `&${String(args.filter).replace(/^\?/, '')}`;
      const res = await fetch(urlPath, { headers });
      if (!res.ok) throw new Error(`Supabase sorgu hatası (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const rows = await res.json();
      return { status: 'success', action, table, rowCount: rows.length, rows: rows.slice(0, 20) };
    }
    case 'generate_rls': {
      const t = args?.table || 'your_table';
      const sql = [
        `-- RLS politikaları — Supabase Dashboard > SQL Editor ile çalıştırın`,
        `ALTER TABLE "public"."${t}" ENABLE ROW LEVEL SECURITY;`,
        ``,
        `CREATE POLICY "Enable read access for authenticated users" ON "public"."${t}"`,
        `FOR SELECT TO authenticated USING (true);`,
        ``,
        `CREATE POLICY "Enable insert for authenticated users" ON "public"."${t}"`,
        `FOR INSERT TO authenticated WITH CHECK (true);`,
        ``,
        `CREATE POLICY "Enable update for owners" ON "public"."${t}"`,
        `FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`,
      ].join('\n');
      return { status: 'success', action, table: args?.table || null, note: 'RLS SQL üretildi (çalıştırılmadı).', sql };
    }
    default:
      throw new Error(`Bilinmeyen Supabase action: ${action}`);
  }
}

// ─── VERCEL ────────────────────────────────────────────────────────────

async function vercelFetch(path, opts = {}) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error('VERCEL_TOKEN sunucuda tanımlı değil.');
  const res = await fetch(`https://api.vercel.com${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`Vercel API hata (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export async function runVercelAction(action, args) {
  const { project_id, deployment_id } = args || {};
  switch (action) {
    case 'list_projects': {
      const data = await vercelFetch('/v6/projects?limit=20');
      return {
        status: 'success',
        action,
        projects: (data.projects || []).map(p => ({
          id: p.id,
          name: p.name,
          environment: p.environment,
          updatedAt: p.updatedAt,
          github: p.link?.github?.repo ? p.link.github.repo : null,
        })),
      };
    }
    case 'list_deployments': {
      let path = '/v6/deployments?limit=10';
      if (project_id) path += `&projectId=${encodeURIComponent(project_id)}`;
      const data = await vercelFetch(path);
      return {
        status: 'success',
        action,
        deployments: (data.deployments || []).map(d => ({
          id: d.uid || d.id,
          name: d.name,
          url: d.url,
          status: d.readyState || d.state,
          target: d.target,
          created: d.created,
        })),
      };
    }
    case 'check_status': {
      if (!deployment_id) throw new Error('check_status için deployment_id gerekli.');
      const data = await vercelFetch(`/v13/deployments/${deployment_id}`);
      return {
        status: 'success',
        action,
        deployment: {
          id: data.uid || data.id,
          url: data.url,
          state: data.readyState || data.status,
          created: data.created,
          buildingAt: data.buildingAt,
          ready: data.ready,
          error: data.error || null,
        },
      };
    }
    case 'get_logs': {
      if (!deployment_id) throw new Error('get_logs için deployment_id gerekli.');
      const builds = await vercelFetch(`/v3/deployments/${deployment_id}/builds`);
      return {
        status: 'success',
        action,
        builds: (builds.builds || []).map(b => ({
          id: b.id,
          status: b.status,
          startedAt: b.startedAt,
          completedAt: b.completedAt,
          logUrl: b.logUrl || null,
        })),
        note: 'Build durumları listelendi. Tam log akışı için Vercel dashboard kullanılır.',
      };
    }
    default:
      throw new Error(`Bilinmeyen Vercel action: ${action}`);
  }
}

// ─── LOVABLE (api.lovable.dev/v1) ──────────────────────────────────────

async function lovableFetch(path, opts = {}) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error('LOVABLE_API_KEY sunucuda tanımlı değil. (Lovable API key: lov_... — preview)');
  const res = await fetch(`https://api.lovable.dev/v1${path}`, {
    ...opts,
    headers: { 'Lovable-API-Key': key, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`Lovable API hata (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function firstWorkspaceId() {
  const data = await lovableFetch('/workspaces');
  const list = Array.isArray(data) ? data : data?.workspaces || [];
  const id = list[0]?.id;
  if (!id) throw new Error('Lovable hesabında workspace bulunamadı.');
  return id;
}

export async function runLovableAction(action, args) {
  switch (action) {
    case 'list_projects': {
      const wsId = await firstWorkspaceId();
      const data = await lovableFetch(`/workspaces/${wsId}/projects`);
      const list = Array.isArray(data) ? data : data?.projects || [];
      return {
        status: 'success',
        action,
        workspaceId: wsId,
        projects: list.map(p => ({
          id: p.id,
          name: p.name || p.title,
          status: p.status,
          previewUrl: p.previewUrl,
          updatedAt: p.updatedAt,
        })),
      };
    }
    case 'get_project': {
      if (!args?.project_id) throw new Error('get_project için project_id gerekli.');
      const data = await lovableFetch(`/projects/${args.project_id}`);
      return { status: 'success', action, project: data };
    }
    case 'create_component': {
      if (!args?.prompt) throw new Error('create_component için prompt gerekli.');
      if (args.project_id) {
        const data = await lovableFetch(`/projects/${args.project_id}/messages`, {
          method: 'POST',
          body: JSON.stringify({ message: args.prompt }),
        });
        return {
          status: 'success',
          action,
          message: 'İstek Lovable projesine gönderildi (AI arka planda işliyor).',
          project_id: args.project_id,
          submitted: data,
        };
      }
      const wsId = await firstWorkspaceId();
      const data = await lovableFetch(`/workspaces/${wsId}/projects`, {
        method: 'POST',
        body: JSON.stringify({ description: args.prompt, visibility: 'private' }),
      });
      return { status: 'success', action, message: 'Yeni Lovable projesi oluşturuldu.', project: data };
    }
    default:
      throw new Error(`Bilinmeyen Lovable action: ${action}`);
  }
}

// ─── REPLIT (replit.com/api/v1) ────────────────────────────────────────

async function replitFetch(path, opts = {}) {
  const token = process.env.REPLIT_API_KEY;
  if (!token) throw new Error('REPLIT_API_KEY sunucuda tanımlı değil.');
  const res = await fetch(`https://replit.com/api/v1${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`Replit API hata (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

function normalizeLanguage(lang) {
  const map = { python: 'python3', py: 'python3', js: 'nodejs', javascript: 'nodejs', ts: 'typescript' };
  return map[(lang || '').toLowerCase()] || lang || 'python3';
}

export async function runReplitAction(action, args) {
  switch (action) {
    case 'list_repls': {
      const data = await replitFetch('/repls?limit=20');
      return {
        status: 'success',
        action,
        repls: (data.items || []).map(r => ({
          id: r.id,
          title: r.title,
          language: r.language,
          isPrivate: r.isPrivate,
          url: r.url,
        })),
      };
    }
    case 'create_repl': {
      if (!args?.title && !args?.code) throw new Error('create_repl için title veya code gerekli.');
      const body = {
        title: args.title || 'han-ai-repl',
        language: normalizeLanguage(args.language),
        description: args.code ? String(args.code).slice(0, 200) : '',
        isPrivate: true,
      };
      const data = await replitFetch('/repls', { method: 'POST', body: JSON.stringify(body) });
      return { status: 'success', action, repl: { id: data.id, title: data.title, language: data.language, url: data.url } };
    }
    case 'run_code': {
      if (!args?.code) throw new Error('run_code için code gerekli.');
      const body = {
        title: args.title || 'han-ai-run',
        language: normalizeLanguage(args.language),
        description: String(args.code).slice(0, 200),
        isPrivate: true,
      };
      const data = await replitFetch('/repls', { method: 'POST', body: JSON.stringify(body) });
      return {
        status: 'success',
        action,
        message: 'Kod içeren Repl oluşturuldu — Replit üzerinden açıp çalıştırabilirsin.',
        repl: { id: data.id, title: data.title, url: data.url },
      };
    }
    default:
      throw new Error(`Bilinmeyen Replit action: ${action}`);
  }
}
