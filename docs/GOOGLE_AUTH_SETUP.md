# 🔐 Google OAuth Setup Guide

## Step 1: Google Cloud Console'da OAuth Credentials Oluştur

1. [Google Cloud Console](https://console.cloud.google.com/) aç
2. **Proje seç** → Yeni proje oluştur (adı: "LifeCoach")
3. Sol menüde **APIs & Services** → **Credentials** git
4. **+ Create Credentials** → **OAuth 2.0 Client IDs** seç
5. **Application type**: Web application seç
6. **Authorized redirect URIs** ekle:
   ```
   http://localhost:3000/api/auth/callback/google (local dev)
   http://localhost:3004/api/auth/callback/google (local dev)
   https://your-domain.vercel.app/api/auth/callback/google (production)
   ```
7. **Create** tıkla
8. **Client ID** ve **Client Secret**'i kopyala

---

## Step 2: .env.local'a Güncelle

```bash
# .env.local (lokal geliştirme için)
GOOGLE_CLIENT_ID="YOUR_CLIENT_ID_HERE"
GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET_HERE"
```

## Step 3: Vercel'de Ekle

1. [Vercel Dashboard](https://vercel.com/) → Projen → Settings
2. **Environment Variables** git
3. Şu keyleri ekle:
   ```
   GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
   GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
   ```
4. **Save** tıkla

---

## Step 4: Test Et

Lokal olarak:
```bash
npm start
# http://localhost:3004/login git
# "Google ile Giriş Yap" butonu görünmeli
```

Vercel'de (deployment sonrası):
```bash
# https://your-domain.vercel.app/login git
# Google butonu görünmeli
```

---

## 🔍 Troubleshooting

### ❌ "Google butonu görünmüyor"
→ Kontrol et: `/api/config` endpoint'inde `googleClientId` return ediliyor mi?
```bash
curl http://localhost:3004/api/config | jq .googleClientId
```

### ❌ "Error: redirect_uri_mismatch"
→ OAuth URL'i Google Cloud Console'da kayıtlı mı? 
→ Exactly eşleşmeli (http vs https, www vs no-www)

### ❌ "Google giriş yapıldı ama user kaydedilmiyor"
→ Supabase `users` tablosu var mı? (Kontrol et: SETUP_SUPABASE.md)

---

## Başarılı Google OAuth Akışı

1. "Google ile Giriş Yap" tıkla
2. Google popup açılacak
3. Google hesabını seç
4. `/api/auth/google` endpoint'i ID token doğrula
5. JWT token geri dön
6. Kullanıcı oturumunu kur
7. Dashboard'a git

---

## Google Credentials Nereden Alınır?

| Portal | Link |
|--------|------|
| **Google Cloud Console** | https://console.cloud.google.com/ |
| **OAuth Consent Screen** | https://console.cloud.google.com/apis/consent |
| **Test Users** (sandbox mode) | https://console.cloud.google.com/apis/credentials/consent |

---

## 📝 Full Checklist

- [ ] Google Cloud Project oluşturdum
- [ ] OAuth 2.0 Client ID oluşturdum  
- [ ] Client ID ve Secret'i aldım
- [ ] `.env.local`'a ekledim
- [ ] Vercel'de Environment Vars set ettim
- [ ] Redirect URI'si doğru (http://localhost vs https://domain)
- [ ] npm start ile lokal test ettim
- [ ] "Google ile Giriş Yap" butonu gözüküyor
