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

// GET /api/recommendations - Get AI recommendations
export default async function handler(req, res) {
    const user = authenticateToken(req);
    
    if (!user) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    const userId = user.id;
    
    if (req.method === 'GET') {
        try {
            // Get all user data
            const allGoals = await getKVData('goals') || {};
            const allHabits = await getKVData('habits') || {};
            const allPlans = await getKVData('plans') || {};
            const allFocus = await getKVData('focus') || {};
            const allReflections = await getKVData('reflections') || {};
            
            const userGoals = allGoals[userId] || [];
            const userHabits = allHabits[userId] || [];
            const userPlans = allPlans[userId] || [];
            const userFocus = allFocus[userId] || [];
            const userReflections = allReflections[userId] || [];
            
            // Analyze data and generate recommendations
            const recommendations = generateRecommendations(
                userGoals,
                userHabits,
                userPlans,
                userFocus,
                userReflections
            );
            
            return res.status(200).json(recommendations);
        } catch (error) {
            console.error('Get recommendations error:', error);
            return res.status(500).json({ error: 'Öneriler yüklenirken hata oluştu' });
        }
    }
    
    return res.status(405).json({ error: 'İzin verilmeyen metod' });
}

function generateRecommendations(goals, habits, plans, focus, reflections) {
    const recommendations = [];
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Goal-based recommendations
    const completedGoals = goals.filter(g => g.status === 'completed');
    const inProgressGoals = goals.filter(g => g.status === 'in-progress');
    const completionRate = goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0;
    
    if (completionRate < 50 && goals.length > 0) {
        recommendations.push({
            type: 'warning',
            category: 'goals',
            title: 'Hedef Tamamlama Oranı Düşük',
            message: 'Bu hafta hedeflerinizin sadece %' + completionRate + ' tamamladınız. İş yükünüzü azaltmayı veya daha küçük adımlara bölmeyi düşünebilirsiniz.',
            action: 'Daha fazla bilgi almak için AI Asistan\'a sorun'
        });
    }
    
    if (inProgressGoals.length > 5) {
        recommendations.push({
            type: 'tip',
            category: 'goals',
            title: 'Çok Fazla Aktif Hedef',
            message: 'Aynı anda ' + inProgressGoals.length + ' hedef üzerinde çalışıyorsunuz. Odaklanmak için bazılarını ertelemeyi düşünebilirsiniz.',
            action: 'Hedeflerinizi önceliklendirin'
        });
    }
    
    // Check goal types distribution
    const goalTypes = goals.reduce((acc, g) => {
        acc[g.type] = (acc[g.type] || 0) + 1;
        return acc;
    }, {});
    
    if (!goalTypes.daily && goals.length > 0) {
        recommendations.push({
            type: 'suggestion',
            category: 'habits',
            title: 'Günlük Hedef Eksik',
            message: 'Günlük hedefler oluşturmak, küçük ama tutarlı ilerleme sağlar. Bugün küçük bir günlük hedef belirlemeyi deneyin.',
            action: 'Yeni günlük hedef oluştur'
        });
    }
    
    // 2. Habit-based recommendations
    const todayCompletions = habits.filter(h => h.completions?.includes(today));
    const completionRateHabits = habits.length > 0 ? Math.round((todayCompletions.length / habits.length) * 100) : 0;
    
    if (completionRateHabits < 50 && habits.length > 0) {
        recommendations.push({
            type: 'warning',
            category: 'habits',
            title: 'Günlük Alışkanlık Tamamlama',
            message: 'Bugün alışkanlıklarınızın sadece %' + completionRateHabits + ' tamamladınız. En önemli alışkanlıklarınıza öncelik vermeyi deneyin.',
            action: 'Alışkanlık listenizi gözden geçirin'
        });
    }
    
    // Find best streak
    const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
    if (bestStreak >= 7) {
        recommendations.push({
            type: 'achievement',
            category: 'habits',
            title: 'Harika Seri! 🎉',
            message: bestStreak + ' günlük başarılı bir seri ile devam ediyorsunuz! Bu mükemmel alışkanlıkları koruyun.',
            action: null
        });
    }
    
    // Check if user has enough habits
    if (habits.length < 3) {
        recommendations.push({
            type: 'suggestion',
            category: 'habits',
            title: 'Daha Fazla Alışkanlık Ekleyin',
            message: 'Henüz sadece ' + habits.length + ' alışkanlığınız var. Sağlıklı alışkanlıklar oluşturmak uzun vadeli başarı için önemlidir.',
            action: 'Yeni alışkanlık oluştur'
        });
    }
    
    // 3. Focus-based recommendations
    const todayFocusMinutes = focus
        .filter(s => s.date === today && s.status === 'completed')
        .reduce((sum, s) => sum + (s.duration || 0), 0);
    
    if (todayFocusMinutes < 25 && todayFocusMinutes > 0) {
        recommendations.push({
            type: 'tip',
            category: 'focus',
            title: 'Daha Fazla Odaklanma Süresi',
            message: 'Bugün sadece ' + todayFocusMinutes + ' dakika odaklanma süresi geçirdiniz. Derin çalışma için en az 25 dakikalık Pomodoro tekniğini deneyin.',
            action: 'Focus Mode\'u açın'
        });
    }
    
    if (todayFocusMinutes === 0 && (goals.length > 0 || plans.length > 0)) {
        recommendations.push({
            type: 'suggestion',
            category: 'focus',
            title: 'Odaklanma Zamanı',
            message: 'Bugün henüz odaklanma seansı yapmadınız. Verimli çalışmak için Focus Mode\'u deneyin.',
            action: 'Focus Mode\'u başlat'
        });
    }
    
    // Weekly focus analysis
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weeklyFocusMinutes = focus
        .filter(s => new Date(s.startTime) >= weekStart && s.status === 'completed')
        .reduce((sum, s) => sum + (s.duration || 0), 0);
    
    if (weeklyFocusMinutes < 120) {
        recommendations.push({
            type: 'tip',
            category: 'focus',
            title: 'Haftalık Odak Süresi',
            message: 'Bu hafta toplam ' + Math.round(weeklyFocusMinutes / 60) + ' saat odaklanma süreniz var. Haftada en az 2 saat derin çalışma önerilir.',
            action: null
        });
    }
    
    // 4. Plan-based recommendations
    const totalTasks = plans.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
    const completedTasks = plans.reduce((sum, p) => sum + (p.tasks?.filter(t => t.status === 'completed').length || 0), 0);
    
    if (totalTasks > 0 && completedTasks / totalTasks < 0.3) {
        recommendations.push({
            type: 'warning',
            category: 'plans',
            title: 'Görev Tamamlama',
            message: 'Planlarınızdaki görevlerin sadece %' + Math.round((completedTasks / totalTasks) * 100) + ' tamamladınız. Görevlerinizi küçük parçalara bölün.',
            action: null
        });
    }
    
    // 5. Reflection-based recommendations
    const hasReflectionToday = reflections.some(r => r.date === today);
    if (!hasReflectionToday) {
        recommendations.push({
            type: 'suggestion',
            category: 'reflection',
            title: 'Günlük Yansıma',
            message: 'Bugünkü yansımanızı henüz yazmadınız. Gününüzü analiz etmek ve yarın için plan yapmak için yazın.',
            action: 'Yansıma yazın'
        });
    }
    
    // 6. Time-based patterns (simple productivity pattern detection)
    const focusByHour = focus
        .filter(s => s.status === 'completed')
        .reduce((acc, s) => {
            const hour = new Date(s.startTime).getHours();
            acc[hour] = (acc[hour] || 0) + s.duration;
            return acc;
        }, {});
    
    const peakHour = Object.entries(focusByHour).sort((a, b) => b[1] - a[1])[0];
    if (peakHour && peakHour[1] > 60) {
        const hour = parseInt(peakHour[0]);
        const timeStr = hour < 12 ? `${hour}:00 - Öğleden önce` : 
                       hour < 17 ? `${hour}:00 - Öğleden sonra erken` : 
                       `${hour}:00 - Akşam`;
        
        recommendations.push({
            type: 'tip',
            category: 'productivity',
            title: 'En Verimli Zamanınız',
            message: `En verimli çalışma zamanınız ${timeStr}. Bu saatlerde önemli görevlerinizi yapmayı deneyin.`,
            action: null
        });
    }
    
    // 7. General wellness recommendations
    if (recommendations.length === 0) {
        recommendations.push({
            type: 'achievement',
            category: 'general',
            title: 'Harika Gidiyorsunuz! 🚀',
            message: 'Tüm önemli alanlarda iyi performans gösteriyorsunuz. Bu tempoyu koruyun!',
            action: null
        });
    }
    
    // Limit to top 5 recommendations
    return recommendations.slice(0, 5);
}
