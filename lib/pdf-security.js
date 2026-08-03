/**
 * PDF Güvenlik Tarayıcısı
 * PDF dosyalarını güvenlik açıklarına karşı tarar, kötü amaçlı içerikleri tespit eder.
 */

const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]; // %PDF

// Şüpheli PDF içerik desenleri (kötü niyetli PDF'lerde yaygın)
const SUSPICIOUS_PATTERNS = [
  { pattern: /\/JavaScript/i, risk: 'high', name: 'Gömülü JavaScript', description: 'PDF içinde JavaScript kodu tespit edildi. Bu, kötü amaçlı yazılım yüklemek için kullanılabilir.' },
  { pattern: /\/Launch\b/i, risk: 'high', name: 'Uygulama Başlatma', description: 'PDF harici bir uygulamayı başlatmaya çalışıyor. Bu, zararlı yazılım çalıştırabilir.' },
  { pattern: /\/EmbeddedFile/i, risk: 'high', name: 'Gömülü Dosya', description: 'PDF içinde gömülü dosya bulunuyor. Bu, virüs veya trojan barındırabilir.' },
  { pattern: /\/OpenAction\b/i, risk: 'high', name: 'Otomatik Eylem', description: 'PDF açılırken otomatik eylem tetikleniyor. Bu, zararlı bir işlemi otomatik başlatabilir.' },
  { pattern: /\/AA\b|\/AdditionalAction/i, risk: 'medium', name: 'Ekstra Eylemler', description: 'PDF\'de ek tetikleyici eylemler tanımlanmış.' },
  { pattern: /\/AcroForm/i, risk: 'medium', name: 'Etkileşimli Form', description: 'PDF\'de JavaScript içerebilecek etkileşimli form var.' },
  { pattern: /\/URI\s*\(.*\)/i, risk: 'low', name: 'URL Bağlantıları', description: 'PDF bilinmeyen URL\'lere bağlantılar içeriyor.' },
  { pattern: /\/RichMedia\b/i, risk: 'high', name: 'Flash/Gömülü Medya', description: 'PDF gömülü medya içeriyor (Flash, video). Güvenlik riski oluşturabilir.' },
  { pattern: /\/SubmitForm/i, risk: 'medium', name: 'Form Gönderme', description: 'PDF verileri harici bir sunucuya gönderebilir.' },
  { pattern: /\/ImportData/i, risk: 'medium', name: 'Veri İçe Aktarma', description: 'PDF harici kaynaktan veri içe aktarabilir.' },
  { pattern: /\/GoToE\b/i, risk: 'high', name: 'Dosya Dışına Git', description: 'PDF, bilgisayardaki diğer dosyalara erişmeye çalışıyor.' },
];

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50 MB limit

/**
 * Verinin PDF olup olmadığını kontrol et (magic bytes)
 */
export function isPDF(buffer) {
  if (!buffer || buffer.length < 4) return false;
  return (
    buffer[0] === PDF_MAGIC_BYTES[0] &&
    buffer[1] === PDF_MAGIC_BYTES[1] &&
    buffer[2] === PDF_MAGIC_BYTES[2] &&
    buffer[3] === PDF_MAGIC_BYTES[3]
  );
}

/**
 * PDF içeriğini güvenlik açıklarına karşı tara
 * @param {Buffer} buffer - PDF dosyası buffer'ı
 * @param {string} textContent - pdf-parse ile çıkarılmış metin (opsiyonel)
 * @returns {Object} { safe, warnings: [{ risk, name, description }] }
 */
export function scanPDF(buffer, textContent = '') {
  const warnings = [];
  const content = buffer.toString('utf-8');

  if (!isPDF(buffer)) {
    return {
      safe: false,
      warnings: [{ risk: 'critical', name: 'Geçersiz PDF', description: 'Dosya geçerli bir PDF formatında değil. Dosya başlığı %PDF ile başlamıyor.' }],
    };
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.pattern.test(content)) {
      warnings.push({
        risk: pattern.risk,
        name: pattern.name,
        description: pattern.description,
      });
    }
  }

  // Metin içeriğinde şüpheli desenler
  if (textContent) {
    const textLower = textContent.toLowerCase();
    const textPatterns = [
      { pattern: /şifre|password|pin\s*kodu|kredi\s*kartı|credit\s*card|cvv/i, risk: 'medium', name: 'Hassas Veri', description: 'PDF içinde potansiyel hassas bilgi (şifre, kart no vb.) bulunabilir.' },
    ];
    for (const tp of textPatterns) {
      if (tp.pattern.test(textLower)) {
        warnings.push({ risk: tp.risk, name: tp.name, description: tp.description });
      }
    }
  }

  // Boyut kontrolü
  if (buffer.length > MAX_PDF_SIZE) {
    warnings.push({
      risk: 'medium',
      name: 'Çok Büyük Dosya',
      description: `PDF ${(buffer.length / 1024 / 1024).toFixed(1)} MB. 50 MB üzeri dosyalar işlenemeyebilir.`,
    });
  }

  const highRisk = warnings.filter(w => w.risk === 'high' || w.risk === 'critical');
  return {
    safe: highRisk.length === 0,
    warnings,
    riskLevel: highRisk.length > 0 ? 'high' : warnings.length > 0 ? 'medium' : 'safe',
  };
}

/**
 * PDF'i analiz et: güvenlik taraması yap, ardından metin çıkar
 * @param {Buffer} buffer 
 * @returns {Object} { safe, scanResult, text, pageCount, metadata }
 */
export async function analyzePDF(buffer) {
  // Önce güvenlik taraması
  const scanResult = scanPDF(buffer);

  if (!scanResult.safe) {
    return {
      safe: false,
      scanResult,
      text: null,
      pageCount: null,
      metadata: null,
    };
  }

  // Güvenliyse parse et
  try {
    const pdf = await import('pdf-parse').then(m => m.default || m);
    const parsed = await pdf(buffer);
    return {
      safe: true,
      scanResult,
      text: parsed.text || '',
      pageCount: parsed.numpages || null,
      metadata: parsed.metadata || null,
    };
  } catch (parseErr) {
    return {
      safe: false,
      scanResult: {
        safe: false,
        warnings: [{ risk: 'high', name: 'PDF Parse Hatası', description: `PDF dosyası okunamadı: ${parseErr.message}` }],
        riskLevel: 'high',
      },
      text: null,
      pageCount: null,
      metadata: null,
    };
  }
}
