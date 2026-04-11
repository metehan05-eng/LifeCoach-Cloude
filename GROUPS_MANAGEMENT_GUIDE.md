# 👥 LifeCoach AI - Çalışma Grupları Yönetim Sistemi

## 📋 Genel Bakış

Çalışma Grupları, aynı hedefler ve motivasyonu paylaşan kullanıcıların beraber öğrenebileceği ve ilerleme yapabileceği bir sosyal özelliktir.

## 🎯 Uygulanan Özellikler

### ✅ Frontend (UI/UX)
- **Grup Oluşturma**: Yeni grup açma modalı
- **Grup Listesi**: Katılabileceğiniz grupları görüntüleme
- **Grup Detayları**: Grup hakkında detaylı bilgi sayfası
- **Grup Chat**: Grup içi gerçek zamanlı mesajlaşma
- **Üye Yönetimi**: Grup üyelerini görüntüleme ve yönetme
- **Grup Ayarları**: Sadece sahibi tarafından düzenlenebilir

### ✅ Backend (API)
- **GET /api/social?type=groups** - Kullanıcının gruplarını listele
- **GET /api/social?type=groups&id=groupId** - Grup detaylarını getir
- **POST /api/social?type=groups** - Yeni grup oluştur
- **POST /api/social?type=groups&action=join** - Gruba katıl
- **PUT /api/social?type=groups&id=groupId** - Grup bilgilerini düzenle
- **DELETE /api/social?type=groups&id=groupId** - Grubu sil
- **POST /api/social?type=groups&id=groupId&action=message** - Grup mesajı gönder
- **GET /api/social?type=groups&id=groupId&action=messages** - Grup mesajlarını getir
- **PATCH /api/social?type=groups&id=groupId&action=removeMember** - Üyeyi çıkar
- **POST /api/social?type=groups&id=groupId&action=leave** - Gruptan çık

### ✅ Partner Sistemi
- **POST /api/social?type=partners** - Hesap verme partneri ekle
- **GET /api/social?type=partners** - Partnerları listele

## 📁 Dosya Yapısı

```
/public/
├── life-coach-ui.html           # Ana UI (güncellendi)
├── group-manager.js             # Grup yönetim fonksiyonları (YENİ)
└── lifeCoachServices.js         # Hizmetler (var)

/pages/api/
└── social.js                    # Sosyal API endpoints (GÜNCELLENDİ)
```

## 🔧 Nasıl Kullanılacağı

### 1. Grup Oluşturma
```javascript
// UI'da "Yeni Grup Oluştur" butonuna tıkla
// Modal açılıp aşağıdaki bilgileri gir:
- Grup Adı: "Yazı Sınavı Grubu"
- Açıklama: "Yazı sınavına 5 gün kaldı, beraber çalışalım"
- Konu: "Yazı" (ya da diğer konular)
- Halka Açık: ✓ (veya özel)
```

### 2. Gruba Katılma
```javascript
// Grup listesinden "Katıl →" butonuna tıkla
// Grup otomatik olarak katılım listesine eklenir
```

### 3. Grup Detaylarına Erişim
```javascript
// Grup kartına tıklandığında otomatik açılır
// Üç sekme bulunur:
  - 💬 Sohbet: Grup üyeleriyle mesajlaş
  - 👥 Üyeler: Grup üyelerini görebil
  - ⚙️ Ayarlar: (Sadece sahibi için) Ayarları düzenle
```

### 4. Mesaj Gönderme
```javascript
// Chat sekmesinde mesaj input'una yazı yaz
// "Gönder" butonuna tıkla veya Enter bas
// Mesaj anında görünür (socket.io eklenmeden basit versiyon)
```

### 5. Grup Ayarlarını Düzenleme (Sahibi için)
```javascript
// Ayarlar sekmesine git
// Grup adı, açıklama, konu ve gizlilik ayarlarını değiştir
// "Kaydet" butonuna tıkla
```

### 6. Üye Silme (Sahibi için)
```javascript
// Üyeler sekmesinde üyenin yanındaki çöp simgesine tıkla
// Onay ekranında "Evet" seç
```

### 7. Gruptan Çıkma
```javascript
// Sağ üstteki "🚪 Çık" butonuna tıkla
// Onay ekranında "Evet" seç
```

### 8. Grubu Silme (Sahibi için)
```javascript
// Ayarlar sekmesinde "🗑️ Grubu Sil" butonuna tıkla
// Onay ekranında "Evet" seç
// Grup ve tüm mesajları kalıcı olarak silinir
```

## 🔐 Güvenlik & Yetkilendirme

- **Kimlik Doğrulama**: Tüm işlemler JWT token gerektir
- **Sahibi Kontrolleri**: Yalnızca grup sahibi ayarları değiştirebilir ve grubu silebilir
- **Üye Kontrolleri**: Üyeler kendi kendilerini çıkabilir veya sahibi tarafından çıkarılabilir
- **Mesaj Gizliliği**: Grup üyeleri dışındaki kişiler mesajları göremez

## 📊 Veri Yapısı

### Grup Nesnesi
```javascript
{
  id: "a1b2c3d4e5",
  name: "Yazı Sınavı Grubu",
  description: "Yazı sınavına 5 gün kaldı, beraber çalışalım",
  subject: "Yazı",
  ownerId: "user123",
  members: ["user123", "user456", "user789"],
  createdAt: "2026-04-09T10:30:00Z",
  updatedAt: "2026-04-09T14:20:00Z",
  isPublic: true,
  totalMembers: 3
}
```

### Mesaj Nesnesi
```javascript
{
  id: "msg123",
  senderId: "user456",
  content: "Merhaba grup! Kimse yazı konusundan sorular soruyor mu?",
  messageType: "text",
  timestamp: "2026-04-09T14:25:00Z",
  reactions: {}
}
```

## 🔄 API İstek Örnekleri

### Grup Oluştur
```bash
curl -X POST http://localhost:3000/api/social?type=groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Yazı Sınavı Grubu",
    "description": "5 gün kaldı",
    "subject": "Yazı",
    "isPublic": true
  }'
```

### Mesaj Gönder
```bash
curl -X POST http://localhost:3000/api/social?type=groups&id=a1b2c3d4e5&action=message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "Merhaba arkadaşlar!"
  }'
```

### Gruptan Çık
```bash
curl -X POST http://localhost:3000/api/social?type=groups&id=a1b2c3d4e5&action=leave \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚀 Gelecek İyileştirmeler

- [ ] Socket.io ile gerçek zamanlı chat
- [ ] Dosya/görsel paylaşımı
- [ ] Grup takvimi ve etkinlikleri
- [ ] Grup leaderboard'u
- [ ] Sesli/görüntülü çağrılar
- [ ] Grup kurallı şablonları
- [ ] Böt entegrasyonu
- [ ] Grup istatistikleri ve raporları

## 🐛 Sorun Giderme

### "Grup oluşturulamadı" hatası
- Token'ın geçerli olduğunu kontrol et
- Tüm gerekli alanları doldur (ad, açıklama, konu)
- Tarayıcı konsolunda hata mesajını kontrol et

### Mesajlar gösterilmiyor
- Sayfayı yenile
- Chat sekmesinde olduğundan emin ol
- Token geçerliliğini kontrol et

### Ayarlar değişmiyor
- Grup sahibi olduğundan emin ol
- Sayfayı yenile
- Tarayıcı konsolunda hata mesajını kontrol et

## 📞 İletişim & Destek

Herhangi bir sorun veya öneri için lütfen ekiple iletişime geçin.

---

**Son Güncelleme**: 9 Nisan 2026
**Sürüm**: 1.0
**Durum**: ✅ Başarıyla Dağıtıldı
