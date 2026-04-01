import { getKVData, setKVData } from '../../lib/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';

// Optimal reminder times (ML-based, simplified)
const OPTIMAL_TIMES = {
  'morning': '08:00',
  'midday': '12:30',
  'evening': '18:00',
  'night': '20:00'
};

// Helper: Authenticate token
function authenticateToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return null;
  
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Helper: Check if today should trigger a reminder
function shouldSendReminderToday(reminder) {
  if (!reminder || !reminder.enabled) return false;
  
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  switch (reminder.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6; // Saturday and Sunday
    case 'specific':
      return reminder.specificDays && reminder.specificDays.includes(dayOfWeek);
    default:
      return false;
  }
}

// Helper: Check if it's time to send the notification
function isTimeToSendNotification(reminderTime, lastNotificationAt) {
  const now = new Date();
  const [hours, minutes] = reminderTime.split(':').map(Number);
  
  const reminderHours = hours;
  const reminderMinutes = minutes;
  
  const nowHours = now.getHours();
  const nowMinutes = now.getMinutes();
  
  // Check if current time is >= reminder time and < reminder time + 2 minutes (to avoid duplicate notifications)
  const nowTotalMinutes = nowHours * 60 + nowMinutes;
  const reminderTotalMinutes = reminderHours * 60 + reminderMinutes;
  
  // Allow notification within a 2-minute window
  const isInTimeWindow = nowTotalMinutes >= reminderTotalMinutes && 
                        nowTotalMinutes < reminderTotalMinutes + 2;
  
  if (!isInTimeWindow) return false;
  
  // Check if we already sent a notification today
  if (lastNotificationAt) {
    const lastNotificationDate = new Date(lastNotificationAt).toISOString().split('T')[0];
    const todayDate = now.toISOString().split('T')[0];
    
    if (lastNotificationDate === todayDate) {
      return false; // Already sent today
    }
  }
  
  return true;
}

// NEW: Calculate optimal notification time from user patterns
function calculateOptimalTime(userdata = {}) {
  // Will use ML in production, for now return a reasonable default
  if (userdata.performanceByTime) {
    // Find the time slot with best performance
    let bestTime = 'morning';
    let bestScore = 0;
    
    Object.entries(userdata.performanceByTime).forEach(([time, score]) => {
      if (score > bestScore) {
        bestScore = score;
        bestTime = time;
      }
    });
    
    return OPTIMAL_TIMES[bestTime] || '09:00';
  }
  return '09:00';
}

export default async function handler(req, res) {
  const user = authenticateToken(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }
  
  const userId = user.id;
  
  // GET - Get pending notifications
  if (req.method === 'GET') {
    try {
      if (req.query.type === 'optimal-time') {
        // NEW: Get optimal notification time for user
        const optimalTime = calculateOptimalTime();
        return res.status(200).json({
          success: true,
          optimalTime: optimalTime,
          message: 'Optimal bildirim saati hesaplandı'
        });
      }
      
      if (req.query.type === 'preferences') {
        // NEW: Get notification preferences
        const userPrefs = await getKVData(`user-notif-prefs-${userId}`) || {
          dailyReminders: true,
          motivationAlerts: true,
          habitReminders: true,
          goalUpdates: true,
          socialNotifications: true,
          soundEnabled: true,
          optimalReminderTime: 'morning',
          quietHours: { start: '22:00', end: '08:00' }
        };
        
        return res.status(200).json({
          success: true,
          preferences: userPrefs
        });
      }
      
      // Default: Get pending notifications
      const allHabits = await getKVData('habits');
      const userHabits = allHabits[userId] || [];
      
      const pendingNotifications = [];
      
      for (const habit of userHabits) {
        if (!habit.reminder) continue;
        
        if (shouldSendReminderToday(habit.reminder) && 
          isTimeToSendNotification(habit.reminder.time, habit.lastNotificationAt)) {
          pendingNotifications.push({
            habitId: habit.id,
            habitName: habit.name,
            habitIcon: habit.icon,
            reminderTime: habit.reminder.time,
            title: `⏰ ${habit.name}`,
            message: `Alışkanlığını tamamlamaya hazır mısın? 🚀`
          });
          
          // Mark as notified
          habit.lastNotificationAt = new Date().toISOString();
        }
      }
      
      // Update lastNotificationAt timestamps
      if (pendingNotifications.length > 0) {
        allHabits[userId] = userHabits;
        await setKVData('habits', allHabits);
      }
      
      return res.status(200).json({ notifications: pendingNotifications });
    } catch (error) {
      console.error('Get notifications error:', error);
      return res.status(500).json({ error: 'Bildirimler yüklenirken hata oluştu' });
    }
  }
  
  // POST - Subscribe or update preferences
  if (req.method === 'POST') {
    try {
      if (req.query.type === 'preferences') {
        // NEW: Update notification preferences
        const { dailyReminders, motivationAlerts, habitReminders, goalUpdates, socialNotifications, soundEnabled, optimalReminderTime } = req.body;
        
        const prefs = {
          dailyReminders: dailyReminders !== undefined ? dailyReminders : true,
          motivationAlerts: motivationAlerts !== undefined ? motivationAlerts : true,
          habitReminders: habitReminders !== undefined ? habitReminders : true,
          goalUpdates: goalUpdates !== undefined ? goalUpdates : true,
          socialNotifications: socialNotifications !== undefined ? socialNotifications : true,
          soundEnabled: soundEnabled !== undefined ? soundEnabled : true,
          optimalReminderTime: optimalReminderTime || 'morning',
          quietHours: { start: '22:00', end: '08:00' }
        };
        
        await setKVData(`user-notif-prefs-${userId}`, prefs);
        
        return res.status(200).json({
          success: true,
          message: 'Bildirim ayarları güncellendi',
          preferences: prefs
        });
      }
      
      // Default: Subscribe to push notifications
      const { subscription } = req.body;
      
      if (!subscription) {
        return res.status(400).json({ error: 'Push subscription gereklidir' });
      }
      
      // Store the subscription in KV store
      let allSubscriptions = await getKVData('push-subscriptions') || {};
      allSubscriptions[userId] = subscription;
      
      await setKVData('push-subscriptions', allSubscriptions);
      
      return res.status(200).json({ success: true, message: 'Push notification aboneliği başarıyla kaydedildi' });
    } catch (error) {
      console.error('Post notifications error:', error);
      return res.status(500).json({ error: 'Hata oluştu' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
