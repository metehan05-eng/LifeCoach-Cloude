# Alışkanlık Bildirim Sistemi - Uygulama Kılavuzu

## Özet
Alışkanlık oluşturma sistemi, kullanıcıların belirli saatlerde hangi alışkanlıkları yapması gerektiğini hatırlatmak için bildirimleri desteklemek üzere genişletildi.

## Yeni Özellikler

### 1. **İçinde Bildirim Ayarları Modal**
Yeni alışkanlık oluştururken:
- **Bildirim Al** checkbox'ını etkinleştir
- Bildirim almak istediğin **saati seç** (örn: 14:00 - saat 2)
- **Tekrar Türünü Seç**:
  - **Her Gün**: Her gün aynı saatte
  - **Hafta İçi**: Pazartesi-Cuma
  - **Hafta Sonu**: Cumartesi-Pazar
  - **Belirli Günler**: Özel günler seçme seçeneği

### 2. **Bildirim Gösterimi**
- Alışkanlık kartında, bildirim ayarlanmış ise saat gösterilir:
  ```
  🔔 Bildirim: 14:00
  ```

### 3. **Otomatik Bildirimler**
- Sistem her 60 saniyede bir (1 dakika) birim ve kontrol eder
- Belirlenen saate gelince browser'dan notification gönderilir
- Bildirim örneği:
  ```
  ⏰ Ders Çalış
  Alışkanlığını tamamlamaya hazır mısın? 🚀
  ```

## Teknik Detaylar

### Frontend Değişiklikleri

#### 1. `/public/life-coach-ui.html`
- **Habit Modal**: Yeni bildirim ayarları UI eklendi
  - Saat seçici (`<input type="time">`)
  - Tekrar sıklığı dropdown menu
  - Özel günler seçimi (7 gün seçeneği)

- **Habit Card Rendering**: Bildirimleri göstermek için `renderHabits()` güncellendi
  - Bell icon + saat bilgileri ekranda görünür

- **Notification Initialization**: `initializeNotifications()` fonksiyonu eklendi
  - Browser notification permission istemesi
  - Her 60 saniyede bir pending notifications kontrolü
  - Bildirimler `NotificationsService` aracılığıyla gösterilir

- **Habit Form Submit**: Bildirim konfigürasyonu oluştur
  ```javascript
  const reminder = {
    enabled: true,
    time: "14:00",           // HH:MM format
    frequency: "daily",      // daily, weekdays, weekends, specific
    specificDays: [1,2,3]    // 0=Pazar, 1=Pazartesi, ... 6=Cumartesi
  }
  ```

#### 2. `/public/lifeCoachServices.js`
- **NotificationsService** eklendi:
  - `getPendingNotifications()`: API'den pending notifications al
  - `subscribeToPushNotifications()`: Push subscription kaydı (gelecek)
  - `requestNotificationPermission()`: Browser permission iste
  - `showLocalNotification()`: Local browser notification göster

### Backend Değişiklikleri

#### 1. `/pages/api/habits.js`
- Habit creation POST endpoint güncellendi
- **Yeni fields**:
  - `reminder`: Bildirim konfigürasyonu nesnesi
  - `lastNotificationAt`: Son bildirim zamanı (duplesiz kontrol için)

#### 2. `/pages/api/notifications.js` (YENİ)
- **GET endpoint**: Pending notifications kontrolü
  - Belirtilen saatte bildirim gönderilmesi gerekip gerekmediğini kontrol eder
  - `shouldSendReminderToday()`: Gün uygunluğunu kontrol eder
  - `isTimeToSendNotification()`: Saat uygunluğunu kontrol eder
  - 2 dakikalık pencere içinde duplicate bildirim engelle

- **POST endpoint**: Push notification subscription kaydı (gelecek)

## Nasıl Kullanılır?

### 1. Yeni Alışkanlık Oluştur
1. "Yeni Alışkanlık" butonu tıkla
2. Alışkanlık adınızı girin (örn: "Ders Çalış")
3. Açıklama ekleyin (opsiyonel)
4. İkon seçin
5. **"Bildirim Al" checkbox'ını etkinleştir**
6. **Saat seç** (örn: 14:00)
7. **Tekrar türünü seç** (Her Gün, Hafta İçi, vs.)
8. "Oluştur" butonu tıkla

### 2. Bildirim Alın
- Belirlenen saate gelince browser desktop notification alırsınız
- Telefonunuzda da çalışır (mobile browsers push notifications destekleyen)
- Bildirime tıklayarak uygulamaya dönebilirsiniz

### 3. Bildirim İzinleri
- İlk kez uygulamayı açarken browser büyük bir ihtimalle izin isteyecek
- "İzin Ver" tıklayın bildirimleri almak için
- Ayarlardan istediğiniz zaman değiştirebilirsiniz

## Teknoloji Yığını

- **Frontend Notifications**: Browsers `Notification API`
- **Scheduling**: Backend kontrolü + Frontend 60s interval check
- **Storage**: Kullanıcı alışkanlıkları KV Store'da saklanır

## Bilinen Sınırlamalar

1. **Time Window**: Bildirim, belirtilen saattan sonra 2 dakika içinde gönderilir
2. **Batch Check**: Her 60 saniyede bir kontrol edilir (realtime değil)
3. **Browser Dependency**: Browser kapalı ise bildirim gelmez (şu an)
4. **Same Notification Once**: Aynı alışkanlık için gün içinde sadece bir kez bildirim

## Gelecek İyileştirmeler

- [ ] Service Worker ile push notifications (browser kapalı iken de çalışır)
- [ ] Bildirim zamanında alışkanlığı değiştirme
- [ ] Bildirim geçmişi
- [ ] Bildirim seslerinin özelleştirilmesi
- [ ] SMS/Email bildirim seçeneği

## Sorun Giderme

### Bildirim gelmiyor?
1. Browser izinlerini kontrol edin
2. Application ayarlarında notifications etkinmi kontrol edin
3. Browser konsolunda hata varsa kontrol edin (F12)
4. Saati doğru ayarladığınızdan emin olun

### "Bildirim Al" checkbox görünmüyor?
1. Sayfayı yenile (F5 veya Ctrl+R)
2. Tarayıcı cache'ini temizle
3. Tarayıcıyı yeniden aç

### Bildirim zamanlaması hata veriyorsa?
1. Sistem saatini kontrol edin
2. Timezone ayarlarını doğrulayın
3. Belirtilen saatin formatının HH:MM olduğundan emin olun

---

**Version**: 1.0  
**Son Güncelleme**: 28 Mart 2026  
**Durum**: Üretim Öncesi (Pre-Production)
