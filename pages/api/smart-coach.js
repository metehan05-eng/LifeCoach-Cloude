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

// GET /api/smart-coach - Get AI coaching insights
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
            
            // Generate coaching insights
            const coaching = generateCoachingInsights(
                userGoals,
                userHabits,
                userPlans,
                userFocus,
                userReflections
            );
            
            return res.status(200).json(coaching);
        } catch (error) {
            console.error('Get coaching error:', error);
            return res.status(500).json({ error: 'Koçluk verileri yüklenirken hata oluştu' });
        }
    }
    
    return res.status(405).json({ error: 'İzin verilmeyen metod' });
}

function generateCoachingInsights(goals, habits, plans, focus, reflections) {
    const today = new Date().toISOString().split('T')[0];
    const insights = [];
    let overallScore = 0;
    
    // 1. Goal Analysis
    const goalStats = analyzeGoals(goals);
    overallScore += goalStats.score;
    insights.push(...goalStats.insights);
    
    // 2. Habit Analysis
    const habitStats = analyzeHabits(habits, today);
    overallScore += habitStats.score;
    insights.push(...habitStats.insights);
    
    // 3. Plan Analysis
    const planStats = analyzePlans(plans);
    overallScore += planStats.score;
    insights.push(...planStats.insights);
    
    // 4. Focus Analysis
    const focusStats = analyzeFocus(focus, today);
    overallScore += focusStats.score;
    insights.push(...focusStats.insights);
    
    // 5. Reflection Analysis
    const reflectionStats = analyzeReflections(reflections, today);
    overallScore += reflectionStats.score;
    insights.push(...reflectionStats.insights);
    
    // Calculate overall score (0-100)
    const totalCategories = 5;
    overallScore = Math.round(overallScore / totalCategories);
    
    // Generate summary
    const summary = generateSummary(overallScore, insights);
    
    return {
        score: overallScore,
        grade: getGrade(overallScore),
        insights: insights.slice(0, 8),
        summary,
        stats: {
            goals: goalStats,
            habits: habitStats,
            plans: planStats,
            focus: focusStats,
            reflection: reflectionStats
        }
    };
}

function analyzeGoals(goals) {
    const insights = [];
    let score = 50;
    
    if (goals.length === 0) {
        insights.push({
            type: 'suggestion',
            area: 'goals',
            message: 'Henüz hedef belirlemediniz. Başlamak için küçük, ulaşılabilir bir hedef seçin.'
        });
        score = 30;
    } else {
        const completed = goals.filter(g => g.status === 'completed').length;
        const inProgress = goals.filter(g => g.status === 'in-progress').length;
        const completionRate = Math.round((completed / goals.length) * 100);
        
        if (completionRate >= 70) {
            insights.push({
                type: 'achievement',
                area: 'goals',
                message: `Harika! Hedeflerinizin %${completionRate} tamamladınız. Bu mükemmel bir ilerleme.`
            });
            score = 90;
        } else if (completionRate >= 40) {
            insights.push({
                type: 'tip',
                area: 'goals',
                message: `Hedeflerinizin %${completionRate} tamamladınız. Devam edin, istikrar önemli!`
            });
            score = 70;
        } else {
            insights.push({
                type: 'warning',
                area: 'goals',
                message: `Hedeflerinizin sadece %${completionRate} tamamladınız. Belki hedefleriniz çok büyük? Küçük adımlara bölmeyi deneyin.`
            });
            score = 40;
        }
        
        // Check for stale goals
        const staleGoals = goals.filter(g => {
            const daysSinceUpdate = (Date.now() - new Date(g.updatedAt)) / (1000 * 60 * 60 * 24);
            return daysSinceUpdate > 7 && g.status === 'in-progress';
        });
        
        if (staleGoals.length > 0) {
            insights.push({
                type: 'tip',
                area: 'goals',
                message: `${staleGoals.length} hedefiniz 7 gündür güncellenmedi. Bu hedefleri gözden geçirin veya erteleyin.`
            });
        }
    }
    
    return { score, insights, total: goals.length, completed: goals.filter(g => g.status === 'completed').length };
}

function analyzeHabits(habits, today) {
    const insights = [];
    let score = 50;
    
    if (habits.length === 0) {
        insights.push({
            type: 'suggestion',
            area: 'habits',
            message: 'Alışkanlıklar, uzun vadeli başarının temelidir. Bugün bir alışkanlık oluşturun!'
        });
        score = 20;
    } else {
        const todayCompleted = habits.filter(h => h.completions?.includes(today)).length;
        const completionRate = Math.round((todayCompleted / habits.length) * 100);
        
        // Calculate best streak
        const bestStreak = Math.max(...habits.map(h => h.streak || 0));
        
        if (bestStreak >= 7) {
            insights.push({
                type: 'achievement',
                area: 'habits',
                message: `${bestStreak} günlük en iyi seriniz var! Bu inanılmaz bir disiplin.`
            });
            score = Math.min(100, score + 30);
        }
        
        if (completionRate >= 80) {
            insights.push({
                type: 'achievement',
                area: 'habits',
                message: `Bugün alışkanlıklarınızın %${completionRate} tamamladınız!`
            });
            score = Math.max(score, 85);
        } else if (completionRate >= 50) {
            insights.push({
                type: 'tip',
                area: 'habits',
                message: `Bugün %${completionRate} oranında başarılı. En önemli alışkanlıklarınıza öncelik verin.`
            });
            score = Math.max(score, 60);
        } else if (completionRate > 0) {
            insights.push({
                type: 'tip',
                area: 'habits',
                message: `Bugün sadece ${todayCompleted} alışkanlık tamamladınız. En az birini yapmaya devam edin!`
            });
            score = 40;
        } else {
            insights.push({
                type: 'tip',
                area: 'habits',
                message: 'Bugün henüz alışkanlık tamamlamadınız. Küçük bir adım atarak başlayın.'
            });
            score = 30;
        }
    }
    
    return { 
        score, 
        insights, 
        total: habits.length, 
        completedToday: habits.filter(h => h.completions?.includes(today)).length,
        bestStreak: Math.max(...habits.map(h => h.streak || 0))
    };
}

function analyzePlans(plans) {
    const insights = [];
    let score = 50;
    
    if (plans.length === 0) {
        insights.push({
            type: 'suggestion',
            area: 'plans',
            message: 'AI\'dan bir plan oluşturmasını isteyin. Planlı çalışmak verimliliği artırır.'
        });
        score = 30;
    } else {
        const allTasks = plans.flatMap(p => p.tasks || []);
        const completedTasks = allTasks.filter(t => t.status === 'completed').length;
        const completionRate = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;
        
        if (completionRate >= 60) {
            insights.push({
                type: 'achievement',
                area: 'plans',
                message: `Görevlerinizin %${completionRate} tamamladınız. İyi gidiyorsunuz!`
            });
            score = 80;
        } else if (completionRate >= 30) {
            insights.push({
                type: 'tip',
                area: 'plans',
                message: `%${completionRate} tamamlandı. Öncelikli görevlere odaklanın.`
            });
            score = 55;
        } else {
            insights.push({
                type: 'tip',
                area: 'plans',
                message: 'Görevlerinizi küçük parçalara bölün ve birer birer tamamlayın.'
            });
            score = 35;
        }
    }
    
    return { score, insights, totalPlans: plans.length, totalTasks: plans.reduce((s, p) => s + (p.tasks?.length || 0), 0) };
}

function analyzeFocus(focus, today) {
    const insights = [];
    let score = 50;
    
    const todaySessions = focus.filter(s => s.date === today && s.status === 'completed');
    const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    
    if (todayMinutes >= 60) {
        insights.push({
            type: 'achievement',
            area: 'focus',
            message: `Bugün ${Math.round(todayMinutes / 60)} saat odaklanma süresi! Bu harika bir derin çalışma.`
        });
        score = 95;
    } else if (todayMinutes >= 25) {
        insights.push({
            type: 'achievement',
            area: 'focus',
            message: `Bugün ${todayMinutes} dakika odaklandınız. En az bir Pomodoro tamamladınız!`
        });
        score = 75;
    } else if (todayMinutes > 0) {
        insights.push({
            type: 'tip',
            area: 'focus',
            message: `${todayMinutes} dakika odaklanma süreniz var. Daha uzun seanslar için Focus Mode'u kullanın.`
        });
        score = 50;
    } else {
        insights.push({
            type: 'suggestion',
            area: 'focus',
            message: 'Bugün henüz odaklanma seansı yapmadınız. 25 dakikalık bir seansla başlayın!'
        });
        score = 25;
    }
    
    // Weekly analysis
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weeklyMinutes = focus
        .filter(s => new Date(s.startTime) >= weekStart && s.status === 'completed')
        .reduce((sum, s) => sum + (s.duration || 0), 0);
    
    if (weeklyMinutes >= 300) {
        insights.push({
            type: 'achievement',
            area: 'focus',
            message: `Bu hafta ${Math.round(weeklyMinutes / 60)} saat odaklanma süreniz var. Mükemmel!`
        });
    }
    
    return { score, insights, todayMinutes, weeklyMinutes, sessionsToday: todaySessions.length };
}

function analyzeReflections(reflections, today) {
    const insights = [];
    let score = 50;
    
    const hasTodayReflection = reflections.some(r => r.date === today);
    
    if (hasTodayReflection) {
        insights.push({
            type: 'achievement',
            area: 'reflection',
            message: 'Bugünkü yansımanızı yazdınız. Bu kendini geliştirmenin önemli bir parçası!'
        });
        score = 90;
    } else {
        insights.push({
            type: 'suggestion',
            area: 'reflection',
            message: 'Bugünkü yansımanızı yazmadınız. "Bugün en büyük başarım neydi?" diye kendinize sorun.'
        });
        score = 30;
    }
    
    // Check reflection consistency
    const uniqueDates = [...new Set(reflections.map(r => r.date))].length;
    if (uniqueDates >= 7) {
        insights.push({
            type: 'achievement',
            area: 'reflection',
            message: `${uniqueDates} günlük yansıma yazdınız. Bu harika bir alışkanlık!`
        });
    }
    
    return { score, insights, hasTodayReflection, totalReflections: reflections.length };
}

function generateSummary(score, insights) {
    if (score >= 80) {
        return 'Mükemmel performans! Tüm alanlarda güçlü ilerleme kaydediyorsunuz. Bu tempoyu koruyun ve yeni zorluklar üstlenin.';
    } else if (score >= 60) {
        return 'İyi gidiyorsunuz! Bazı alanlarda iyileştirme fırsatları var. Öncelikli olarak üzerinde çalışılması gereken alanlara odaklanın.';
    } else if (score >= 40) {
        return 'Orta düzey bir performans gösteriyorsunuz. Küçük adımlarla başlayın ve her gün biraz daha iyi olmaya çalışın.';
    } else {
        return 'Başlangıç aşamasındasınız. Bugün küçük bir adım atarak başlayın. Önemli olan başlamak!';
    }
}

function getGrade(score) {
    if (score >= 90) return { letter: 'A+', label: 'Mükemmel', color: '#22c55e' };
    if (score >= 80) return { letter: 'A', label: 'Harika', color: '#14b8a6' };
    if (score >= 70) return { letter: 'B+', label: 'İyi', color: '#2dd4bf' };
    if (score >= 60) return { letter: 'B', label: 'Orta-İyi', color: '#f59e0b' };
    if (score >= 50) return { letter: 'C', label: 'Orta', color: '#f97316' };
    return { letter: 'D', label: 'Geliştirilmeli', color: '#ef4444' };
}
