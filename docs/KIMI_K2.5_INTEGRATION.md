# Kimi K2.5 API Entegrasyonu - Kurulum Kılavuzu

## ✅ Tamamlanan Değişiklikler

### 1. **Backend Konfigürasyonu**
- ✅ `pages/api/chat.js` güncellendi
  - Kimi K2.5 API desteği eklendi
  - `tryKimiModel()` fonksiyonu oluşturuldu
  - Fallback zincirinde Kimi birinci öncelik olarak ayarlandı

### 2. **Ortam Değişkenleri**
- ✅ `env.example` güncellendi
  - `KIMI_API_KEY` eklendi
  - `KIMI_MODEL` eklendi

- ✅ `.env.local.example` güncellendi
  - Kimi K2.5 kurulum talimatları eklendi
  - API endpoint bilgisi belirtildi

### 3. **Test Dosyaları**
- ✅ `test-kimi-k2.5.sh` oluşturuldu
  - Bash/cURL test script'i
  - 3 farklı test senaryosu (Basit soru, Kod yazma, Konuşma)

- ✅ `test-kimi-k2.5.js` oluşturuldu
  - Node.js test dosyası
  - OpenAI client ile Kimi K2.5 API'sini test eder

---

## 🔧 Kurulum Adımları

### Adım 1: Kimi K2.5 API Key'ini Alın
1. https://platform.moonshot.cn/ adresine gidin
2. Hesap açın/giriş yapın
3. API Dashboard'dan yeni key oluşturun
4. Key'i güvenli bir yerde saklayın

### Adım 2: Ortam Değişkenlerini Ayarlayın
```bash
# .env.local dosyasını oluşturun
cp .env.local.example .env.local

# Kimi API key'ini ekleyin
echo "KIMI_API_KEY=sk-YourActualKeyHere" >> .env.local
echo "KIMI_MODEL=kimi-k2.5" >> .env.local
```

### Adım 3: API Key'i Doğrulayın
```bash
# Bash/cURL testi
bash test-kimi-k2.5.sh

# veya Node.js testi
node test-kimi-k2.5.js
```

---

## 🚀 Mimari Değişiklikler

### Model Fallback Zinciri (Yeni Sıra)
```
1. 🔴 Kimi K2.5 (Birincil - ASIL MODEL)
   ↓ (Başarısız olursa)
2. 🟡 Groq (Yedek)
   - mixtral-8x7b-32768
   - llama-3.1-70b-versatile
   - gemma-7b-it
   ↓ (Başarısız olursa)
3. 🟢 Gemini 1.5 Flash (Son çare)
```

### API Endpoint Bilgisi
```
Kimi K2.5:
├─ Endpoint: https://api.moonshot.cn/v1
├─ Model: kimi-k2.5
├─ Auth: Bearer Token (API Key)
└─ Format: OpenAI uyumlu API
```

---

## 📝 Code Implementation

### pages/api/chat.js'deki Değişiklikler

#### 1. Kimi API Key'i Yükleme
```javascript
const kimiKey = process.env.KIMI_API_KEY;
const kimiModel = process.env.KIMI_MODEL || "kimi-k2.5";
```

#### 2. Kimi Model Fonksiyonu
```javascript
async function tryKimiModel() {
  if (!kimiKey) throw new Error("KIMI_API_KEY ayarlı değil.");
  
  const client = new OpenAI({ 
    apiKey: kimiKey.trim(), 
    baseURL: "https://api.moonshot.cn/v1" 
  });
  
  const completion = await client.chat.completions.create({
    model: process.env.KIMI_MODEL || "kimi-k2.5",
    messages: messages,
    temperature: 0.5,
    max_tokens: 4096,
    stream: false
  });

  return completion.choices[0]?.message?.content;
}
```

#### 3. Fallback Zincirinde Kimi'yi Ekleme
```javascript
// KATMAN 1: Kimi K2.5 (ASIL MODEL)
if (kimiKey) {
  try {
    console.log('[AI-Fallback] 🚀 Kimi K2.5 deneniyor (ANA MODEL)');
    aiResponse = await tryKimiModel();
    usedModel = `kimi/${process.env.KIMI_MODEL || 'kimi-k2.5'}`;
    console.log('[AI-Fallback] ✅ Kimi K2.5 başarılı');
  } catch (err) {
    console.warn(`[AI-Fallback] ❌ Kimi K2.5 başarısız: ${err.message}`);
    // Groq'a geçişi devam et
  }
}
```

---

## 🔐 Güvenlik Önlemleri

### ⚠️ ÖNEMLİ: API Key Güvenliği

1. **API Key'i Hiçbir Zaman Hardcode Etmeyin**
   ```javascript
   // ❌ YANLIŞ
   const key = "sk-actual-key-here";
   
   // ✅ DOĞRU
   const key = process.env.KIMI_API_KEY;
   ```

2. **Environment Variables Kullanın**
   ```bash
   # .env.local (Git tarafından ignore edilir)
   KIMI_API_KEY=sk-YourSecretKeyHere
   ```

3. **.gitignore Kontrol Edin**
   ```
   # .gitignore dosyasında var mı?
   .env.local
   .env
   *.key
   ```

4. **GitHub'a Yüklenen Key'i Hemen Yenileyin**
   - https://platform.moonshot.cn/ → API Keys
   - Eski key'i devre dışı bırakın
   - Yeni key oluşturun

---

## 🧪 Test Senaryoları

### Test 1: Basit Soru
```bash
curl -X POST "https://api.moonshot.cn/v1/chat/completions" \
  -H "Authorization: Bearer sk-YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kimi-k2.5",
    "messages": [{"role": "user", "content": "Merhaba!"}],
    "temperature": 0.7,
    "max_tokens": 1024
  }'
```

### Test 2: Kod Yazma
```bash
curl -X POST "https://api.moonshot.cn/v1/chat/completions" \
  -H "Authorization: Bearer sk-YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kimi-k2.5",
    "messages": [{"role": "user", "content": "Python\'da fibonacci fonksiyonu yaz"}],
    "temperature": 0.5,
    "max_tokens": 512
  }'
```

### Test 3: Chat History ile Konuşma
```bash
curl -X POST "https://api.moonshot.cn/v1/chat/completions" \
  -H "Authorization: Bearer sk-YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kimi-k2.5",
    "messages": [
      {"role": "system", "content": "Sen yardımcı bir AI asistanısın"},
      {"role": "user", "content": "Merhaba!"},
      {"role": "assistant", "content": "Merhaba! Size nasıl yardımcı olabilirim?"},
      {"role": "user", "content": "Python öğrenmek istiyorum"}
    ],
    "temperature": 0.7,
    "max_tokens": 2048
  }'
```

---

## 📊 Başarı Göstergeleri

- [x] Kimi K2.5 API backend'e entegre edildi
- [x] Fallback zinciri güncellendi
- [x] Test script'leri oluşturuldu
- [x] Environment variables konfigüre edildi
- [x] Dokümantasyon hazırlandı

---

## 🐛 Sorun Giderme

### ❌ "Invalid Authentication" Hatası
**Çözüm:**
- API Key'in doğru olup olmadığını kontrol edin
- https://platform.moonshot.cn/ adresinden yeni key oluşturun
- `.env.local` dosyasını güncelleyin

### ❌ "Model not found" Hatası
**Çözüm:**
- `kimi-k2.5` model isminin doğru olduğunu kontrol edin
- Moonshot docs'tan model ismini doğrulayın

### ❌ Network/Timeout Hatası
**Çözüm:**
- İnternet bağlantısını kontrol edin
- API endpoint'e ping'leyin: `curl https://api.moonshot.cn/v1`

### ❌ Rate Limiting
**Çözüm:**
- Fallback mekanizması devreye girer
- Request aralıklarını artırın

---

## 📚 Yararlı Kaynaklar

- **Kimi API Docs**: https://platform.moonshot.cn/docs
- **OpenAI API Format**: https://platform.openai.com/docs/api-reference
- **Node.js OpenAI Client**: https://github.com/openai/node-sdk

---

## 📞 Destek

Eğer sorun yaşarsanız:
1. Test dosyalarını çalıştırın (`test-kimi-k2.5.sh` / `test-kimi-k2.5.js`)
2. API key'i doğrulayın
3. Console log'larını kontrol edin
4. Kimi Platform docs'unu inceleyin

---

**Son Güncelleme:** 13 Mayıs 2026  
**Status:** ✅ Hazır - Kimi K2.5 Ana Model Olarak Aktif
