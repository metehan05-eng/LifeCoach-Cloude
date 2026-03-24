# Supabase Kurulum Rehberi

## 📋 Adım Adım Kurulum

### 1. Supabase Projesi Oluşturun
1. [supabase.com](https://supabase.com) adresine gidin
2. Yeni bir proje oluşturun
3. Proje URL ve API anahtarlarını kopyalayın

### 2. Ortam Değişkenlerini Ayarlayın
`.env.local` dosyasına Supabase bilgilerinizi ekleyin:

```env
# Supabase (Veritabanı için)
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

### 3. Veritabanı Schema'sını Oluşturun
1. Supabase Dashboard'a gidin
2. "SQL Editor" sekmesine tıklayın
3. `supabase-schema.sql` dosyasının içeriğini yapıştırın
4. "Run" butonuna basın

### 4. Authentication Ayarları
1. Supabase Dashboard'da "Authentication" sekmesine gidin
2. "Settings" altında "Site URL" olarak domain'inizi ekleyin:
   - `https://han-ai.dev`
   - `http://localhost:3000` (local development için)

### 5. Row Level Security (RLS)
Schema zaten RLS politikaları içerir. Kullanıcılar sadece kendi verilerini görebilir.

## 🎯 AI Arena Özellikleri

### API Endpoint'leri:
- `GET /api/arena/user-stats` - Kullanıcı istatistikleri
- `POST /api/arena/update-xp` - XP güncelleme
- `GET /api/arena/leaderboard` - Liderlik tablosu
- `GET /api/arena/challenges` - Seviyeye göre meydan okumalar

### Veri Akışı:
1. Kullanıcı giriş yapar
2. XP kazanıldığında hem localStorage hem Supabase'e yazılır
3. Liderlik tablosu kullanıcı seviyesine göre filtrelenir
4. Meydan okumalar seviyeye göre ölçeklenir

## 🚀 Deploy Sonrası

### Vercel Ortam Değişkenleri:
Vercel Dashboard'da Environment Variables sekmesine Supabase anahtarlarını ekleyin.

### Test:
```bash
# API test
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://han-ai.dev/api/arena/user-stats
```

## 📊 Tablolar

### user_stats
- Kullanıcı XP, seviye, arena istatistikleri
- Otomatik oluşturulur

### xp_history
- XP kazanım geçmişi
- Tüm işlemler kaydedilir

### arena_challenges
- Kullanıcı meydan okumaları
- İlerleme takibi

### arena_matches
- Arena maçları
- PvP, AI karşılaşmaları

### user_badges
- Kazanılan rozetler
- Başarı sistemi

## 🔧 Ayarlar

### Level Sistemi:
- Her 100 XP'de 1 level
- Level'e göre içerik filtreleme
- Meydan okuma zorluğu

### Liderlik Tablosu:
- Kullanıcı seviyesine göre filtreleme (±5 level)
- Gerçek zamanlı güncelleme
- Win rate hesaplama

## ⚡ Performans

### Index'ler:
- `user_id`, `level`, `total_xp` için index'ler
- Hızlı sorgulama

### Cache:
- Frontend tarafında localStorage
- API tarafında veri önbellekleme

## 🛠️ Troubleshooting

### Hata: "Veritabanı hatası"
- Supabase URL ve anahtarlarının doğru olduğundan emin olun
- RLS politikalarının aktif olduğundan emin olun

### Hata: "İstatistikler alınamadı"
- Kullanıcının giriş yapmış olması gerekir
- `user_stats` tablosunun oluşturulduğundan emin olun

### Hata: "XP güncellenemedi"
- Service Role Key'in doğru olduğundan emin olun
- Kullanıcı ID'sinin geçerli olduğundan emin olun
