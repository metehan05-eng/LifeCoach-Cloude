# 🎨 LifeCoach AI - Gelişmiş Tema Özelleştirme Sistemi

## 📋 Genel Bakış

Tema sistemi kullanıcıların uygulamanın tamamını istediği şekilde özelleştirebilmesine olanak tanır. Hazır temalar veya tamamen custom renk kombinasyonları seçebilirler.

## ✨ Özellikler

### 1. **7 Hazır Tema**
- ⚡ **Neon Lights** - Parlak, enerjik neon renkler
- 🌊 **Ocean Breeze** - Sakin mavi ve turkuaz tonları
- 🌲 **Forest Green** - Doğal yeşil tonları
- 🌅 **Sunset Vibes** - Turuncu ve sıcak renkler
- 🤖 **Cyberpunk** - Futuristik pembe ve mavi
- 💜 **Lavender Dream** - Lila ve mor tonları
- 🍵 **Matcha Tea** - Zarif yeşil ve beyaz
- 🔷 **Default Teal** - Orijinal LifeCoach mavisi

### 2. **Tamamen Özelleştirilebilir**
- Ana renkler (Primary, Secondary, Accent)
- Arka plan gradyanları
- Metin renkleri
- Yüzey renkler
- Buton stilleri
- Tüm UI elemanları

### 3. **Canlı Ön İzleme**
- Renk değişiklikleri anında yansır
- Preview paneli ile sonuçları görün
- Gerçek zamanlı güncelleme

### 4. **LocalStorage'a Otomatik Kaydetme**
- Temalar kaydedilir ve kalıcı olur
- Sayfa yenilediğinde tema devam eder
- Tamamen istemci taraflı (server istemiyor)

## 🚀 Nasıl Kullanılacağı

### Tema Modal'ı Açma

**1. Üst Menüde Buton Tıkla**
   - Profil alanında 🎨 (Palette) ikonuna tıkla
   - Tema modal'ı açılacak

**2. Keyboard Kısayolu (Gelecek)**
   - Ctrl+T (coming soon)

### Hazır Temayı Seçme

```
1. Tema Modal'ı aç
2. "Hazır Temalar" bölümünde istediğin temayı seç
3. Renğizleri hemen görü (ön izleme alanında)
4. "Hazır" butonuna tıkla
```

### Özel Renk Seçimi

```
1. Tema Modal'ı aç
2. "Renkler" bölümünde istediğin rengi seç
3. Renk picker'da renk belirle veya HEX kodu gir
4. Değişiklikler anında yansır
5. Tüm istenilen renkleri değiştir
6. "Hazır" butonuna tıkla
```

### Tema İndirme (Yedekleme)

```
1. Tema özelleştirmesini tamamla
2. "📤 İndir" butonuna tıkla
3. JSON dosyası indirilir
4. Başka cihazlarda kullanmak için saklayın
```

### Temayı Sıfırlama

```
1. Tema Modal'ı aç
2. "↺ Sıfırla" butonuna tıkla
3. Onay ekranında "Evet" seç
4. Tema varsayılana sıfırlanır
```

## 🎯 Renk Özelleştirme Seçenekleri

| Renk | Kullanıldığı Yer | Örnek |
|------|-----------------|-------|
| **Primary** | Butonlar, Linkler, Başlıklar | Teal (#0F766E) |
| **Primary-Light** | Hover durumu | Açık Teal (#14B8A6) |
| **Primary-Dark** | Aktif durumu | Koyu Teal (#0D5E57) |
| **Secondary** | Vurgular, Badge'ler | Açık Cyan (#CCFBF1) |
| **Accent** | Özel elemanlar | Çok Açık (#F0FDFA) |
| **Neon-Teal** | Glowing efektler | Neon Teal (#2DD4BF) |
| **Neon-Cyan** | Animasyonlar | Neon Cyan (#22D3EE) |
| **Surface-Dark** | Kart arkaplanı | Koyu (#1E293B) |
| **Card-Dark** | Modal arkaplanı | Çok Koyu (#0F172A) |
| **Text** | Metin rengi | Açık Gri (#E2E8F0) |

## 📱 Responsive Tasarım

- Tema sistemi tüm cihazlarda çalışır
- Masaüstü: Tam özelleştirme kontrolleri
- Tablet: Kompakt görünüm
- Mobil: Sütun layout

## 💾 LocalStorage Formatı

```json
{
  "name": "neon",
  "custom": {
    "primary": "#00FF41",
    "accent": "#FF00FF"
  },
  "timestamp": "2026-04-09T15:30:00Z"
}
```

## 🔧 API & Fonksiyonlar

### JavaScript API

```javascript
// Tema yöneticisine erişim
ThemeManager

// Hazır temayı seç
ThemeManager.resetToPreset('ocean')

// Renk değiştir
ThemeManager.setColor('primary', '#FF0000')

// Mevcut renkleri al
const colors = ThemeManager.getCurrentColors()

// Temayı dışa aktar
const json = ThemeManager.exportTheme()

// Temayı içe aktar
ThemeManager.importTheme(jsonData)
```

### UI Fonksiyonları

```javascript
openThemeModal()              // Tema modal'ını aç
closeThemeModal()             // Kapat
selectPresetTheme('ocean')    // Hazır temayı seç
changeThemeColor('primary', '#FF0000')  // Renk değiştir
resetTheme()                  // Sıfırla
exportCurrentTheme()          // İndir
```

## 🎨 CSS Variables

Tüm renkler CSS variables olarak kullanılır:

```css
:root {
  --primary: #0F766E;
  --primary-light: #14B8A6;
  --neon-teal: #2DD4BF;
  /* ... diğer renkler ... */
}

/* Kullanım */
.button { background: var(--primary); }
.hover { color: var(--neon-cyan); }
```

## 📊 Tema Yönetim Sistemi Mimarisi

```
theme-manager.js
├── ThemeManager (Ana Yönetici)
├── Presets (7 hazır tema)
├── Current Theme (Aktif tema)
├── Custom Colors (Özel renkler)
└── LocalStorage

theme-ui.js
├── openThemeModal()
├── initThemeModal()
├── selectPresetTheme()
├── changeThemeColor()
├── resetTheme()
└── exportCurrentTheme()

life-coach-ui.html
├── Theme Modal UI
├── Preset Buttons
├── Color Picker Inputs
└── Preview Area
```

## 🚀 Gelecek İyileştirmeler

- [ ] Tema içe aktarma (JSON yükleme)
- [ ] Tema paylaşma (QR kod ile)
- [ ] Komünite temaları (trend temaları)
- [ ] Animasyon özelleştirmesi
- [ ] Font indisialisasyon
- [ ] Dark/Light mode toggle
- [ ] Otomatik tema değişimi (saate göre)
- [ ] Tema analitikleri

## 🐛 Sorun Giderme

### "Temam geri dönmüyor"
- Temaya ait localStorage silinmedi
- Tarayıcı konsoluna yazın: `localStorage.removeItem('life-coach-theme')`
- Sayfayı yenile

### "Renkler tüm yerde uygulanmıyor"
- Sayfayı hardrefresh yap (Ctrl+Shift+R)
- CSS cache'i temizle
- Theme Manager'ı reinitialize et: `ThemeManager.init()`

### "Renk picker çalışmıyor"
- Tarayıcı HTML5 color input'u destekliyor mu kontrol et
- Chrome, Firefox, Safari hepsi destekliyor

## 📞 İletişim & Destek

Herhangi bir sorun için iletişime geçin.

---

**Son Güncelleme**: 9 Nisan 2026
**Sürüm**: 1.0
**Durum**: ✅ Canlı
