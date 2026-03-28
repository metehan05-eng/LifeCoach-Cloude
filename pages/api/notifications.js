import { getKVData, setKVData } from '../../lib/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';

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

export default async function handler(req, res) {
    const user = authenticateToken(req);
    
    if (!user) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    const userId = user.id;
    
    // GET - Get pending notifications
    if (req.method === 'GET') {
        try {
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
    
    // POST - Subscribe to push notifications
    if (req.method === 'POST') {
        try {
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
            console.error('Subscribe to notifications error:', error);
            return res.status(500).json({ error: 'Bildirime abone olurken hata oluştu' });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
