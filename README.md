# LifeCoach AI · HAN 4.2 Ultra Core

> **GitHub Açıklaması (kısa):**  
> Derin öğrenme tabanlı kişisel yaşam koçu. DeepSeek, Gemini ve Hugging Face (açık kaynak modeller) ile hedef planlama, alışkanlık takibi ve oyunlaştırılmış AI sohbet deneyimi.

---

**LifeCoach AI**, hedeflerine ulaşmanı, kararlar vermeni ve potansiyelini optimize etmeni sağlayan yapay zeka destekli bir yaşam koçu platformudur. ChatGPT/Gemini tarzı modern sohbet arayüzü, oyunlaştırma (XP, seviye, kasa açma) ve çoklu AI model desteğiyle kişiselleştirilmiş koçluk sunar.

**Geliştirici:** Metehan Haydar Erbaş

---

## Yapay Zeka Modelleri

Platform, görev tipine göre birden fazla modeli akıllı fallback zinciriyle kullanır:

| Model | Rol | Kullanım Alanı |
|-------|-----|----------------|
| **DeepSeek** | Ana sohbet motoru | `deepseek-chat`, `deepseek-coder` — günlük koçluk, hedef analizi, kod desteği |
| **Gemini** | Google AI entegrasyonu | `gemini-2.0-flash` — akıllı hedefler, ilerleme paneli, çoklu API key yedeklemesi |
| **Hugging Face** | Açık kaynak modeller | Llama, FLUX, LTX-Video vb. — Waffle Studio (görsel/video), yedek inference |

### Fallback Sırası (Sohbet API)
1. **Hugging Face** — açık kaynak modeller (`HF_TOKEN`)
2. **DeepSeek** — birincil üretim modeli (`DEEPSEEK_API_KEY`)
3. **Gemini** — yedek ve özelleşmiş görevler (`GEMINI_API_KEY`)
4. **OpenRouter** — ek model havuzu (opsiyonel)

---

## Temel Özellikler

- **HAN AI Sohbet Arayüzü** — Karanlık tema, glassmorphism, responsive mobil uyum
- **Oyunlaştırma** — XP, seviye, sıralama, kasa açma (HAN Coin)
- **Hedef & Alışkanlık Yönetimi** — SMART hedefler, planlama, ilerleme takibi
- **Waffle Studio** — Hugging Face ile görsel ve video üretimi
- **HAN Vision** — Yüz/durum analizi (Python servisi)
- **HAN Code** — AI destekli kod stüdyosu
- **Life Automation** — Otomasyon iş akışları
- **Mobil Uygulama** — Capacitor ile Android / iOS desteği
- **Landing Page** — Dönüşüm odaklı modern SaaS açılış sayfası

---

## Teknoloji Stack'i

| Katman | Teknolojiler |
|--------|-------------|
| **Frontend** | Next.js 14, React 18, Tailwind CSS, Chakra UI |
| **Backend** | Next.js API Routes, Express (`index.js`), Prisma ORM |
| **Veritabanı** | PostgreSQL (Supabase uyumlu) |
| **Kimlik Doğrulama** | NextAuth.js |
| **AI SDK'lar** | `@google/generative-ai`, `openai` (DeepSeek), `@huggingface/inference` |
| **Depolama** | AWS S3, Supabase |
| **Mobil** | Capacitor 8 |
| **Diğer** | LangChain, Socket.io, Framer Motion |

---

## Proje Yapısı

```
LifeCoach-Cloude/
│
├── app/                          # Next.js App Router
│   ├── page.js                   # Ana landing page (/)
│   ├── chat/page.js              # HAN AI sohbet arayüzü (/chat)
│   ├── login/                    # Giriş sayfası
│   ├── signup/                   # Kayıt sayfası
│   ├── hancode/                  # HAN Code IDE sayfası
│   ├── app/                      # Yönetim paneli (chatbot, datasource, sosyal)
│   ├── globals.css               # Global stiller + Tailwind
│   └── layout.js                 # Root layout
│
├── components/
│   ├── landing/                  # Landing page bileşenleri
│   │   ├── LandingPage.jsx       # Ana orchestrator
│   │   ├── HeroSection.jsx       # Hero + CTA
│   │   ├── ProductMockup.jsx       # Ürün önizleme mockup'ı
│   │   ├── BetaBanner.jsx        # Beta erişim bandı
│   │   ├── FeaturesSection.jsx   # "Neden HAN AI?" kartları
│   │   ├── StepsSection.jsx      # 3 adımda başarı
│   │   ├── TestimonialsSection.jsx # Kullanıcı yorumları
│   │   └── ...
│   │
│   ├── chat/                     # Sohbet arayüzü bileşenleri
│   │   ├── ChatSidebar.jsx       # Sol menü + sohbet geçmişi
│   │   ├── ChatInput.jsx         # Prompt giriş kutusu
│   │   ├── ChatHeader.jsx        # Üst navigasyon
│   │   ├── ChatMessages.jsx      # Mesaj listesi
│   │   ├── LootBox.jsx           # Kasa açma (gamification)
│   │   ├── Leaderboard.jsx       # Sıralama tablosu
│   │   ├── WaffleStudio.jsx      # Görsel/video stüdyosu
│   │   ├── AutomationWorkbench.jsx # Life Automation
│   │   ├── HANVision.jsx         # Biyometrik görü analizi
│   │   └── ui/                   # WelcomeScreen, GamificationPanel vb.
│   │
│   ├── ChatbotInterface.jsx      # Ana sohbet container
│   └── HanCodeStudio.jsx         # Kod editörü arayüzü
│
├── pages/api/                    # REST API endpoints
│   ├── chat.js                   # Ana sohbet API (DeepSeek/Gemini/HF)
│   ├── gamification/             # XP, seviye, kasa sistemi
│   ├── goals.js                  # Hedef yönetimi
│   ├── habits.js                 # Alışkanlık takibi
│   ├── smart-goals.js            # Gemini ile akıllı hedefler
│   ├── waffle.js                 # Waffle Studio API
│   ├── hancode.js                # HAN Code API
│   ├── auth/                     # NextAuth endpoints
│   └── ...
│
├── lib/                          # Paylaşılan kütüphaneler
│   ├── gemini-multi-api.js       # Gemini + OpenRouter çoklu key
│   ├── waffle-hf.js              # Hugging Face Waffle entegrasyonu
│   ├── gamification.js         # Oyunlaştırma mantığı
│   ├── prisma.js                 # Prisma client
│   └── db.js                     # Veritabanı yardımcıları
│
├── prisma/
│   └── schema.prisma             # Veritabanı şeması (User, Chat, XP, vb.)
│
├── public/                       # Statik dosyalar, PWA, service worker
├── android/ · ios/               # Capacitor mobil projeleri
├── python_services/              # HAN Vision Python API
├── docs/                         # Kurulum ve özellik dokümantasyonu
└── services/                     # Ek servisler (han_vision_api.py)
```

---

## Hızlı Başlangıç

### Gereksinimler
- Node.js 18+
- PostgreSQL veritabanı
- API anahtarları (en az biri): `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `HF_TOKEN`

### Kurulum

```bash
# Repoyu klonla
git clone https://github.com/KULLANICI_ADIN/LifeCoach-Cloude.git
cd LifeCoach-Cloude

# Bağımlılıkları yükle
npm install

# Ortam değişkenlerini ayarla
cp .env.example .env.local
# .env.local dosyasını düzenle

# Veritabanını hazırla
npx prisma generate
npx prisma db push

# Geliştirme sunucusunu başlat
npm run dev
```

Uygulama: **http://localhost:3000**  
Sohbet arayüzü: **http://localhost:3000/chat**

### Ortam Değişkenleri

```env
# Veritabanı
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# AI Modelleri
DEEPSEEK_API_KEY="sk-..."          # Ana sohbet motoru
DEEPSEEK_MODEL="deepseek-chat"
GEMINI_API_KEY="..."               # Gemini yedek / özelleşmiş görevler
GEMINI_MODEL="gemini-2.0-flash"
HF_TOKEN="hf_..."                  # Hugging Face açık kaynak modeller
HF_PROVIDER="auto"

# Kimlik Doğrulama
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Opsiyonel
OPENROUTER_API_KEY="..."
SUPABASE_URL="..."
AWS_S3_*="..."
```

---

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Production build |
| `npm run start` | Express production sunucusu |
| `npm run start:next` | Next.js production sunucusu |
| `npm run lint` | ESLint kontrolü |
| `npm run mobile:sync` | Capacitor senkronizasyonu |
| `npm run mobile:open:android` | Android Studio aç |
| `npm run mobile:open:ios` | Xcode aç |

---

## API Özeti

| Endpoint | Açıklama |
|----------|----------|
| `POST /api/chat` | Ana sohbet — DeepSeek → Gemini → HF fallback |
| `GET /api/gamification` | Kullanıcı XP, seviye, coin |
| `POST /api/gamification/open-box` | Kasa açma |
| `GET/POST /api/goals` | Hedef CRUD |
| `POST /api/smart-goals` | Gemini ile akıllı hedef üretimi |
| `POST /api/waffle` | Hugging Face görsel/video üretimi |
| `POST /api/hancode` | AI kod asistanı |

---

## Dokümantasyon

Detaylı kurulum ve özellik rehberleri `docs/` klasöründe:

- `docs/SUPABASE_SETUP.md` — Veritabanı kurulumu
- `docs/GOOGLE_AUTH_SETUP.md` — Google OAuth
- `docs/HANCODE_SETUP.md` — HAN Code kurulumu
- `docs/DEPLOYMENT_CHECKLIST.md` — Deploy kontrol listesi
- `docs/QUICK_START_XP_SYSTEM.md` — Oyunlaştırma sistemi

---

## Lisans

Bu proje [LICENSE](LICENSE) dosyasındaki lisans koşullarına tabidir.

---

<p align="center">
  <strong>LifeCoach AI</strong> — Cebindeki derin öğrenme tabanlı yaşam koçu.<br>
  Powered by <strong>DeepSeek</strong> · <strong>Gemini</strong> · <strong>Hugging Face</strong>
</p>
