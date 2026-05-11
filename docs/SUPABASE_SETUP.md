# 🔐 Supabase Environment Variables Kurulumu

## Adım 1: Supabase Dashboard'dan Keyleri Kopyala

### A. Supabase URL ve Keys
1. [Supabase Dashboard](https://app.supabase.com) aç
2. Projenize git
3. **Settings** → **API** menüsüne git
4. Bu değerleri kopyala:
   - **Project URL** → `SUPABASE_URL`
   - **Project API keys** kısmında:
     - **anon public** → `SUPABASE_ANON_KEY` ve `SUPABASE_KEY`
     - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### B. Örnek Format:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc... (public key)
SUPABASE_KEY=eyJhbGc... (public key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (secret key)
```

## Adım 2: Vercel Environment Variables Kontrol

1. [Vercel Dashboard](https://vercel.com) aç
2. Projenize git
3. **Settings** → **Environment Variables**
4. Şu keyleri kontrol et:
   - ✅ `SUPABASE_URL`
   - ✅ `SUPABASE_KEY` (ya da `SUPABASE_ANON_KEY`)
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`
   - ✅ `GEMINI_API_KEY` (AI chat için)
   - ✅ `JWT_SECRET`

## Adım 3: Supabase Veritabanı Tablosu Kontrolü

### Gerekli Tablo: `kv_store`

```sql
CREATE TABLE kv_store (
    key TEXT PRIMARY KEY,
    value JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policy (Public erişim - geliştirme ortamı için)
ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to kv_store" ON kv_store
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert to kv_store" ON kv_store
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to kv_store" ON kv_store
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete to kv_store" ON kv_store
    FOR DELETE USING (true);
```

**NOT:** Üretim ortamında güvenlik politikasını katılaştırın!

## Adım 4: Lokal Geliştirme için .env.local

`.env.local` dosyasını düzenle:

```bash
# Development
NODE_ENV="development"

# Supabase (Supabase.local Geliştirme için)
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_ANON_KEY="YOUR_PUBLIC_KEY"
SUPABASE_KEY="YOUR_PUBLIC_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SECRET_KEY"

# AI
GEMINI_API_KEY="your-key"
JWT_SECRET="random-secret-here"
```

## Durum Kontrolü

Şu bu hata alıyorsan:
- ❌ `supabaseUrl is required` → Keyleri .env.local'a ekle
- ❌ `Could not find the table kv_store` → SQL yukarıdaki tabloyu çalıştır
- ❌ `row-level security` → RLS politikasını kontrol et
- ✅ `Sunucu çalışıyor` → Tamam başarılı!

## Vercel Deploy Sonrası Test

```bash
# 1. Vercel keyleri kontrol et
vercel env list

# 2. Supabase bağlantısını test et
curl https://your-domain.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","name":"Test"}'
```

---
🎯 **Tüm adımları yaptıktan sonra:** Sunucu yeniden başlat
