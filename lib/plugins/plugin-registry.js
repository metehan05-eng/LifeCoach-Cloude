/**
 * HAN Plugin Registry
 * Tüm mevcut plugin'lerin tanımları — AI Function Calling formatında
 */

export const PLUGIN_CATEGORIES = {
  core: { label: 'Temel Araçlar', icon: '🌐', color: '#6366f1' },
  analytics: { label: 'Data Analytics', icon: '📊', color: '#f59e0b' },
  google: { label: 'Google Suite', icon: '🔧', color: '#3b82f6' },
  developer: { label: 'Developer Tools', icon: '👨‍💻', color: '#8b5cf6' },
};

export const PLUGINS = [
  // ─── CORE ───────────────────────────────────────────────────────────────────
  {
    id: 'web_search',
    name: 'Web Arama',
    icon: '🌐',
    category: 'core',
    description: 'İnternette gerçek zamanlı arama yap. Güncel haberler, bilgi veya araştırma için.',
    systemPrompt: `Sen bir web arama asistanısın. Kullanıcının sorusunu anla ve web_search tool'unu çağırarak internette güncel bilgi ara. Araştırma sonuçlarını madde madde, kaynaklarıyla birlikte Türkçe sun. Bilgileri doğrula ve tarih belirt.`,
    apiRequired: 'TAVILY_API_KEY',
    apiLabel: 'Tavily API Key',
    apiUrl: 'https://app.tavily.com',
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Güncel bilgi, haber veya herhangi bir konu için internette arama yap. Bilgin yeterli değilse veya güncel veri gerekiyorsa kullan.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Aranacak terim veya soru' },
            max_results: { type: 'number', description: 'Maksimum sonuç sayısı (varsayılan: 5)' },
          },
          required: ['query'],
        },
      },
    },
  },
  {
    id: 'web_scraper',
    name: 'Web Scraper',
    icon: '🕷️',
    category: 'core',
    description: 'Herhangi bir web sayfasının içeriğini oku ve analiz et.',
    systemPrompt: `Sen bir web scraping asistanısın. Kullanıcının verdiği URL'yi scrape_url tool'u ile oku ve sayfa içeriğini özetle. Önemli başlıkları, ana fikri ve sayfadaki yapısal öğeleri (listeler, tablolar) çıkar.`,
    apiRequired: null,
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'scrape_url',
        description: 'Verilen URL\'nin içeriğini oku. Makale, belge veya web sayfası okumak için kullan.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Okunacak web sayfasının URL\'si' },
          },
          required: ['url'],
        },
      },
    },
  },

  // ─── DATA ANALYTICS ─────────────────────────────────────────────────────────
  {
    id: 'data_analysis',
    name: 'Veri Analizi',
    icon: '📈',
    category: 'analytics',
    description: 'CSV/Excel verisi yükle, istatistik çıkar, trend analizi yap.',
    systemPrompt: `Sen bir veri analisti asistanısın. Kullanıcının yüklediği CSV/Excel verisini analyze_data tool'u ile analiz et. Ortalama, medyan, trend, korelasyon ve anomali tespiti yap. Sonuçları görsel ve anlaşılır şekilde sun.`,
    apiRequired: null,
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'analyze_data',
        description: 'Kullanıcının yüklediği CSV veya Excel verisini analiz et. Ortalama, medyan, trend, korelasyon gibi istatistikler çıkar.',
        parameters: {
          type: 'object',
          properties: {
            file_id: { type: 'string', description: 'Yüklenen dosya ID\'si' },
            operation: {
              type: 'string',
              enum: ['summary', 'trends', 'correlation', 'outliers', 'forecast'],
              description: 'Yapılacak analiz türü',
            },
            columns: { type: 'array', items: { type: 'string' }, description: 'Analiz edilecek sütunlar' },
          },
          required: ['file_id', 'operation'],
        },
      },
    },
  },
  {
    id: 'chart_generator',
    name: 'Grafik Oluşturucu',
    icon: '📉',
    category: 'analytics',
    description: 'Verilen verileri görsel grafiklere çevir (bar, line, pie, scatter).',
    systemPrompt: `Sen bir grafik oluşturma asistanısın. Kullanıcının verdiği verileri generate_chart tool'u ile görselleştir. En uygun grafik türünü seç (bar, line, pie, scatter) ve veriyi anlamlı bir şekilde sun.`,
    apiRequired: null,
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'generate_chart',
        description: 'Verilen veri setinden grafik oluştur ve göster.',
        parameters: {
          type: 'object',
          properties: {
            chart_type: {
              type: 'string',
              enum: ['bar', 'line', 'pie', 'scatter', 'area', 'heatmap'],
              description: 'Grafik türü',
            },
            data: {
              type: 'object',
              description: 'Grafik verisi: { labels: [...], datasets: [{label, data}] }',
            },
            title: { type: 'string', description: 'Grafik başlığı' },
          },
          required: ['chart_type', 'data'],
        },
      },
    },
  },

  // ─── GOOGLE SUITE ────────────────────────────────────────────────────────────
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    icon: '📊',
    category: 'google',
    description: 'Spreadsheet oku, yaz, formül hesapla ve veri analizi yap.',
    systemPrompt: `Sen bir Google Sheets asistanısın. Kullanıcının sheet'lerini google_sheets tool'u ile oku, yaz veya append yap. Verileri düzenle, formül hesapla ve sonuçları göster.`,
    apiRequired: 'GOOGLE_CLIENT_ID',
    apiLabel: 'Google OAuth (Sheets Scope)',
    apiUrl: 'https://console.cloud.google.com',
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'google_sheets',
        description: 'Google Sheets dosyasını oku veya yaz.',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['read', 'write', 'append', 'create'], description: 'İşlem türü' },
            spreadsheet_id: { type: 'string', description: 'Spreadsheet ID (URL\'den alınır)' },
            range: { type: 'string', description: 'Hücre aralığı (örn: Sheet1!A1:D10)' },
            values: { type: 'array', description: 'Yazılacak veriler (write/append için)' },
          },
          required: ['action'],
        },
      },
    },
  },
  {
    id: 'google_slides',
    name: 'Google Slides',
    icon: '🖼️',
    category: 'google',
    description: 'Sunum oluştur, slaytları düzenle ve içerik ekle.',
    systemPrompt: `Sen bir Google Slides asistanısın. Kullanıcının sunumlarını google_slides tool'u ile oluştur ve düzenle. Slayt başlıkları, içerik ve görseller ekleyerek profesyonel bir sunum hazırla.`,
    apiRequired: 'GOOGLE_CLIENT_ID',
    apiLabel: 'Google OAuth (Slides Scope)',
    apiUrl: 'https://console.cloud.google.com',
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'google_slides',
        description: 'Google Slides sunumu oluştur veya düzenle.',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['create', 'add_slide', 'update_slide', 'export'], description: 'İşlem türü' },
            presentation_id: { type: 'string', description: 'Sunum ID\'si' },
            title: { type: 'string', description: 'Sunum veya slayt başlığı' },
            content: { type: 'string', description: 'Slayt içeriği' },
          },
          required: ['action'],
        },
      },
    },
  },

  // ─── DEVELOPER TOOLS ────────────────────────────────────────────────────────
  {
    id: 'github',
    name: 'GitHub',
    icon: '🐙',
    category: 'developer',
    description: 'Repo ara, kod oku, issue ve PR yönet.',
    systemPrompt: `Sen bir GitHub asistanısın. Kullanıcının GitHub işlemlerini github_action tool'u ile yönet. Repo ara, kod oku, issue/PR listele veya oluştur. Sonuçları detaylı ve düzenli sun.`,
    apiRequired: 'GITHUB_TOKEN',
    apiLabel: 'GitHub Personal Access Token',
    apiUrl: 'https://github.com/settings/tokens',
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'github_action',
        description: 'GitHub\'da repo arama, dosya okuma, issue/PR listele veya oluştur.',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['search_repo', 'read_file', 'list_issues', 'create_issue', 'list_prs', 'get_commits'],
              description: 'İşlem türü',
            },
            repo: { type: 'string', description: 'owner/repo formatında repo adı' },
            query: { type: 'string', description: 'Arama sorgusu (search için)' },
            path: { type: 'string', description: 'Dosya yolu (read_file için)' },
            title: { type: 'string', description: 'Issue başlığı (create_issue için)' },
            body: { type: 'string', description: 'Issue içeriği' },
          },
          required: ['action'],
        },
      },
    },
  },
  {
    id: 'supabase',
    name: 'Supabase',
    icon: '⚡',
    category: 'developer',
    description: 'Supabase veritabanı tablo sorgula, RLS kuralı yaz, auth yönet.',
    systemPrompt: `Sen bir Supabase asistanısın. Kullanıcının Supabase veritabanı işlemlerini supabase_action tool'u ile yap. Tablo sorgula, RLS politikası oluştur veya şema açıkla.`,
    apiRequired: 'SUPABASE_URL',
    apiLabel: 'Supabase URL & Anon Key',
    apiUrl: 'https://supabase.com/dashboard',
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'supabase_action',
        description: 'Supabase veritabanı sorgula veya RLS politikası oluştur.',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['query', 'generate_rls', 'list_tables', 'explain_schema'],
              description: 'İşlem türü',
            },
            table: { type: 'string', description: 'Sorgulanacak veya şema açıklanacak tablo adı' },
            query_description: { type: 'string', description: 'Ne sorgulamak istediğinizin açıklaması' },
            columns: { type: 'string', description: 'Seçilecek sütunlar (virgülle ayrılmış, varsayılan: *)' },
            limit: { type: 'number', description: 'Maksimum satır sayısı (varsayılan: 10)' },
            filter: { type: 'string', description: 'PostgREST filtre parametresi (örn: status=eq.active)' },
          },
          required: ['action'],
        },
      },
    },
  },
  {
    id: 'vercel',
    name: 'Vercel',
    icon: '▲',
    category: 'developer',
    description: 'Deploy durumu, build logları ve proje bilgisi.',
    systemPrompt: `Sen bir Vercel asistanısın. Kullanıcının Vercel projelerini vercel_action tool'u ile kontrol et. Deployment durumu, build logları ve proje bilgilerini göster.`,
    apiRequired: 'VERCEL_TOKEN',
    apiLabel: 'Vercel API Token',
    apiUrl: 'https://vercel.com/account/tokens',
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'vercel_action',
        description: 'Vercel proje durumunu kontrol et, deploymentları listele veya logları incele.',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['list_deployments', 'get_logs', 'check_status', 'list_projects'],
              description: 'İşlem türü',
            },
            project_id: { type: 'string', description: 'Proje ID\'si' },
            deployment_id: { type: 'string', description: 'Deployment ID\'si' },
          },
          required: ['action'],
        },
      },
    },
  },
  {
    id: 'lovable',
    name: 'Lovable',
    icon: '💜',
    category: 'developer',
    description: 'Lovable projelerini yönet, kod oluştur ve görüntüle.',
    systemPrompt: `Sen bir Lovable asistanısın. Kullanıcının Lovable projelerini lovable_action tool'u ile yönet. Proje listele, kod oluştur ve görüntüle.`,
    apiRequired: 'LOVABLE_API_KEY',
    apiLabel: 'Lovable API Key',
    apiUrl: 'https://lovable.dev',
    free: false,
    tool: {
      type: 'function',
      function: {
        name: 'lovable_action',
        description: 'Lovable platformunda proje yönetimi ve kod oluşturma işlemleri.',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['list_projects', 'get_project', 'create_component'], description: 'İşlem türü' },
            project_id: { type: 'string', description: 'Proje ID\'si' },
            prompt: { type: 'string', description: 'Oluşturulacak bileşen açıklaması' },
          },
          required: ['action'],
        },
      },
    },
  },
];

/**
 * Belirtilen plugin ID'leri için AI tool tanımlarını döner
 */
export function getToolDefinitions(activePluginIds) {
  return PLUGINS
    .filter(p => activePluginIds.includes(p.id))
    .map(p => p.tool);
}

/**
 * Plugin ID'ye göre plugin objesi döner
 */
export function getPluginById(id) {
  return PLUGINS.find(p => p.id === id);
}

/**
 * Kategoriye göre plugin'leri gruplar
 */
export function getPluginsByCategory() {
  const grouped = {};
  for (const cat of Object.keys(PLUGIN_CATEGORIES)) {
    grouped[cat] = PLUGINS.filter(p => p.category === cat);
  }
  return grouped;
}
