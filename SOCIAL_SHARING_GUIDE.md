# LifeCoach AI - Sosyal Medya Paylaşım Sistemi 🚀

## Genel Bakış

LifeCoach AI'da hedeflerinizi Instagram, Twitter (X), TikTok ve Reddit'de paylaşmak artık çok daha kolay ve güçlü! Sistem şu özellikleri sunar:

- 📱 **Mobil Uyumlu**: Android ve iOS'ta uygulama desteği
- 🖼️ **Görsel Paylaşım**: Hedefin görseli otomatik oluşturulur
- 🔐 **Akıllı Giriş**: Hesabınıza giriş yapıldıysa direkt gönderi alanına açılır
- 📋 **Otomatik Metni Kopyala**: Paylaşım metni panonuza kopyalanır
- 🎨 **Profesyonel Tasarım**: Şık ve modern görseller

---

## Özellikler

### 1. Twitter/X Paylaşımı
- ✅ Direkt tweet paylaşım linki
- ✅ Hedef başlığı ve ilerleme yüzdesi otomatik eklenir
- ✅ Hashtag'ler otomatik eklenir (#LifeCoachAI #Hedeflerim)
- ✅ Yeni sekmede Twitter açılır

**Nasıl Çalışır:**
1. Hedefin yanındaki "Paylaş" butonuna tıkla
2. "Twitter / X" seçeneğine tıkla
3. Twitter açılır, metni düzenleyebilir ve tweetleyebilirsin

---

### 2. Instagram Paylaşımı
- ✅ Mobilde: Instagram uygulaması açılır
- ✅ Masaüstünde: Instagram web açılır
- ✅ Paylaşım metni otomatik kopyalanır
- ✅ Profesyonel hedef görseli oluşturulur
- ✅ Görseli panoya kopyalayabilirsin

**Nasıl Çalışır:**
1. Hedefin yanındaki "Paylaş" butonuna tıkla
2. "Instagram" seçeneğine tıkla
3. Instagram uygulaması/web açılır
4. Metni ve görseli yapıştırarak hikaye veya gönderi yap

**Görsel Özellikleri:**
- ✨ Gradient arka plan (Dark theme)
- 🎯 Hedef ikonu ve başlığı
- 📊 Progress bar (ilerleme göstergesi)
- #️⃣ Otomatik hashtag'ler

---

### 3. TikTok Paylaşımı
- ✅ Mobilde: TikTok uygulaması açılır
- ✅ Masaüstünde: TikTok upload sayfası açılır
- ✅ Paylaşım metni otomatik kopyalanır
- ✅ Görseli panoya kopyalayabilirsin
- ✅ Video olarak paylaşabilirsin

**Nasıl Çalışır:**
1. Hedefin yanındaki "Paylaş" butonuna tıkla
2. "TikTok" seçeneğine tıkla
3. TikTok uygulaması açılır
4. Görsel + metin ile video oluştur ve paylaş

---

### 4. Reddit Paylaşımı
- ✅ İlgili subreddit'te paylaş
- ✅ Başlık otomatik eklenir
- ✅ Hedef detayları ve link eklenir
- ✅ Yorum topla ve ilham ver

**Nasıl Çalışır:**
1. Hedefin yanındaki "Paylaş" butonuna tıkla
2. "Reddit" seçeneğine tıkla
3. Reddit submission sayfası açılır
4. Subreddit seç (r/GetMotivated, r/selfimprovement vb.)
5. Paylaş

---

## Teknik Detaylar

### Kullanılan Teknolojiler

#### Backend (API)
- **Endpoint**: `POST /api/share`
- **Kimlik Doğrulama**: JWT Token
- **Fonksiyonlar**:
  - Social media URL oluşturma
  - SVG tabanlı görsel oluşturma
  - Base64 encoding

#### Frontend
- **JavaScript Async/Await**: Smooth API çağrıları
- **Canvas API**: Görsel oluşturma
- **Clipboard API**: Metin ve görsel kopyalama
- **Deep Linking**: Mobil app açılması

### Görsel Oluşturma Süreci

```
1. API: Share isteği alır
2. API: SVG görsel oluşturur
3. Frontend: Canvas'a dönüştürür
4. Frontend: PNG olarak kaydeder
5. Frontend: Panoya kopyalar veya indirir
```

---

## API Endpoint'i

### POST /api/share

**İstek Örneği:**
```json
{
  "platform": "instagram",
  "goalTitle": "Yüzme öğren",
  "goalProgress": 75,
  "includeImage": true
}
```

**Yanıt Örneği:**
```json
{
  "success": true,
  "platform": "instagram",
  "shareUrl": "https://www.instagram.com/",
  "deepLink": "instagram://",
  "shareText": "LifeCoach AI ile hedefime ilerliyorum!...",
  "description": "Hikayenizde paylaşabilirsiniz.",
  "action": "Uygulamayı Aç",
  "imageData": {
    "svg": "...",
    "mimeType": "image/svg+xml",
    "dataUrl": "data:image/svg+xml;base64,..."
  }
}
```

---

## Dosya Yapısı

### Oluşturulan Dosyalar
```
/pages/api/share.js              # Social Media Share API
/public/life-coach-ui.html       # Frontend UI güncellemeleri
```

### CSS Sınıfları (Yeni)
```css
.share-platform-btn-full         # Full-width share buttons
.btn-twitter-full
.btn-instagram-full
.btn-tiktok-full
.btn-reddit-full
```

### JavaScript Fonksiyonları (Yeni)
```javascript
platformShare()                   # Ana paylaşım fonksiyonu
handlePlatformShare()             # Platform-spesifik logic
generateGoalImage()               # Görsel oluştur (Canvas)
downloadGoalImage()               # Görsel indir
copyGoalImageToClipboard()        # Görsel panoya kopyala
```

---

## Kullanıcı Akışı

### Masaüstü Kullanıcı

```
1. Hedef göster
   ↓
2. "Paylaş" butonuna tıkla
   ↓
3. Sosyal medya seç
   ↓
4. Yeni sekmede sosyal medya açılır
   ↓
5. Hesabına giriş yaptıysan direkt gönderi alanında
   ↓
6. Metni düzenle ve paylaş
   ↓
7. Toast: "Platform'da paylaş!" ✓
```

### Mobil Kullanıcı

```
1. Hedef göster
   ↓
2. "Paylaş" butonuna tıkla
   ↓
3. Sosyal medya seç
   ↓
4. Uygulamayı aç (deep link)
   ↓
5. Metni panoya kopyalanır
   ↓
6. Görseli panoya kopyalanır
   ↓
7. Uygulama açılırsa: Metni ve görseli yapıştır
   ↓
8. Uygulama açılmazsa: Web sürümüne git
   ↓
9. Yayınla ✓
```

---

## Ortam Değişkenleri

```env
# .env (.env.local)
NEXT_PUBLIC_APP_URL=https://lifecoach-ai.vercel.app
JWT_SECRET=gizli-anahtar-degistir
```

---

## Mobil Deep Links

```javascript
// Instagram
"instagram://" veya "https://www.instagram.com/"

// TikTok
"snssdk1233://" veya "https://www.tiktok.com/upload"

// Twitter
"twitter://post" veya "https://twitter.com/intent/tweet"

// Reddit
"reddit://submit" veya "https://www.reddit.com/submit"
```

---

## Test Etme

### Test Adımları

1. **Hedef Oluştur**
   ```
   - Başlık: "Kod Yazma Projesini Bitir"
   - Tür: "weekly"
   - İlerleme: 65%
   ```

2. **Paylaşım Modalını Aç**
   - Hedefin yanındaki "Paylaş" butonuna tıkla

3. **Her Platform Test Et**
   - Twitter: Yeni pencerede Twitter açılmalı
   - Instagram: Instagram açılmalı, metni kopyalayın
   - TikTok: TikTok açılmalı, metni kopyalayın
   - Reddit: Reddit açılmalı, subreddit seçin

4. **Görsel Test**
   - "Görseli İndir" butonuna tıkla
   - Görsel indirilmelidir
   - "Görseli Kopyala" butonuna tıkla
   - Panoya kopyalanmalıdır

---

## Hata Çözme

### "Paylaşımda hata oluştu" Mesajı
- ✓ JWT token geçerli mi kontrol et
- ✓ İnternet bağlantısı kontrol et
- ✓ `/api/share` endpoint'i çalışıyor mu test et

### Görsel Kopyalanamıyor
- ✓ Tarayıcı Clipboard API destekliyor mu
- ✓ Chrome/Firefox/Safari güncel mi
- ✓ Sayfa HTTPS üzerinde mi

### Uygulama Açılmıyor (Mobil)
- ✓ Uygulama kurulu mu
- ✓ Deep link doğru mu
- ✓ Web sürümüne fallback yapılmış

---

## İyileştirmeler & Sonraki Adımlar

### Planlanan Özellikler
- [ ] LinkedIn paylaşım desteği
- [ ] Whatsapp paylaşım (grup)
- [ ] Email paylaşım şablonu
- [ ] QR kod oluşturma
- [ ] Hedef görseli özelleştirme
- [ ] Share analytics

### Performance Optimizasyonları
- Cache edilmiş görsel oluşturma
- CDN'de görsel depolama
- Batch share işlemleri

---

## Lisans & İletişim

**Geliştirici**: LifeCoach AI Team
**Son Güncelleme**: 28 Mart 2026

Sorularınız veya önerileriniz için lütfen iletişime geçin! 📧

---

## Referans

- [Social Media Deep Links](https://developers.google.com/web/updates/2016/10/web-share-api)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [JWT Authentication](https://jwt.io/)
