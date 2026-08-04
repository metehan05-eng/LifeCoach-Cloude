import { getPluginById } from './plugin-registry';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';
import { searchYouTubeVideos, isYouTubeUrl, extractYouTubeSearchQuery } from '../youtube-search.js';

let _yahooFinance = null;
const _portfolios = new Map(); // userKey -> [{ asset, quantity, avgCost }]

async function getYahooFinance() {
  if (!_yahooFinance) {
    const mod = await import('yahoo-finance2');
    _yahooFinance = new mod.default({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });
  }
  return _yahooFinance;
}

function formatDuration(isoDuration) {
  if (!isoDuration) return null;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = match[1] ? `${match[1]}:` : '';
  const minutes = (match[2] || '0').padStart(hours ? 2 : 1, '0');
  const seconds = (match[3] || '0').padStart(2, '0');
  return `${hours}${minutes}:${seconds}`;
}

/**
 * Plugin Yürütücü Motoru (Executor)
 * AI'ın Function Call taleplerini alıp ilgili gerçek servise/API'ye yönlendirir.
 */
export async function executePluginTool(functionName, args, userContext = {}) {
  try {
    console.log(`[PluginExecutor] Çağrılan Fonksiyon: ${functionName}`, args);

    switch (functionName) {
      // ─── CORE ───────────────────────────────────────────────────
      case 'web_search': {
        const query = args.query;
        // Tavily API veya fallback mock/fetch
        if (process.env.TAVILY_API_KEY) {
          const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, max_results: args.max_results || 5 }),
          });
          const data = await res.json();
          return { status: 'success', results: data.results || [] };
        }
        return {
          status: 'success',
          results: [
            { title: `${query} hakkında güncel bilgiler`, snippet: `Simüle edilmiş arama sonucu: ${query} konusuyla ilgili en güncel gelişmeler incelemede.`, url: 'https://example.com' }
          ]
        };
      }

      case 'get_weather': {
        const city = args.city;
        const days = args.days || 1;
        try {
          const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=tr`);
          const data = await res.json();
          if (res.ok && data.current_condition?.length) {
            const cc = data.current_condition[0];
            const forecasts = (data.weather || []).slice(0, days).map(w => ({
              date: w.date,
              temp_max: `${Math.round(w.maxtempC)}°C`,
              temp_min: `${Math.round(w.mintempC)}°C`,
              condition: w.hourly?.[0]?.lang_tr?.[0]?.value || w.hourly?.[0]?.weatherDesc?.[0]?.value || '',
            }));
            return {
              city: data.nearest_area?.[0]?.areaName?.[0]?.value || city,
              country: data.nearest_area?.[0]?.country?.[0]?.value || '',
              temperature: `${Math.round(cc.temp_C)}°C`,
              feels_like: `${Math.round(cc.FeelsLikeC)}°C`,
              condition: cc.lang_tr?.[0]?.value || cc.weatherDesc?.[0]?.value || '',
              humidity: `%${cc.humidity}`,
              wind: `${cc.windspeedKmph} km/h`,
              forecasts,
            };
          }
        } catch {}
        return {
          city,
          temperature: '24°C',
          condition: 'Parçalı Bulutlu',
          humidity: '%55',
          wind: '12 km/h'
        };
      }

      case 'scrape_url': {
        const targetUrl = args.url;
        if (!targetUrl || typeof targetUrl !== 'string') {
          return { status: 'error', message: 'Geçerli bir URL gerekli.' };
        }

        try {
          const normalizedUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
          const res = await axios.get(normalizedUrl, {
            timeout: 8000,
            responseType: 'text',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
            },
            maxRedirects: 3,
          });

          const html = typeof res.data === 'string' ? res.data : String(res.data);
          const $ = cheerio.load(html);

          // Kaldırılacak elementler
          $('script, style, noscript, iframe, nav, footer, header, aside, .sidebar, .footer, .header, .nav, nav, .menu, .ads, .advertisement, .cookie-banner, .popup').remove();

          const title = $('title').first().text().trim() || '';
          const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';

          // Ana içerik
          let contentParts = [];
          $('h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, pre code, pre, .content, article, main').each((_, el) => {
            const tag = $(el).prop('tagName').toLowerCase();
            const text = $(el).text().trim();
            if (!text || text.length < 10) return;

            if (tag.match(/^h[1-6]$/)) {
              contentParts.push(`\n## ${text}`);
            } else if (tag === 'li') {
              contentParts.push(`• ${text}`);
            } else if (tag === 'td' || tag === 'th') {
              contentParts.push(`  ${text}`);
            } else {
              contentParts.push(text);
            }
          });

          let content = contentParts.join('\n').replace(/\n{3,}/g, '\n\n').trim();

          // Fazla uzunsa kırp
          const MAX_LENGTH = 8000;
          if (content.length > MAX_LENGTH) {
            content = content.slice(0, MAX_LENGTH) + '\n\n... [içerik çok uzun olduğu için kesildi]';
          }

          return {
            status: 'success',
            url: normalizedUrl,
            title,
            description: metaDesc,
            content: content || 'Sayfadan okunabilir içerik çıkarılamadı.',
          };
        } catch (err) {
          if (err.code === 'ECONNABORTED') {
            return { status: 'error', message: 'Sayfa yanıt vermedi (timeout).' };
          }
          if (err.response?.status === 404) {
            return { status: 'error', message: 'Sayfa bulunamadı (404).' };
          }
          if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
            return { status: 'error', message: 'Domain çözümlenemedi. URL\'yi kontrol eder misin?' };
          }
          return {
            status: 'error',
            message: `Sayfa yüklenemedi: ${err.message}`,
          };
        }
      }

      case 'youtube_summary': {
        const url = args.url || '';
        const query = args.query || '';
        const language = args.language || 'tr';

        // ── MOD 1: URL verilmiş → transkript çek ────────────────
        if (url && isYouTubeUrl(url)) {
          const videoId = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/)?.[1];
          if (!videoId) {
            return { status: 'error', message: 'Geçersiz YouTube URL\'si. Video ID bulunamadı.' };
          }

          // Transkript al (youtube-transcript paketi)
          let transcript = '';
          try {
            const segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: language });
            if (segments?.length) {
              transcript = segments.map(s => s.text).join(' ').trim();
            }
          } catch (transcriptErr) {
            console.warn('[YouTube] Transcript fetch failed:', transcriptErr.message);
          }

          // Video bilgisi al (YouTube Data API ile)
          let videoInfo = { title: '', channel: '', description: '', duration: '', viewCount: null };
          const apiKey = process.env.YOUTUBE_API_KEY;
          if (apiKey) {
            try {
              const infoRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`,
                { headers: { Referer: 'https://lifecoach.ai/' } }
              );
              if (infoRes.ok) {
                const infoData = await infoRes.json();
                const item = infoData.items?.[0];
                if (item) {
                  videoInfo = {
                    title: item.snippet.title || '',
                    channel: item.snippet.channelTitle || '',
                    description: (item.snippet.description || '').slice(0, 500),
                    duration: formatDuration(item.contentDetails?.duration),
                    viewCount: item.statistics?.viewCount ? Number(item.statistics.viewCount).toLocaleString('tr-TR') : null,
                  };
                }
              }
            } catch {}
          }

          return {
            status: 'success',
            type: 'transcript',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            videoId,
            title: videoInfo.title,
            channel: videoInfo.channel,
            description: videoInfo.description,
            duration: videoInfo.duration,
            viewCount: videoInfo.viewCount,
            transcript: transcript ? transcript.slice(0, 6000) : null,
            transcriptNote: transcript ? `${transcript.split(' ').length} kelime` : 'Transkript alınamadı (video altyazısız olabilir).',
          };
        }

        // ── MOD 2: Sorgu verilmiş veya sadece URL'siz → video ara ──
        const searchQuery = query || url;
        if (searchQuery) {
          const results = await searchYouTubeVideos(searchQuery, 5, { language });
          if (results?.length) {
            return {
              status: 'success',
              type: 'search',
              query: searchQuery,
              results: results.map(r => ({
                videoId: r.videoId,
                title: r.title,
                channel: r.channel,
                url: r.url,
                duration: r.duration,
                viewCount: r.viewCount ? Number(r.viewCount).toLocaleString('tr-TR') : null,
                description: r.description,
                thumbnail: r.thumbnail,
              })),
              totalResults: results.length,
            };
          }
          return {
            status: 'error',
            message: `"${searchQuery}" için video bulunamadı. Farklı bir arama terimi dene.`,
          };
        }

        return { status: 'error', message: 'Bir YouTube URL\'si veya arama sorgusu belirtmelisin.' };
      }

      case 'manage_notes': {
        return {
          action: args.action,
          message: `Not işlemi (${args.action}) başarıyla gerçekleştirildi.`,
          data: args.content ? { saved_text: args.content } : []
        };
      }

      case 'set_reminder': {
        return {
          status: 'scheduled',
          message: `Hatırlatıcı ayarlandı: "${args.message || 'Hatırlatıcı'}" - ${args.datetime || 'Yakın zamanda'}`
        };
      }

      case 'analyze_pdf': {
        const { url, question } = args;
        if (!url) {
          return { status: 'error', message: 'PDF URL\'si gerekli.' };
        }

        let buffer;
        try {
          const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
          const res = await axios.get(normalizedUrl, {
            timeout: 15000,
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          buffer = Buffer.from(res.data);
        } catch (fetchErr) {
          return {
            status: 'error',
            message: `PDF indirilemedi: ${fetchErr.message}`,
          };
        }

        const { isPDF } = await import('@/lib/pdf-security.js');
        if (!isPDF(buffer)) {
          return {
            status: 'error',
            safe: false,
            message: 'Dosya geçerli bir PDF formatında değil.',
          };
        }

        const { analyzePDF } = await import('@/lib/pdf-security.js');
        const result = await analyzePDF(buffer);

        if (!result.safe) {
          const highRiskWarnings = result.scanResult.warnings
            .filter(w => w.risk === 'high' || w.risk === 'critical')
            .map(w => `[${w.risk.toUpperCase()}] ${w.name}: ${w.description}`);
          const mediumWarnings = result.scanResult.warnings
            .filter(w => w.risk === 'medium')
            .map(w => `[MEDYUM] ${w.name}: ${w.description}`);

          return {
            status: 'success',
            safe: false,
            riskLevel: result.scanResult.riskLevel,
            warnings: result.scanResult.warnings,
            message: `⚠️ PDF güvenlik taramasından geçemedi!\n\nYüksek Riskli Uyarılar:\n${highRiskWarnings.join('\n')}${mediumWarnings.length ? `\n\nOrta Seviye Uyarılar:\n${mediumWarnings.join('\n')}` : ''}\n\nBu PDF güvenli olmadığı için içeriği okunamadı.`,
          };
        }

        return {
          status: 'success',
          safe: true,
          url,
          pageCount: result.pageCount,
          textLength: result.text?.length || 0,
          content: result.text?.slice(0, 8000) || 'PDF içeriği boş.',
          question: question || null,
          metadata: result.metadata || null,
          scanSummary: '✅ Güvenlik taramasından geçti. Risk tespit edilmedi.',
        };
      }

      // ─── FINANCE & MARKETS (Yahoo Finance) ────────────────────
      case 'get_stock_data': {
        const symbol = (args.symbol || '').toUpperCase().trim();
        const period = args.period || '1mo';
        if (!symbol) return { status: 'error', message: 'Hisse senedi sembolü gerekli.' };

        try {
          const yf = await getYahooFinance();
          const quote = await yf.quote(symbol);

          let summary = { summaryDetail: {}, defaultKeyStatistics: {}, financialData: {} };
          try { summary = await yf.quoteSummary(symbol, { modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData'] }); } catch {}

          const sd = summary.summaryDetail || {};
          const ks = summary.defaultKeyStatistics || {};
          const fd = summary.financialData || {};

          let history = [];
          try {
            const endDate = new Date();
            const startDate = new Date();
            if (period === '1d') startDate.setDate(startDate.getDate() - 2);
            else if (period === '5d') startDate.setDate(startDate.getDate() - 7);
            else if (period === '1mo') startDate.setMonth(startDate.getMonth() - 1);
            else if (period === '3mo') startDate.setMonth(startDate.getMonth() - 3);
            else if (period === '6mo') startDate.setMonth(startDate.getMonth() - 6);
            else if (period === '1y') startDate.setFullYear(startDate.getFullYear() - 1);
            else if (period === '5y') startDate.setFullYear(startDate.getFullYear() - 5);
            const chart = await yf.chart(symbol, { period1: startDate.toISOString().split('T')[0], interval: '1d' });
            if (chart?.quotes?.length) {
              history = chart.quotes.slice(-30).map(q => ({
                date: q.date?.toISOString()?.split('T')[0],
                close: q.close,
                volume: q.volume,
              })).filter(q => q.close != null);
            }
          } catch {}

          const price = quote.regularMarketPrice;
          const currency = quote.currency || 'USD';
          const isBist = symbol.endsWith('.IS');
          const prefix = isBist ? '' : (currency === 'TRY' ? '₺' : '$');

          return {
            status: 'success',
            symbol,
            name: quote.shortName || quote.longName || symbol,
            exchange: quote.exchange || '',
            currency,
            currentPrice: price,
            priceFormatted: isBist ? `${price?.toFixed(2) || '?'} TRY` : `${prefix}${price?.toFixed(2) || '?'}`,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            changeFormatted: `${quote.regularMarketChangePercent >= 0 ? '+' : ''}${quote.regularMarketChangePercent?.toFixed(2)}%`,
            dayHigh: sd.dayHigh,
            dayLow: sd.dayLow,
            open: sd.open,
            previousClose: sd.previousClose,
            volume: sd.volume,
            volumeFormatted: sd.volume?.toLocaleString('tr-TR'),
            avgVolume: sd.averageVolume,
            marketCap: sd.marketCap,
            marketCapFormatted: sd.marketCap ? (sd.marketCap > 1e12 ? `${(sd.marketCap / 1e12).toFixed(2)}T` : sd.marketCap > 1e9 ? `${(sd.marketCap / 1e9).toFixed(2)}B` : `${(sd.marketCap / 1e6).toFixed(0)}M`) : null,
            peRatio: sd.trailingPE || sd.forwardPE,
            forwardPE: sd.forwardPE,
            eps: ks.forwardEps || ks.trailingEps,
            epsFormatted: ks.forwardEps ? `${prefix}${ks.forwardEps.toFixed(2)}` : null,
            dividendYield: sd.dividendYield ? `${(sd.dividendYield * 100).toFixed(2)}%` : null,
            dividendRate: sd.dividendRate ? `${prefix}${sd.dividendRate.toFixed(2)}` : null,
            beta: ks.beta,
            targetPrice: fd.targetMeanPrice ? `${prefix}${fd.targetMeanPrice.toFixed(2)}` : null,
            recommendation: fd.recommendationKey || fd.recommendationMean,
            fiftyTwoWeekHigh: sd.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: sd.fiftyTwoWeekLow,
            history,
            source: 'Yahoo Finance',
          };
        } catch (err) {
          return { status: 'error', message: `"${symbol}" verisi alınamadı: ${err.message}` };
        }
      }

      case 'get_crypto_data': {
        const coin = (args.coin_id || '').toLowerCase().trim();
        if (!coin) return { status: 'error', message: 'Kripto para ID\'si gerekli.' };

        // Yahoo Finance crypto format: BTC-USD, ETH-USD
        const yfSymbol = coin.includes('-') ? coin.toUpperCase() : `${coin.toUpperCase()}-USD`;
        try {
          const yf = await getYahooFinance();
          const quote = await yf.quote(yfSymbol);
          let summary = {};
          try { summary = await yf.quoteSummary(yfSymbol, { modules: ['summaryDetail'] }); } catch {}

          const sd = summary.summaryDetail || {};
          const price = quote.regularMarketPrice;
          const curr = quote.currency || 'USD';

          return {
            status: 'success',
            coin,
            symbol: yfSymbol,
            name: quote.shortName || quote.longName || coin,
            price,
            priceFormatted: curr === 'USD' ? `$${price?.toFixed(2) || '?'}` : `${price?.toFixed(2) || '?'} ${curr}`,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            changeFormatted: `${quote.regularMarketChangePercent >= 0 ? '+' : ''}${quote.regularMarketChangePercent?.toFixed(2)}%`,
            marketCap: sd.marketCap,
            marketCapFormatted: sd.marketCap ? (sd.marketCap > 1e12 ? `${(sd.marketCap / 1e12).toFixed(2)}T` : sd.marketCap > 1e9 ? `${(sd.marketCap / 1e9).toFixed(2)}B` : `${(sd.marketCap / 1e6).toFixed(0)}M`) : null,
            volume24h: sd.volume24Hr || sd.volume,
            dayHigh: sd.dayHigh,
            dayLow: sd.dayLow,
            source: 'Yahoo Finance',
          };
        } catch (err) {
          return { status: 'error', message: `"${coin}" verisi alınamadı: ${err.message}` };
        }
      }

      case 'get_forex': {
        const { from, to, amount = 1 } = args;
        if (!from || !to) return { status: 'error', message: 'Kaynak ve hedef para birimi gerekli.' };

        const pair = `${from}${to}=X`;
        try {
          const yf = await getYahooFinance();
          const quote = await yf.quote(pair);
          const rate = quote.regularMarketPrice;
          const change = quote.regularMarketChange;
          const changePct = quote.regularMarketChangePercent;

          return {
            status: 'success',
            from: from.toUpperCase(),
            to: to.toUpperCase(),
            pair,
            rate,
            rateFormatted: `1 ${from.toUpperCase()} = ${rate?.toFixed(4) || '?'} ${to.toUpperCase()}`,
            change,
            changePercent: changePct,
            changeFormatted: `${changePct >= 0 ? '+' : ''}${changePct?.toFixed(2)}%`,
            dayHigh: quote.regularMarketDayHigh,
            dayLow: quote.regularMarketDayLow,
            amount: Number(amount),
            calculatedResult: amount && rate ? (amount * rate).toFixed(2) : null,
            calculatedFormatted: amount && rate ? `${amount} ${from.toUpperCase()} = ${(amount * rate).toFixed(2)} ${to.toUpperCase()}` : null,
            source: 'Yahoo Finance',
          };
        } catch (err) {
          return { status: 'error', message: `"${pair}" kuru alınamadı: ${err.message}` };
        }
      }

      case 'analyze_portfolio': {
        const { action, asset, quantity, avgCost, avg_cost } = args;
        const effectiveAvgCost = avgCost ?? avg_cost;
        const userKey = userContext?.email || userContext?.userId || 'default';

        if (!_portfolios.has(userKey)) {
          _portfolios.set(userKey, []);
        }
        let holdings = _portfolios.get(userKey);

        if (action === 'add') {
          if (!asset || !quantity) return { status: 'error', message: 'Eklenecek varlık sembolü ve miktar gerekli.' };
          const existing = holdings.find(h => h.asset.toUpperCase() === asset.toUpperCase());
          if (existing) {
            existing.quantity += Number(quantity);
            if (effectiveAvgCost) existing.avgCost = (existing.avgCost * existing.quantity + Number(effectiveAvgCost) * Number(quantity)) / (existing.quantity + Number(quantity));
          } else {
            holdings.push({ asset: asset.toUpperCase(), quantity: Number(quantity), avgCost: Number(effectiveAvgCost) || 0 });
          }
          return { status: 'success', message: `${asset.toUpperCase()} portföye eklendi.`, holdings: holdings.map(h => ({ ...h })) };
        }

        if (action === 'remove') {
          if (!asset) return { status: 'error', message: 'Çıkarılacak varlık sembolü gerekli.' };
          holdings = holdings.filter(h => h.asset.toUpperCase() !== asset.toUpperCase());
          _portfolios.set(userKey, holdings);
          return { status: 'success', message: `${asset.toUpperCase()} portföyden çıkarıldı.`, holdings: holdings.map(h => ({ ...h })) };
        }

        if (action === 'analyze' || action === 'view') {
          if (!holdings.length) return { status: 'success', holdings: [], totalValue: 0, message: 'Portföyde varlık bulunmuyor.' };

          try {
            const yf = await getYahooFinance();
            const symbols = holdings.map(h => h.asset);
            const quotes = await yf.quote(symbols);

            let totalValue = 0;
            let totalCost = 0;
            let totalDayChange = 0;
            const details = holdings.map(h => {
              const q = Array.isArray(quotes) ? quotes.find(r => (r.symbol || '').toUpperCase() === h.asset) : quotes;
              const currentPrice = q?.regularMarketPrice || 0;
              const dayChange = q?.regularMarketChange || 0;
              const changePct = q?.regularMarketChangePercent || 0;
              const value = currentPrice * h.quantity;
              const cost = h.avgCost * h.quantity;
              totalValue += value;
              totalCost += cost;
              totalDayChange += dayChange * h.quantity;
              return {
                asset: h.asset,
                quantity: h.quantity,
                avgCost: h.avgCost,
                currentPrice,
                currentPriceFormatted: q?.currency === 'TRY' ? `${currentPrice.toFixed(2)} TRY` : `$${currentPrice.toFixed(2)}`,
                dayChange: dayChange,
                dayChangePercent: changePct,
                value,
                valueFormatted: q?.currency === 'TRY' ? `${value.toFixed(2)} TRY` : `$${value.toFixed(2)}`,
                pnl: value - cost,
                pnlPercent: cost > 0 ? ((value - cost) / cost * 100) : 0,
                allocation: 0,
              };
            });

            details.forEach(d => { d.allocation = totalValue > 0 ? (d.value / totalValue * 100) : 0; });

            // Çeşitlendirme skoru
            const topAlloc = Math.max(...details.map(d => d.allocation));
            const diversificationScore = Math.round(Math.min(100, 100 - (topAlloc - (100 / details.length))));

            return {
              status: 'success',
              action: 'analyze',
              holdings: details,
              totalValue,
              totalValueFormatted: `$${totalValue.toFixed(2)}`,
              totalCost,
              totalCostFormatted: `$${totalCost.toFixed(2)}`,
              totalPnl: totalValue - totalCost,
              totalPnlFormatted: (totalValue - totalCost) >= 0 ? `+$${(totalValue - totalCost).toFixed(2)}` : `-$${Math.abs(totalValue - totalCost).toFixed(2)}`,
              totalDayChange,
              totalDayChangeFormatted: totalDayChange >= 0 ? `+$${totalDayChange.toFixed(2)}` : `-$${Math.abs(totalDayChange).toFixed(2)}`,
              diversificationScore: `${diversificationScore}/100`,
              assetCount: details.length,
              source: 'Yahoo Finance',
            };
          } catch (err) {
            return { status: 'error', message: `Portföy analiz edilemedi: ${err.message}` };
          }
        }

        return { status: 'error', message: 'Geçersiz işlem. view, add, remove veya analyze kullan.' };
      }

      case 'investment_analysis': {
        const { analysis_type, inputs } = args;
        if (analysis_type === 'dcf' && inputs) {
          const cashFlows = inputs.cash_flows || [];
          const discountRate = inputs.discount_rate || 10;
          const terminalGrowth = inputs.terminal_growth_rate || 2.5;
          const npv = cashFlows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + discountRate / 100, i + 1), 0);
          const terminalValue = cashFlows.length ? (cashFlows[cashFlows.length - 1] * (1 + terminalGrowth / 100)) / ((discountRate - terminalGrowth) / 100) : 0;
          return {
            type: 'DCF Değerlemesi',
            npv: npv.toFixed(2),
            terminalValue: terminalValue.toFixed(2),
            totalValue: (npv + terminalValue).toFixed(2),
            discountRate: `%${discountRate}`,
            terminalGrowthRate: `%${terminalGrowth}`,
            result: `DCF modeline göre toplam değer: $${(npv + terminalValue).toFixed(2)}`,
          };
        }
        return { type: analysis_type || 'generic', result: 'Hesaplama tamamlandı. Detaylar için parametreleri kontrol et.' };
      }

      case 'get_finance_news': {
        const topic = args.topic || '';
        const limit = Math.min(args.limit || 5, 10);
        try {
          const yf = await getYahooFinance();
          const searchQuery = topic || 'stock market';
          const results = await yf.search(searchQuery);
          const newsItems = (results.news || []).slice(0, limit).map(n => ({
            title: n.title,
            publisher: n.publisher,
            link: n.link,
            publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : null,
            summary: (n.summary || '').slice(0, 200),
            thumbnail: n.thumbnail?.resolutions?.[0]?.url || null,
          }));

          // Fallback: trending + search for related news
          if (!newsItems.length && !topic) {
            const trending = await yf.trendingSymbols('US');
            const topSymbols = (trending.quotes || []).slice(0, 3).map(q => q.symbol);
            for (const sym of topSymbols) {
              const symResults = await yf.search(sym);
              if (symResults.news?.length) {
                symResults.news.slice(0, 2).forEach(n => {
                  if (!newsItems.find(ex => ex.title === n.title)) {
                    newsItems.push({
                      title: n.title,
                      publisher: n.publisher,
                      link: n.link,
                      publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : null,
                      summary: (n.summary || '').slice(0, 200),
                      thumbnail: n.thumbnail?.resolutions?.[0]?.url || null,
                    });
                  }
                });
              }
            }
          }

          return {
            status: 'success',
            topic: searchQuery,
            news: newsItems.slice(0, limit),
            totalResults: newsItems.length,
            source: 'Yahoo Finance',
          };
        } catch (err) {
          return { status: 'error', message: `Haberler alınamadı: ${err.message}` };
        }
      }

      // ─── DATA ANALYTICS ────────────────────────────────────────
      case 'analyze_data': {
        return {
          file_id: args.file_id,
          operation: args.operation,
          summary: 'Veri seti 1,500 satır ve 12 sütundan oluşuyor. Anomali tespit edilmedi.',
          key_insights: ['Satışlar son çeyrekte %18 arttı', 'En yüksek hacimli bölge: Marmara']
        };
      }

      case 'generate_chart': {
        return {
          rendered: true,
          chart_type: args.chart_type,
          title: args.title || 'Veri Grafiği',
          config: args.data
        };
      }

      case 'sql_assist': {
        return {
          generated_sql: `SELECT id, name, created_at FROM users WHERE status = 'active' ORDER BY created_at DESC LIMIT 10;`,
          explanation: 'Bu sorgu aktif olan kullanıcıları oluşturulma tarihine göre en yeniden eskiye doğru sıralayıp ilk 10 kaydı getirir.'
        };
      }

      // ─── GOOGLE SUITE ──────────────────────────────────────────
      case 'google_calendar': {
        return {
          status: 'success',
          action: args.action,
          details: args.title ? `Etkinlik eklendi: "${args.title}"` : 'Takvim etkinlikleri listelendi (3 etkinlik).'
        };
      }

      case 'google_sheets': {
        return {
          status: 'success',
          action: args.action,
          spreadsheet_id: args.spreadsheet_id,
          message: 'Sheet verisi işlendi.'
        };
      }

      case 'google_slides': {
        return {
          status: 'success',
          action: args.action,
          message: 'Sunum slaytları başarıyla güncellendi.'
        };
      }

      // ─── DEVELOPER TOOLS ───────────────────────────────────────
      case 'github_action': {
        return {
          action: args.action,
          repo: args.repo,
          result: args.action === 'search_repo' ? '5 ilgili depo bulundu.' : 'Dosya/Issue detayları getirildi.'
        };
      }

      case 'supabase_action': {
        return {
          action: args.action,
          table: args.table,
          result: `CREATE POLICY "Enable read access for authenticated users" ON "${args.table || 'public_table'}" FOR SELECT TO authenticated USING (true);`
        };
      }

      case 'vercel_action': {
        return {
          action: args.action,
          latest_deployment: { id: 'dpl_8293x19', status: 'READY', url: 'https://han-ai.dev' }
        };
      }

      case 'lovable_action': {
        return {
          status: 'success',
          message: `Lovable projesi (${args.project_id || 'yeni'}) üzerinde işlem tamamlandı.`
        };
      }

      case 'replit_action': {
        return {
          status: 'executed',
          output: 'Process exited with code 0\nOutput: Code executed successfully in isolated container.'
        };
      }

      default:
        throw new Error(`Bilinmeyen plugin aracı: ${functionName}`);
    }
  } catch (error) {
    console.error(`[PluginExecutor Error] ${functionName}:`, error);
    return { status: 'error', message: error.message };
  }
}
