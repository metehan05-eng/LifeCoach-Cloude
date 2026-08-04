/**
 * HAN Plugin Registry
 * Tüm mevcut plugin'lerin tanımları — AI Function Calling formatında
 */

export const PLUGIN_CATEGORIES = {
  core: { label: 'Temel Araçlar', icon: '🌐', color: '#6366f1' },
  finance: { label: 'Finance & Markets', icon: '💰', color: '#10b981' },
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
    id: 'weather',
    name: 'Hava Durumu',
    icon: '🌤️',
    category: 'core',
    description: 'Herhangi bir şehir için anlık hava durumu ve 5 günlük tahmin.',
    systemPrompt: `Sen bir hava durumu asistanısın. Kullanıcının belirttiği şehir için get_weather tool'unu çağır ve yanıtı şu formatta ver:

🌍 Şehir: {city}
🌡 Sıcaklık: {temp}°C (hissedilen: {feelsLike}°C)
☁️ Durum: {condition}
💧 Nem: {humidity}%
💨 Rüzgar: {windSpeed} km/h

Hava durumuna göre kıyafet önerisi yap (örn: "Yağmurluk almayı unutma"). 5 günlük tahmin varsa gün gün ekle.`,
    apiRequired: null,
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Belirtilen şehir için anlık hava durumu, sıcaklık, nem ve tahmin bilgisi al.',
        parameters: {
          type: 'object',
          properties: {
            city: { type: 'string', description: 'Şehir adı (örn: Istanbul, London)' },
            days: { type: 'number', description: 'Kaç günlük tahmin (1-5, varsayılan: 1)' },
          },
          required: ['city'],
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
  {
    id: 'youtube_summary',
    name: 'YouTube Özeti',
    icon: '▶️',
    category: 'core',
    description: 'YouTube videolarını özetle veya konuya göre video ara & öner.',
    systemPrompt: `Sen bir YouTube asistanısın. İki modda çalışırsın:

1. **Video URL verilirse**: youtube_summary tool'una url parametresini ver. Tool transkripti çeker. Gelen transkripti özetle, ana konuyu, önemli noktaları ve çıkarımları 3-5 madde halinde sun.

2. **Konu/arama sorgusu verilirse**: youtube_summary tool'una query parametresini ver. Tool video önerileri getirir. Her videonun başlık, kanal, süre ve izlenme bilgilerini göster, hangisinin neden uygun olduğunu açıkla.

Her iki durumda da yanıtı Türkçe ve akıcı bir dille ver.`,
    apiRequired: null,
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'youtube_summary',
        description: 'YouTube video URL\'sinden transkript alıp özetler VEYA konuya göre video önerir. İki modu vardır: (1) url verilirse transkript çeker, (2) query verilirse video arar.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'YouTube video URL\'si (transkript almak için). Örn: https://www.youtube.com/watch?v=xxx' },
            query: { type: 'string', description: 'Arama sorgusu (video önermek için). Örn: "Python öğrenmek" veya "motivasyon" ' },
            language: { type: 'string', description: 'Dil kodu (tr veya en, varsayılan: tr)' },
          },
        },
      },
    },
  },
  {
    id: 'notes',
    name: 'Not Defteri',
    icon: '📝',
    category: 'core',
    description: 'Önemli bilgileri not al, daha sonra hatırlat.',
    systemPrompt: `Sen bir not defteri asistanısın. Kullanıcının istediği bilgileri manage_notes tool'u ile kaydet, listele veya ara. Notları kategorize et ve önemli bilgileri vurgula.`,
    apiRequired: null,
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'manage_notes',
        description: 'Kullanıcının notlarını kaydet, listele veya ara. Hatırlanması gereken bilgiler için kullan.',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['save', 'list', 'search', 'delete'], description: 'Yapılacak işlem' },
            content: { type: 'string', description: 'Kaydedilecek not içeriği (save için)' },
            query: { type: 'string', description: 'Aranacak kelime (search için)' },
            note_id: { type: 'string', description: 'Not ID\'si (delete için)' },
          },
          required: ['action'],
        },
      },
    },
  },
  {
    id: 'reminder',
    name: 'Hatırlatıcı',
    icon: '⏰',
    category: 'core',
    description: 'Zamanlı hatırlatıcılar kur, önemli tarihleri takip et.',
    systemPrompt: `Sen bir hatırlatıcı asistanısın. Kullanıcının belirttiği tarih/saat ve mesaj için set_reminder tool'unu çağır. Hatırlatıcıları listele ve zamanı gelince bildir.`,
    apiRequired: null,
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'set_reminder',
        description: 'Belirli bir zaman için hatırlatıcı kur veya mevcut hatırlatıcıları listele.',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['set', 'list', 'delete'], description: 'İşlem türü' },
            message: { type: 'string', description: 'Hatırlatıcı mesajı' },
            datetime: { type: 'string', description: 'ISO 8601 formatında tarih-saat' },
          },
          required: ['action'],
        },
      },
    },
  },
  {
    id: 'pdf_analyzer',
    name: 'PDF Analiz',
    icon: '📄',
    category: 'core',
    description: 'PDF güvenlik taraması yap, içerik çıkar, analiz et ve soru sor.',
    systemPrompt: `Sen bir PDF analiz asistanısın. Kullanıcı bir PDF URL'si verirse analyze_pdf tool'unu çağır.

Tool önce PDF'i güvenlik taramasından geçirir:
- safe=false dönerse: Kullanıcıya güvenlik uyarılarını göster, PDF'in içeriğini okuyamadığını belirt.
- safe=true dönerse: Gelen içeriği özetle, anahtar noktaları madde madde çıkar. Varsa kullanıcının sorusunu PDF bağlamında yanıtla.

NOT: Kullanıcı PDF dosyasını sohbete ek olarak yüklediyse, içerik zaten konuşma bağlamındadır. Bu durumda tool'u çağırmana gerek yok, doğrudan içeriği analiz et.`,
    apiRequired: null,
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'analyze_pdf',
        description: 'Bir PDF dosyasını URL\'den indir, güvenlik taraması yap, içeriği oku ve analiz et.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'PDF dosyasının doğrudan URL\'si (örn: https://example.com/belge.pdf)' },
            question: { type: 'string', description: 'PDF hakkında sorulacak soru (isteğe bağlı)' },
          },
        },
      },
    },
  },

  // ─── FINANCE ────────────────────────────────────────────────────────────────
  {
    id: 'stock_market',
    name: 'Hisse Senedi',
    icon: '📊',
    category: 'finance',
    description: 'Yahoo Finance ile canlı hisse fiyatı, P/E, EPS, grafik, piyasa değeri ve analiz.',
    systemPrompt: `Sen bir hisse senedi analiz asistanısın. Kullanıcının belirttiği hisse sembolü için get_stock_data tool'unu çağır (BIST için .IS eklenir: THYAO.IS). Yanıtı şu formatta ver:

📊 **{symbol}** - {priceFormatted}
📈 Günlük: {changeFormatted}
💼 Piyasa Değeri: {marketCapFormatted}
📐 F/K: {peRatio} | EPS: {epsFormatted}
🎯 Hedef: {targetPrice} | Öneri: {recommendation}

Grafik verisi varsa trend yönünü belirt, destek/direnç seviyelerini yorumla.`,
    apiRequired: null,
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'get_stock_data',
        description: 'Yahoo Finance\'den canlı hisse senedi fiyatı, finansal metrikler (P/E, EPS, market cap), grafik verisi ve analist önerileri al. BIST hisseleri için .IS ekle (örn: THYAO.IS)',
        parameters: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Hisse senedi sembolü (örn: AAPL, THYAO.IS, GOOG, TSLA)' },
            period: { type: 'string', enum: ['1d', '5d', '1mo', '3mo', '6mo', '1y', '5y'], description: 'Grafik periyodu (varsayılan: 1ay)' },
          },
          required: ['symbol'],
        },
      },
    },
  },
  {
    id: 'crypto',
    name: 'Kripto Piyasası',
    icon: '₿',
    category: 'finance',
    description: 'CoinGecko ile canlı kripto fiyatı, market cap, 24s değişim, günlük aralık.',
    systemPrompt: `Sen bir kripto para analistisin. Kullanıcının belirttiği coin için get_crypto_data tool'unu çağır. Yanıtı şu formatta ver:

₿ **{coin}** ({symbol}): {priceFormatted}
📊 24s: {changeFormatted}
💰 Market Cap: {marketCapFormatted}
📈 Günlük Aralık: {dayRangeFormatted}

Piyasa trendini değerlendir, destek/direnç seviyelerini yorumla.`,
    apiRequired: null,
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'get_crypto_data',
        description: 'Kripto para fiyatı, market cap, 24s değişim ve günlük aralığı al. Kripto sembolü (btc, eth, sol, xrp...) veya CoinGecko adı (bitcoin, ethereum...) kullanın.',
        parameters: {
          type: 'object',
          properties: {
            coin_id: { type: 'string', description: 'Kripto para sembolü veya ID (örn: btc, bitcoin, eth, solana, dogecoin)' },
            currency: { type: 'string', description: 'Hedef para birimi (usd, try — varsayılan: usd)' },
          },
          required: ['coin_id'],
        },
      },
    },
  },
  {
    id: 'forex',
    name: 'Döviz & Forex',
    icon: '💱',
    category: 'finance',
    description: 'Yahoo Finance ile canlı döviz kurları, çevrim ve analiz.',
    systemPrompt: `Sen bir döviz kuru asistanısın. Kullanıcının belirttiği para birimleri için get_forex tool'unu çağır. Yanıtı şu formatta ver:

💱 {rateFormatted}
📊 Değişim: {changeFormatted}
📈 Gün içi: {dayLow} - {dayHigh}

Eğer miktar belirtilmişse çevrim sonucunu göster. Ekonomik yorum ekle.`,
    apiRequired: null,
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'get_forex',
        description: 'Yahoo Finance ile iki para birimi arasındaki anlık kur, değişim ve çevrim sonucu al.',
        parameters: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Kaynak para birimi (örn: USD, EUR, GBP)' },
            to: { type: 'string', description: 'Hedef para birimi (örn: TRY, EUR, JPY)' },
            amount: { type: 'number', description: 'Çevrilecek miktar (varsayılan: 1)' },
          },
          required: ['from', 'to'],
        },
      },
    },
  },
  {
    id: 'portfolio',
    name: 'Portföy Analizi',
    icon: '💼',
    category: 'finance',
    description: 'Hisse/kripto portföyünü ekle, çıkar, canlı değerle ve analiz et.',
    systemPrompt: `Sen bir portföy yönetim asistanısın. Kullanıcının portföyünü analyze_portfolio tool'u ile yönet:

- **add**: Portföye varlık ekle (symbol, miktar, ortalama maliyet)
- **remove**: Portföyden varlık çıkar
- **view/analyze**: Canlı fiyatlarla portföyü değerle
  - Her varlığın güncel değeri, kar/zarar, portföy içindeki yüzdesi
  - Toplam portföy değeri, günlük değişim
  - Çeşitlendirme skoru (0-100)
  - Risk dağılımı ve öneriler`,
    apiRequired: null,
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'analyze_portfolio',
        description: 'Portföy yönetimi: varlık ekle/çıkar, canlı fiyatlarla değerle, kar/zarar ve çeşitlendirme analizi yap.',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['view', 'add', 'remove', 'analyze'], description: 'İşlem: view (listele), add (ekle), remove (çıkar), analyze (detaylı analiz)' },
            asset: { type: 'string', description: 'Varlık sembolü (add/remove için, örn: AAPL, BTC-USD, THYAO.IS)' },
            quantity: { type: 'number', description: 'Miktar (add için)' },
            avgCost: { type: 'number', description: 'Ortalama maliyet (add için, opsiyonel)' },
          },
          required: ['action'],
        },
      },
    },
  },
  {
    id: 'investment_banking',
    name: 'Investment Banking',
    icon: '🏦',
    category: 'finance',
    description: 'DCF değerleme, IRR/NPV hesaplama, şirket değerleme modelleri.',
    systemPrompt: `Sen bir yatırım bankacılığı analistisin. Kullanıcının talebine göre DCF, IRR, NPV, WACC veya benzer değerleme modellerini investment_analysis tool'u ile hesapla. Sonuçları yatırımcı sunumuna uygun formatta açıkla.`,
    apiRequired: null,
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'investment_analysis',
        description: 'DCF modeli, IRR, NPV, WACC, P/E karşılaştırma gibi yatırım bankacılığı hesaplamaları yap.',
        parameters: {
          type: 'object',
          properties: {
            analysis_type: {
              type: 'string',
              enum: ['dcf', 'irr', 'npv', 'wacc', 'comparable', 'payback'],
              description: 'Analiz türü',
            },
            inputs: {
              type: 'object',
              description: 'Analize özgü girdiler (cash_flows, discount_rate, terminal_growth_rate vs.)',
            },
          },
          required: ['analysis_type', 'inputs'],
        },
      },
    },
  },
  {
    id: 'finance_news',
    name: 'Ekonomi Haberleri',
    icon: '📰',
    category: 'finance',
    description: 'Yahoo Finance ve diğer kaynaklardan borsa & ekonomi haberleri.',
    systemPrompt: `Sen bir ekonomi haberleri asistanısın. get_finance_news tool'unu çağırarak güncel borsa, kripto ve ekonomi haberlerini çek. Her haberi başlık, kaynak ve zaman bilgisiyle birlikte özetle.`,
    apiRequired: null,
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'get_finance_news',
        description: 'Güncel borsa, kripto ve ekonomi haberlerini çek.',
        parameters: {
          type: 'object',
          properties: {
            topic: { type: 'string', description: 'Konu veya hisse sembolü (isteğe bağlı)' },
            limit: { type: 'number', description: 'Haber sayısı (varsayılan: 5)' },
          },
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
  {
    id: 'sql_assistant',
    name: 'SQL Asistan',
    icon: '🗄️',
    category: 'analytics',
    description: 'SQL sorguları yaz, optimize et ve açıkla.',
    systemPrompt: `Sen bir SQL uzmanısın. Kullanıcının ihtiyacına göre sql_assist tool'unu kullanarak SQL sorgusu yaz, optimize et veya hata ayıkla. Sorguları açıklamalı ve alternatifleriyle birlikte sun.`,
    apiRequired: null,
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'sql_assist',
        description: 'SQL sorgusu yaz veya optimize et. Veritabanı şemasını anlayıp doğru query oluştur.',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['write', 'optimize', 'explain', 'debug'],
              description: 'İşlem türü',
            },
            description: { type: 'string', description: 'Ne yapmak istediğinin açıklaması' },
            schema: { type: 'string', description: 'Veritabanı şeması (isteğe bağlı)' },
            sql: { type: 'string', description: 'Optimize/açıklanacak SQL (optimize/explain için)' },
          },
          required: ['action', 'description'],
        },
      },
    },
  },

  // ─── GOOGLE SUITE ────────────────────────────────────────────────────────────
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    icon: '📅',
    category: 'google',
    description: 'Takvim etkinliklerini oku, oluştur, güncelle ve sil.',
    systemPrompt: `Sen bir Google Calendar asistanısın. Kullanıcının takvim etkinliklerini google_calendar tool'u ile yönet. Etkinlikleri listele, yeni etkinlik oluştur veya var olanı güncelle. Zaman çakışmalarını kontrol et.`,
    apiRequired: 'GOOGLE_CLIENT_ID',
    apiLabel: 'Google OAuth (Calendar Scope)',
    apiUrl: 'https://console.cloud.google.com',
    free: true,
    tool: {
      type: 'function',
      function: {
        name: 'google_calendar',
        description: 'Google Calendar\'da etkinlik oluştur, listele veya güncelle.',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['list', 'create', 'update', 'delete'], description: 'İşlem türü' },
            title: { type: 'string', description: 'Etkinlik başlığı (create/update için)' },
            start_time: { type: 'string', description: 'Başlangıç zamanı ISO 8601' },
            end_time: { type: 'string', description: 'Bitiş zamanı ISO 8601' },
            description: { type: 'string', description: 'Etkinlik açıklaması' },
            event_id: { type: 'string', description: 'Etkinlik ID (update/delete için)' },
          },
          required: ['action'],
        },
      },
    },
  },
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
            table: { type: 'string', description: 'Tablo adı' },
            query_description: { type: 'string', description: 'Ne sorgulamak istediğinizin açıklaması' },
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
  {
    id: 'replit',
    name: 'Replit',
    icon: '🔁',
    category: 'developer',
    description: 'Replit projelerini yönet, REPL çalıştır ve kod paylaş.',
    systemPrompt: `Sen bir Replit asistanısın. Kullanıcının Replit REPL'lerini replit_action tool'u ile yönet, kod çalıştır ve REPL oluştur.`,
    apiRequired: 'REPLIT_API_KEY',
    apiLabel: 'Replit API Key',
    apiUrl: 'https://replit.com',
    free: false,
    tool: {
      type: 'function',
      function: {
        name: 'replit_action',
        description: 'Replit üzerinde REPL yönetimi ve kod çalıştırma.',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['list_repls', 'run_code', 'create_repl'], description: 'İşlem türü' },
            repl_id: { type: 'string', description: 'REPL ID\'si' },
            language: { type: 'string', description: 'Programlama dili (python, js, ts...)' },
            code: { type: 'string', description: 'Çalıştırılacak kod' },
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
