# Alışkanlık Bildirim Sistemi - Teknik Uygulama Detayları

## Değiştirilmiş Dosyalar

### 1. `/public/life-coach-ui.html`
**Satır Değişiklikleri:**

#### Habit Modal HTML (Bildirim Ayarları Eklendi)
- Bildirim checkbox
- Saat seçici input
- Tekrar sıklığı dropdown
- Özel günler seçimi
- Event listeners for toggling options

#### Habit Form Submit Handler
- Bildirim objesini `HabitsService.create()` parametrelerine ekledi
- Reminder konfigürasyonunu toplayıp API'ye gönderme

#### `renderHabits()` Fonksiyonu
- Alışkanlık kartında reminde  yapılandırması görüntüsü
- Ikon + saat bilgileri: `🔔 Bildirim: 14:00`

#### Notification Initialization
- `initializeNotifications()` fonksiyonu eklendi DOMContentLoaded'da
- Browser notification permission isteme
- 60 saniye interval ile notification kontrol

```javascript
// Check every 60 seconds
setInterval(async () => {
    const result = await NotificationsService.getPendingNotifications();
    result.notifications.forEach(notif => {
        NotificationsService.showLocalNotification(...);
    });
}, 60000);
```

### 2. `/public/lifeCoachServices.js`
**NotificationsService Eklendi:**

```javascript
const NotificationsService = {
    async getPendingNotifications() { ... }
    async subscribeToPushNotifications(subscription) { ... }
    async requestNotificationPermission() { ... }
    showLocalNotification(title, message, options) { ... }
}
```

### 3. `/pages/api/habits.js`
**POST endpointinde Değişiklikler:**

```javascript
const { name, description, frequency, icon, color, reminder } = req.body;

const newHabit = {
    // ... existing fields ...
    reminder: reminder || null,              // NEW: {enabled, time, frequency, specificDays}
    lastNotificationAt: null,                // NEW: Duplicate prevention
    // ... rest ...
}
```

### 4. `/pages/api/notifications.js` (YENİ DOSYA)

**GET /api/notifications - Pending Notifications**

```javascript
export default async function handler(req, res) {
    if (req.method === 'GET') {
        // Kullanıcının alışkanlıklarını al
        // Her alışkanlık için kont:
        //   1. shouldSendReminderToday() - Gün uygunluğu
        //   2. isTimeToSendNotification() - Saat uygunluğu
        //   3. Duplıka kontrol (lastNotificationAt)
        // Pending notifications return
    }
}
```

**Yardımcı Fonksiyonlar:**

```javascript
function shouldSendReminderToday(reminder)
    - Check frequency:
      - 'daily': Always true
      - 'weekdays': Now.dayOfWeek >= 1 && <= 5
      - 'weekends': Now.dayOfWeek === 0 || 6
      - 'specific': specificDays.includes(now.dayOfWeek)

function isTimeToSendNotification(reminderTime, lastNotificationAt)
    - Parse reminder time to HH:MM
    - Check if current time is within reminder time ± 2 minutes window
    - Check lastNotificationAt - ensure not sent today
    - Return true if time to send
```

**POST /api/notifications - Push Subscription**

Gelecek için reserve edilmiş. Push notifications için kullanılacak.

---

## Veri Yapıları

### Reminder Object (Stored in Habit)
```javascript
{
    enabled: true,
    time: "14:00",              // HH:MM format
    frequency: "daily",         // daily | weekdays | weekends | specific
    specificDays: [1, 2, 3, 5]  // 0=Pazar, 1=Pzt, 2=Sal, 3=Çarş, 4=Perş, 5=Cum, 6=Cmt
}
```

### Notification Object (API Response)
```javascript
{
    habitId: "1234567890",
    habitName: "Ders Çalış",
    habitIcon: "book",
    reminderTime: "14:00",
    title: "⏰ Ders Çalış",
    message: "Alışkanlığını tamamlamaya hazır mısın? 🚀"
}
```

---

## API Flow Diagram

```
Frontend (every 60s)
    ↓
GET /api/notifications
    ↓
Backend (/pages/api/notifications.js)
    - Fetch user habits
    - Filter habits with reminder enabled
    - For each habit:
      - Check shouldSendReminderToday()
      - Check isTimeToSendNotification()
      - Mark as notified (lastNotificationAt)
    - Return pending notifications array
    ↓
Frontend
    - Show local browser notification
    - NotificationsService.showLocalNotification()
    ↓
Browser
    - Display OS notification
```

---

## Browser Notification Lifecycle

1. **Initialization** (Page Load)
   - `initializeNotifications()` called
   - Request permission: `Notification.requestPermission()`
   - Set up 60s interval check

2. **Every 60 seconds**
   - `NotificationsService.getPendingNotifications()`
   - Check for pending notifications

3. **When pending found**
   - `NotificationsService.showLocalNotification()`
   - Browser shows native OS notification

4. **User clicks notification**
   - Browser focus back to app (implementation pending)

---

## Security Considerations

1. **Authentication**: Token required for `/api/notifications`
2. **User Isolation**: Only user's own habits returned
3. **Rate Limiting**: Admin should add rate limit to `/api/notifications`
4. **Data Validation**: Input validation for time format, frequency

---

## Performance Notes

- Notification check every 60 seconds (adjustable)
- KV store queries are efficient
- No database heavy lifting
- Calculations lightweight (date comparisons)
- Estimated max 1000 notifications per minute for entire system

---

## Testing Checklist

- [ ] Create habit with reminder
- [ ] Habit card shows reminder time
- [ ] Notification permission accepted
- [ ] Browser notification appears at scheduled time
- [ ] No duplicate notifications on same day
- [ ] Different frequencies work (daily, weekdays, weekends, specific days)
- [ ] Edit habit - reminder updates
- [ ] Delete habit - notification stops
- [ ] Different time zones work
- [ ] Mobile browser notifications work

---

## Future Enhancements

1. **Service Worker Integration**
   - Keep notifications working when browser closed
   - Background sync

2. **Push Notifications (Web Push API)**
   - Server initiated notifications
   - Persistent notifications

3. **User Preferences**
   - Notification sound preferences
   - Do Not Disturb schedule
   - Notification channel management

4. **Notification History**
   - Log of sent notifications
   - Statistics on notification interactions

5. **Smart Scheduling**
   - Learn user's most active times
   - Suggest optimal notification times

---

**File**: `/pages/api/notifications.js`  
**Size**: ~3.5 KB  
**Lines**: ~120

**Summary Stats**:
- New Files: 1 (notifications.js)
- Modified Files: 4 (life-coach-ui.html, lifeCoachServices.js, habits.js, notification guide)
- New Functions: 6 (initializeNotifications, 4 notification service methods, 2 helper functions)
- New API Endpoints: 2 (GET, POST /api/notifications)

