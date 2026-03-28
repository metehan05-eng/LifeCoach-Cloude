# XP & Alev Seviyesi Sistemi - Tam Rehber

## 📊 Sistem Özeti

Uygulama artık **Experience Points (XP)** ve **Alev Seviyesi (Flame Level)** sistemine sahip:

- **XP**: Tüm aktiviteler için kazanılır (100 XP = 1 Level)
- **Alev Seviyesi**: Premium özellikleri (Waffle AI resim gibi) kullanmak için harcanır
- **Level**: Her 100 XP'de 1 level atlanır

## 🎮 Sistem Mimarisi

### Backend Endpoints

#### 1. `/api/user-stats`
Kullanıcının XP ve Alev Seviyesini yönetir.

**GET** - İstatistikleri al:
```javascript
const stats = await StatsService.getStats();
// Response: { xp: 250, flameLevel: 50, level: 3, history: [...] }
```

**POST** - Ödül ekle:
```javascript
const result = await StatsService.addReward('goal_daily');
// Günlük hedef tamamlandı: +5 XP, +5 Alev
```

**POST** - Alev harça (action='consume'):
```javascript
try {
    await StatsService.consumeFlame('waffle_ai_image');
    // Başarı: -10 Alev
} catch (error) {
    // "Yeterli alev seviyesi yok"
}
```

#### 2. `/api/waffle`
AI resim oluşturma (Alev harcaması ile).

**POST** - Resim oluştur:
```javascript
const result = await WaffleService.generateImage('açık plajda sunset', 'realistic');
// Maliyet: 10 Alev Seviyesi
```

**GET** - Oluşturulan resimleri al:
```javascript
const { generations, totalGenerated } = await WaffleService.getGenerations();
```

#### 3. `/api/task-breakdown`
7/14/30/90 günlük plan parçaları.

**POST** - Yeni plan oluştur:
```javascript
const plan = await TaskBreakdownService.create('Kitap Oku', 30, 'Ayın başında başla');
```

**PUT** - Planı tamamla (action='complete'):
```javascript
// 30 günlük plan: +15 XP, +12 Alev
```

## 💰 Ödül Tablosu

### Hedefler (Goals)
| Tip | XP | Alev |
|-----|-----|------|
| Günlük | +5 | +5 |
| Haftalık | +20 | +20 |
| Aylık | +50 | +50 |
| Yıllık | +50 | +20 |

### Alışkanlıklar (Habits)
| Koşul | XP | Alev |
|-------|-----|------|
| Günlük hedef tutturuldu | +5 | +5 |

### Odaklanma (Focus)
| Koşul | XP | Alev |
|-------|-----|------|
| Seansı Bitir | +10 | +5 |

### Yansıma & Günlük (Reflections/Journal)
| Koşul | XP | Alev |
|-------|-----|------|
| Yansıma yazılı | +5 | +10 |
| Günlük yazılı | +5 | +10 |

### Planlar (Plans)
| Tip | XP | Alev |
|-----|-----|------|
| Günlük Plan | +10 | +10 |
| Haftalık Plan | +15 | +15 |
| Aylık Plan | +25 | +25 |
| Proje Plan | +500 | +100 |

### Görev Parçalama (Task Breakdown)
| Gün | XP | Alev |
|-----|-----|------|
| 7 Günlük | +7 | +3 |
| 14 Günlük | +10 | +7 |
| 30 Günlük | +15 | +12 |
| 90 Günlük | +40 | +20 |

### Alev Harcaması
| Özellik | Alev |
|---------|-------|
| Waffle (AI Resim) | -10 |

## 🎨 Frontend Entegrasyonu

### Dashboard Göstergesi
Ana sayfa (Panel) artık şunları gösteriyor:
- 📊 **Level**: Mevcut seviye (100 XP = 1 level)
- 💎 **XP**: Toplam Experience Points
- 🔥 **Alev Seviyesi**: Waffle ve premium özellikler için
- İlerleme çubuğu: Bir sonraki level'e kaç XP kaldığını gösterir

### Değişiklikler
```javascript
// 1. lifeCoachServices.js - StatsService
- await StatsService.getStats()       // XP ve Alev getir
- await StatsService.addReward(type)  // Ödül ekle
- await StatsService.consumeFlame(type) // Alev harça

// 2. lifeCoachServices.js - Reward Notifications
- showRewardNotification(xp, flame, type) // Bildirim göster
- updateStatsDisplay()  // Dashboard'u güncelle

// 3. life-coach-ui.html - DashboardStats React Bileşeni
- XP progress barı gösterir
- Level bilgisi
- Flame level göstergesi
```

## 🔧 Kodlama Örnekleri

### Hedef Tamamlandığında Ödül Alma
```javascript
// /pages/api/goals.js içinde otomatik çalışır
if (status === 'completed' && !wasCompleted) {
    // Ödül hesaplanır ve verilir
    // Kullanıcı arayüzünde gösterilir
}
```

### Alevi Harcama (Waffle Kullanımı)
```javascript
async function generateWaffleImage() {
    try {
        const result = await WaffleService.generateImage(prompt, style);
        showRewardNotification(0, -10, 'waffle');
        updateStatsDisplay();
    } catch (error) {
        showToast(error.message); // "Yeterli alev seviyesi yok"
    }
}
```

### Custom Ödül Ekleme
```javascript
// Herhangi bir yerden ödül vermek için:
async function customReward() {
    const stats = await StatsService.addReward('goal_daily');
    showRewardNotification(stats.xp, stats.flameLevel, 'custom');
    updateStatsDisplay();
}
```

## 📱 Kullanıcı Akışı

### Aktivite Tamamlanız:
1. Kullanıcı hedef tamamlar (örn: "Günlük hedef")
2. Backend ödülü hesaplar (+5 XP, +5 Alev)
3. Frontend bildirim gösterir: "🎯 Günlük Hedef Tamamlandı! +5 XP +5 🔥"
4. Dashboard otomatik güncellenir
5. Yeni level'e ulaşırsa progress bar animasyon gösterir

### Waffle Kullanımı (Premium):
1. Kullanıcı "Waffle" bölümüne gider
2. AI prompt yazıp "Resim Oluştur" butonuna basar
3. Check yapılır: Alev >= 10 mu?
4. Evet: Resim oluşturma başlar, -10 Alev harcanır
5. Hayır: Hata mesajı: "Yeterli alev seviyesi yok (Gerekli: 10, Mevcut: 5)"

## 🔐 Güvenlik & Doğrulama

### Token vs Session ID
```javascript
// Premium kullanıcı (token ile)
const userId = user.id;

// Ücretsiz kullanıcı (session-id ile)
const userId = req.headers['x-session-id'];
```

### XP Doğrulama
- Aynı aktivite iki kez ödül vermez
- `completedAt` timestamp ile kontrol ediliyor
- Replayattack'tan korunmuş

## 🚀 Deployment

```bash
# Değişiklikleri push etmek için:
./github_yukle.sh

# Cache temizlemek için (Ctrl+Shift+R):
# Browser'de hard refresh yapın
```

## 📝 Testeri Adımları

1. **Dashboard'da Level Görmek**
   - Giriş yap
   - Ana sayfa (Panel) aç
   - Level-XP-Alev göstergesini kontrol et

2. **Hedef Tamamlayarak Ödül Almak**
   - Hedefler bölümüne git
   - Yeni hedef oluştur (Günlük)
   - Hedefi %100 tamamla
   - Ödül bildirimi görmelisin (+5 XP, +5 Alev)

3. **Waffle Deneme**
   - Waffle bölümüne git (henüz uygulanmamış olabilir)
   - Yeterli alev yoksa hata mesajı göreceksin

## 🐛 Sorun Giderme

### Problem: Stats güncellenmiyor
```javascript
// Çözüm: Hard refresh yap
// Ctrl+Shift+R (Windows/Linux)
// Cmd+Shift+R (Mac)
// veya
localStorage.clear(); // İstememen tavsiye edilmez
```

### Problem: "Token gerekli" hatası
```javascript
// Kontrol etmek:
- Login yapmış mısın?
- Token localStorage'de var mı?
- DevTools Console'dan: console.log(localStorage.getItem('token'))
```

### Problem: Alev harcanmıyor
```javascript
// Stats.flameLevelı kontrol et
// Consumer işlem başarısız mı?
// Try-catch error'ü console'a bak
```

## 📊 Database Yapısı

### `user-stats` Collection
```javascript
{
  userId: "user_123",
  xp: 250,
  flameLevel: 75,
  level: 3,
  history: [
    {
      type: "goal_daily",
      xp: 5,
      flame: 5,
      timestamp: "2024-03-28T10:30:00Z"
    },
    // ...
  ]
}
```

### `waffle-generations` Collection
```javascript
{
  userId: "user_123",
  generations: [
    {
      id: "1711602600000",
      prompt: "açık plajda sunset",
      style: "realistic",
      flameCost: 10,
      status: "pending",
      imageUrl: null,
      createdAt: "2024-03-28T10:30:00Z"
    }
  ]
}
```

### `task-breakdowns` Collection
```javascript
{
  userId: "user_123",
  id: "1711602600000",
  title: "Kitap Oku",
  days: 30,
  status: "in-progress",
  progress: 45,
  tasks: [...],
  createdAt: "2024-03-28T10:30:00Z"
}
```

---

**Son Güncelleme:** 28 Mart 2024  
**Sistem Durumu:** ✅ Aktif ve Çalışır  
**Test Hazırlığı:** ✅ Hazır
