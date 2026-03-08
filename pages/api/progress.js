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

// GET /api/progress - Get progress data and statistics
export default async function handler(req, res) {
    const user = authenticateToken(req);
    
    if (!user) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    const userId = user.id;
    
    if (req.method === 'GET') {
        try {
            const allGoals = await getKVData('goals') || {};
            const allHabits = await getKVData('habits') || {};
            const allPlans = await getKVData('plans') || {};
            
            const userGoals = allGoals[userId] || [];
            const userHabits = allHabits[userId] || [];
            const userPlans = allPlans[userId] || [];
            
            // Calculate weekly progress (last 7 days)
            const weekData = calculateWeeklyProgress(userGoals, userHabits, userPlans);
            
            // Calculate monthly progress (last 30 days)
            const monthData = calculateMonthlyProgress(userGoals, userHabits, userPlans);
            
            // Goal completion rate
            const goalStats = calculateGoalStats(userGoals);
            
            // Habit completion rate
            const habitStats = calculateHabitStats(userHabits);
            
            // Plan completion rate
            const planStats = calculatePlanStats(userPlans);
            
            // Overall productivity score (0-100)
            const productivityScore = calculateProductivityScore(goalStats, habitStats, planStats);
            
            return res.status(200).json({
                weekly: weekData,
                monthly: monthData,
                goals: goalStats,
                habits: habitStats,
                plans: planStats,
                productivityScore
            });
        } catch (error) {
            console.error('Get progress error:', error);
            return res.status(500).json({ error: 'İlerleme verileri yüklenirken hata oluştu' });
        }
    }
    
    return res.status(405).json({ error: 'İzin verilmeyen metod' });
}

function calculateWeeklyProgress(goals, habits, plans) {
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const weekData = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = days[date.getDay()];
        
        let progress = 0;
        
        // Count completed goals created on this day
        const goalsCompleted = goals.filter(g => {
            const created = g.createdAt.split('T')[0];
            return created === dateStr && g.status === 'completed';
        }).length;
        
        // Count habit completions for this day
        const habitsCompleted = habits.reduce((count, h) => {
            return count + (h.completions?.includes(dateStr) ? 1 : 0);
        }, 0);
        
        // Count completed tasks from plans for this day
        const tasksCompleted = plans.reduce((count, p) => {
            return count + (p.tasks?.filter(t => {
                return t.completedDate === dateStr && t.status === 'completed';
            }).length || 0);
        }, 0);
        
        // Calculate progress (normalized to 0-100)
        const totalPossible = Math.max(1, goals.length + habits.length + 3);
        progress = Math.min(100, ((goalsCompleted * 20) + (habitsCompleted * 10) + (tasksCompleted * 15)) / totalPossible * 100);
        
        weekData.push({
            day: dayName,
            date: dateStr,
            progress: Math.round(progress),
            goalsCompleted,
            habitsCompleted,
            tasksCompleted
        });
    }
    
    return weekData;
}

function calculateMonthlyProgress(goals, habits, plans) {
    const monthData = [];
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = today.getDate();
    
    for (let i = currentDay - 1; i >= Math.max(0, currentDay - 13); i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        let progress = 0;
        
        // Count completions for this day
        const goalsCompleted = goals.filter(g => g.completedAt?.split('T')[0] === dateStr).length;
        const habitsCompleted = habits.reduce((count, h) => {
            return count + (h.completions?.includes(dateStr) ? 1 : 0);
        }, 0);
        const tasksCompleted = plans.reduce((count, p) => {
            return count + (p.tasks?.filter(t => t.completedDate === dateStr).length || 0);
        }, 0);
        
        progress = Math.min(100, ((goalsCompleted * 20) + (habitsCompleted * 10) + (tasksCompleted * 15)));
        
        monthData.push({
            date: dateStr,
            day: date.getDate(),
            progress: Math.round(progress)
        });
    }
    
    return monthData;
}

function calculateGoalStats(goals) {
    const total = goals.length;
    const completed = goals.filter(g => g.status === 'completed').length;
    const inProgress = goals.filter(g => g.status === 'in-progress').length;
    const paused = goals.filter(g => g.status === 'paused').length;
    
    const avgProgress = total > 0 
        ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / total)
        : 0;
    
    // Count by type
    const byType = {
        daily: goals.filter(g => g.type === 'daily').length,
        weekly: goals.filter(g => g.type === 'weekly').length,
        monthly: goals.filter(g => g.type === 'monthly').length,
        yearly: goals.filter(g => g.type === 'yearly').length
    };
    
    return {
        total,
        completed,
        inProgress,
        paused,
        avgProgress,
        byType,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
}

function calculateHabitStats(habits) {
    const total = habits.length;
    
    if (total === 0) {
        return {
            total: 0,
            completedToday: 0,
            avgStreak: 0,
            completionRate: 0
        };
    }
    
    const today = new Date().toISOString().split('T')[0];
    const completedToday = habits.filter(h => h.completions?.includes(today)).length;
    
    const totalCompletions = habits.reduce((sum, h) => sum + (h.completions?.length || 0), 0);
    const avgCompletions = Math.round(totalCompletions / total);
    
    // Calculate average streak
    const avgStreak = Math.round(habits.reduce((sum, h) => sum + (h.streak || 0), 0) / total);
    
    // Calculate completion rate for last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
    }
    
    let totalPossible = total * 7;
    let totalCompleted = 0;
    
    last7Days.forEach(date => {
        totalCompleted += habits.filter(h => h.completions?.includes(date)).length;
    });
    
    return {
        total,
        completedToday,
        avgStreak,
        avgCompletions,
        completionRate: totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0
    };
}

function calculatePlanStats(plans) {
    const total = plans.length;
    
    if (total === 0) {
        return {
            total: 0,
            completed: 0,
            completionRate: 0
        };
    }
    
    let totalTasks = 0;
    let completedTasks = 0;
    
    plans.forEach(plan => {
        const tasks = plan.tasks || [];
        totalTasks += tasks.length;
        completedTasks += tasks.filter(t => t.status === 'completed').length;
    });
    
    return {
        total,
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
}

function calculateProductivityScore(goalStats, habitStats, planStats) {
    // Weighted average of different metrics
    const goalWeight = 0.4;
    const habitWeight = 0.4;
    const planWeight = 0.2;
    
    const goalScore = goalStats.completionRate;
    const habitScore = habitStats.completionRate;
    const planScore = planStats.completionRate;
    
    const score = Math.round(
        (goalScore * goalWeight) +
        (habitScore * habitWeight) +
        (planScore * planWeight)
    );
    
    return Math.min(100, Math.max(0, score));
}
