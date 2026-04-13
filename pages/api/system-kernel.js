import { getKVData, setKVData } from '../../lib/db.js';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI;
if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

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

// Helper: Get user ID from token or session
function getUserId(req) {
    const user = authenticateToken(req);
    if (user) return user.id;
    return req.headers['x-session-id'] || 'free-user';
}

// ==================== CONTEXTUAL MEMORY LAYER ====================

async function buildUserContext(userId) {
    try {
        // Get all user data from KV store
        const [
            userStats,
            allGoals,
            allHabits,
            allFocus,
            allReflections,
            allCheckins,
            allPlans
        ] = await Promise.all([
            getKVData('user-stats'),
            getKVData('goals'),
            getKVData('habits'),
            getKVData('focus'),
            getKVData('reflections'),
            getKVData('checkin_history'),
            getKVData('plans')
        ]);

        const stats = userStats?.[userId] || { xp: 0, flameLevel: 0, level: 1 };
        const goals = allGoals?.[userId] || [];
        const habits = allHabits?.[userId] || [];
        const focus = allFocus?.[userId] || [];
        const reflections = allReflections?.[userId] || [];
        const checkins = allCheckins?.[userId] || [];
        const plans = allPlans?.[userId] || [];

        const today = new Date().toISOString().split('T')[0];

        // 1. Calculate Energy Level (1-10) based on recent activity
        const energyLevel = calculateEnergyLevel(checkins, focus, today);

        // 2. Get last focus session duration
        const lastFocus = focus
            .filter(s => s.status === 'completed')
            .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))[0];
        const lastFocusDuration = lastFocus ? lastFocus.duration : 0;

        // 3. Get latest mood from reflections
        const latestReflection = reflections
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const latestMood = latestReflection?.mood || 'neutral';
        const moodScore = getMoodScore(latestMood);

        // 4. Get active goals
        const activeGoals = goals.filter(g => g.status === 'in-progress' || g.status === 'active');
        const overdueGoals = activeGoals.filter(g => {
            if (!g.deadline) return false;
            return new Date(g.deadline) < new Date();
        });

        // 5. Get today's completed items
        const todayCompleted = {
            habits: habits.filter(h => h.completions?.includes(today)).length,
            goals: goals.filter(g => g.completedAt?.startsWith(today)).length,
            focusSessions: focus.filter(s => s.date === today && s.status === 'completed').length
        };

        // 6. Calculate system load (1-10)
        const systemLoad = calculateSystemLoad(activeGoals.length, habits.length, overdueGoals.length);

        return {
            userId,
            timestamp: new Date().toISOString(),
            
            // Core Stats
            xp: stats.xp || 0,
            level: stats.level || 1,
            flameLevel: stats.flameLevel || 0,
            
            // Energy & State
            energyLevel, // 1-10
            mood: latestMood,
            moodScore, // 1-10
            lastFocusDuration, // minutes
            
            // Activity Context
            todayCompleted,
            activeGoalsCount: activeGoals.length,
            overdueGoalsCount: overdueGoals.length,
            totalHabits: habits.length,
            hasReflectionToday: latestReflection?.date === today,
            
            // System Load
            systemLoad, // 1-10
            
            // Detailed Data for AI
            activeGoals: activeGoals.slice(0, 5).map(g => ({
                id: g.id,
                title: g.title,
                type: g.type,
                priority: g.priority,
                deadline: g.deadline,
                isOverdue: overdueGoals.some(og => og.id === g.id)
            })),
            
            // Quick wins (easy tasks with low flame)
            quickWins: identifyQuickWins(goals, habits, stats.flameLevel || 0)
        };
    } catch (error) {
        console.error('Build user context error:', error);
        return getDefaultContext(userId);
    }
}

function calculateEnergyLevel(checkins, focus, today) {
    let energy = 5; // Default middle energy
    
    // Check today's check-in for energy indicator
    const todayCheckin = checkins?.find(c => c.date === today);
    if (todayCheckin?.mood) {
        const moodEnergy = {
            'energized': 9,
            'great': 8,
            'good': 7,
            'okay': 5,
            'tired': 3,
            'exhausted': 2,
            'bad': 3
        };
        energy = moodEnergy[todayCheckin.mood] || energy;
    }
    
    // Adjust based on recent focus sessions
    const todayFocus = focus.filter(s => s.date === today && s.status === 'completed');
    const totalFocusMinutes = todayFocus.reduce((sum, s) => sum + (s.duration || 0), 0);
    
    if (totalFocusMinutes > 120) energy = Math.max(2, energy - 2); // Too much work = tired
    else if (totalFocusMinutes > 60) energy = Math.max(3, energy - 1);
    else if (totalFocusMinutes === 0 && energy < 6) energy = Math.min(10, energy + 1); // Rest needed
    
    return Math.min(10, Math.max(1, energy));
}

function getMoodScore(mood) {
    const scores = {
        'energized': 10,
        'great': 9,
        'good': 7,
        'okay': 5,
        'neutral': 5,
        'tired': 3,
        'exhausted': 2,
        'bad': 2,
        'stressed': 3
    };
    return scores[mood] || 5;
}

function calculateSystemLoad(activeGoals, totalHabits, overdueCount) {
    let load = 5; // Default
    
    if (activeGoals > 10) load += 2;
    else if (activeGoals > 5) load += 1;
    else if (activeGoals === 0) load -= 1;
    
    if (totalHabits > 7) load += 1;
    if (overdueCount > 2) load += 2;
    else if (overdueCount > 0) load += 1;
    
    return Math.min(10, Math.max(1, load));
}

function identifyQuickWins(goals, habits, flameLevel) {
    const quickWins = [];
    
    // Habits that can be done quickly
    habits.forEach(h => {
        if (!h.completions?.includes(new Date().toISOString().split('T')[0])) {
            quickWins.push({
                type: 'habit',
                id: h.id,
                title: h.title,
                estimatedTime: '2-5 dk',
                flameReward: 5
            });
        }
    });
    
    // Small goals or tasks
    goals.filter(g => g.status === 'in-progress').forEach(g => {
        if (g.type === 'daily' || (g.tasks && g.tasks.length < 3)) {
            quickWins.push({
                type: 'goal',
                id: g.id,
                title: g.title,
                estimatedTime: '10-15 dk',
                flameReward: 5
            });
        }
    });
    
    // Reflection if not done today
    quickWins.push({
        type: 'reflection',
        id: 'daily-reflection',
        title: 'Günlük Yansıma Yaz',
        estimatedTime: '5 dk',
        flameReward: 10
    });
    
    return quickWins.slice(0, 3);
}

function getDefaultContext(userId) {
    return {
        userId,
        timestamp: new Date().toISOString(),
        xp: 0,
        level: 1,
        flameLevel: 0,
        energyLevel: 5,
        mood: 'neutral',
        moodScore: 5,
        lastFocusDuration: 0,
        todayCompleted: { habits: 0, goals: 0, focusSessions: 0 },
        activeGoalsCount: 0,
        overdueGoalsCount: 0,
        totalHabits: 0,
        hasReflectionToday: false,
        systemLoad: 5,
        activeGoals: [],
        quickWins: []
    };
}

// ==================== AI-KERNEL (DECISION ENGINE) ====================

async function generateSystemPriority(userContext) {
    if (!genAI) {
        return getFallbackPriority(userContext);
    }
    
    const gemini31FlashLite = "gemini-1.5-flash";
    
    const systemPrompt = `Sen bir Life OS (Yaşam İşletim Sistemi) çekirdeğisin. Kullanıcının mevcut durumuna ve aktif hedeflerine bakarak, o anki en önemli öncelikli görevi belirlemelisin.

Kontekst verilerini analiz et:
- Enerji seviyesi (1-10): Düşük enerjide zor görevler yerine kolay/rahatlatıcı görevler öner
- Alev seviyesi: Düşükse alev kazandıran hızlı görevler öner
- Mood: Negatifse motivasyon artırıcı görevler öner
- Aktif hedefler: Var olan hedeflerden birini seç
- System Load: Yüksekse basit görevler, düşükse daha iddialı görevler

YANIT FORMATI (JSON):
{
    "priority": {
        "id": "task-identifier",
        "title": "Görev başlığı (maks 40 karakter)",
        "description": "Kısa açıklama (maks 80 karakter)",
        "type": "goal|habit|reflection|focus|rest",
        "reasoning": "Neden bu görev öncelikli? (1 cümle)",
        "estimatedTime": "X dk",
        "energyRequired": 1-10,
        "difficulty": "easy|medium|hard",
        "flameReward": sayı,
        "xpReward": sayı
    },
    "suggestions": [
        "İlk adım için öneri 1",
        "İlk adım için öneri 2"
    ]
}`;

    const contextPrompt = `KULLANICI KONTEKSTİ:
${JSON.stringify(userContext, null, 2)}

Şimdi bu kullanıcı için SYSTEM PRIORITY belirle.`;

    try {
        const model = genAI.getGenerativeModel({
            model: gemini31FlashLite,
            systemInstruction: systemPrompt,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800,
                responseMimeType: "application/json"
            }
        });
        
        const result = await model.generateContent(contextPrompt);
        const response = result.response.text();
        
        // Parse JSON response
        const priorityData = JSON.parse(response);
        
        // Add metadata
        priorityData.generatedAt = new Date().toISOString();
        priorityData.contextSnapshot = {
            energyLevel: userContext.energyLevel,
            mood: userContext.mood,
            flameLevel: userContext.flameLevel,
            systemLoad: userContext.systemLoad
        };
        
        return priorityData;
        
    } catch (error) {
        console.error('AI Kernel error:', error);
        return getFallbackPriority(userContext);
    }
}

function getFallbackPriority(userContext) {
    const { energyLevel, flameLevel, mood, systemLoad, activeGoals, hasReflectionToday } = userContext;
    
    // Smart fallback logic based on context
    
    // If low flame, suggest easy win
    if (flameLevel < 20) {
        return {
            priority: {
                id: 'quick-win',
                title: 'Hızlı Alev Kazan',
                description: '5 dk yansıma yazarak 10 alev kazan',
                type: 'reflection',
                reasoning: 'Alev seviyen düşük, hızlı kazanç sağlayacak görev',
                estimatedTime: '5 dk',
                energyRequired: 2,
                difficulty: 'easy',
                flameReward: 10,
                xpReward: 10
            },
            suggestions: [
                'Yansıma sekmesine git',
                'Bugün için 3 şey yaz: Başarı, gelişim, yarın hedefi'
            ],
            generatedAt: new Date().toISOString(),
            isFallback: true
        };
    }
    
    // If low energy, suggest rest or easy habit
    if (energyLevel <= 3) {
        return {
            priority: {
                id: 'low-energy-task',
                title: 'Enerji Yenileme',
                description: '15 dk meditasyon veya dinlenme',
                type: 'rest',
                reasoning: 'Enerji seviyen düşük, dinlenmeye ihtiyacın var',
                estimatedTime: '15 dk',
                energyRequired: 1,
                difficulty: 'easy',
                flameReward: 5,
                xpReward: 5
            },
            suggestions: [
                'Odaklanma modunda 15 dk sessizlik',
                'Kısa bir yürüyüş yap'
            ],
            generatedAt: new Date().toISOString(),
            isFallback: true
        };
    }
    
    // If no reflection today
    if (!hasReflectionToday) {
        return {
            priority: {
                id: 'daily-reflection',
                title: 'Günlük Yansıma',
                description: 'Bugünkü başarılarını ve yarın hedeflerini yaz',
                type: 'reflection',
                reasoning: 'Günlük yansıma henüz tamamlanmadı',
                estimatedTime: '5 dk',
                energyRequired: 2,
                difficulty: 'easy',
                flameReward: 10,
                xpReward: 10
            },
            suggestions: [
                'Yansıma sekmesine git',
                'Bugünkü en büyük başarını düşün'
            ],
            generatedAt: new Date().toISOString(),
            isFallback: true
        };
    }
    
    // If has active goals, pick first one
    if (activeGoals && activeGoals.length > 0) {
        const goal = activeGoals[0];
        return {
            priority: {
                id: `goal-${goal.id}`,
                title: goal.title,
                description: `Hedefine odaklan: ${goal.title}`,
                type: 'goal',
                reasoning: 'En yüksek öncelikli aktif hedefin',
                estimatedTime: '25-45 dk',
                energyRequired: 5,
                difficulty: 'medium',
                flameReward: goal.type === 'daily' ? 5 : (goal.type === 'weekly' ? 20 : 50),
                xpReward: goal.type === 'daily' ? 5 : (goal.type === 'weekly' ? 40 : 200)
            },
            suggestions: [
                'Focus mode aç ve 25 dk çalış',
                'Hedefi küçük parçalara böl'
            ],
            generatedAt: new Date().toISOString(),
            isFallback: true
        };
    }
    
    // Default fallback
    return {
        priority: {
            id: 'set-goal',
            title: 'Yeni Hedef Belirle',
            description: 'Hayatına yön verecek bir hedef oluştur',
            type: 'goal',
            reasoning: 'Aktif hedef bulunmuyor, yeni başlangıç zamanı',
            estimatedTime: '10 dk',
            energyRequired: 3,
            difficulty: 'easy',
            flameReward: 5,
            xpReward: 5
        },
        suggestions: [
            'Hedefler sekmesine git',
            'Bugün başlayabileceğin küçük bir hedef belirle'
        ],
        generatedAt: new Date().toISOString(),
        isFallback: true
    };
}

// ==================== API HANDLER ====================

export default async function handler(req, res) {
    const userId = getUserId(req);
    
    if (!userId) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    // GET /api/system-kernel - Get current system priority
    if (req.method === 'GET') {
        try {
            // Check cache first
            const cacheKey = `system-priority-${userId}`;
            const cacheData = await getKVData('system-kernel-cache') || {};
            const cached = cacheData[cacheKey];
            
            // Cache valid for 5 minutes
            if (cached && (Date.now() - new Date(cached.timestamp).getTime()) < 5 * 60 * 1000) {
                return res.status(200).json({
                    ...cached.data,
                    fromCache: true
                });
            }
            
            // Build user context
            const userContext = await buildUserContext(userId);
            
            // Generate system priority via AI
            const systemPriority = await generateSystemPriority(userContext);
            
            // Cache the result
            cacheData[cacheKey] = {
                timestamp: new Date().toISOString(),
                data: systemPriority
            };
            await setKVData('system-kernel-cache', cacheData);
            
            return res.status(200).json(systemPriority);
            
        } catch (error) {
            console.error('System kernel error:', error);
            return res.status(500).json({ 
                error: 'Sistem önceliği belirlenirken hata oluştu',
                priority: getFallbackPriority({ energyLevel: 5, flameLevel: 10, mood: 'neutral' }).priority
            });
        }
    }
    
    // POST /api/system-kernel/complete - Mark priority as completed
    if (req.method === 'POST') {
        try {
            const { priorityId } = req.body;
            
            if (!priorityId) {
                return res.status(400).json({ error: 'priorityId gerekli' });
            }
            
            // Get current user stats
            const allStats = await getKVData('user-stats') || {};
            const userStats = allStats[userId] || {
                userId,
                xp: 0,
                flameLevel: 0,
                level: 1,
                history: []
            };
            
            // Add system priority bonus XP
            const BONUS_XP = 5;
            userStats.xp += BONUS_XP;
            userStats.level = Math.floor(userStats.xp / 100) + 1;
            
            // Record in history
            userStats.history.push({
                type: 'system_priority_complete',
                xp: BONUS_XP,
                flame: 0,
                priorityId,
                timestamp: new Date().toISOString()
            });
            
            if (userStats.history.length > 100) {
                userStats.history = userStats.history.slice(-100);
            }
            
            allStats[userId] = userStats;
            await setKVData('user-stats', allStats);
            
            // Clear cache to force regeneration
            const cacheData = await getKVData('system-kernel-cache') || {};
            delete cacheData[`system-priority-${userId}`];
            await setKVData('system-kernel-cache', cacheData);
            
            return res.status(200).json({
                success: true,
                message: 'Sistem önceliği tamamlandı! +5 XP bonusu kazandın.',
                xpBonus: BONUS_XP,
                currentXP: userStats.xp,
                level: userStats.level
            });
            
        } catch (error) {
            console.error('Complete priority error:', error);
            return res.status(500).json({ error: 'Tamamlama işlemi sırasında hata oluştu' });
        }
    }
    
    return res.status(405).json({ error: 'İzin verilmeyen metod' });
}
