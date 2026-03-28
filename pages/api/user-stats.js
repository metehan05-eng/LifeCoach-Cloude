import { getKVData, setKVData } from '../../lib/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';

// Helper: Get user ID from token or session
function getUserId(req) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            return decoded.id;
        } catch (err) {
            return null;
        }
    }
    
    // For free users, use session ID
    return req.headers['x-session-id'] || 'free-user';
}

// XP ve Alev Seviyesi Kazanç Tablosu
const REWARDS = {
    // Yansıma (Reflections)
    reflection: { xp: 10, flame: 15 },
    // Duygu Günlüğü (Journal/Mood)
    journal: { xp: 10, flame: 15 },
    
    // Hedefler (Goals)
    goal_daily: { xp: 5, flame: 10 },
    goal_weekly: { xp: 40, flame: 50 },
    goal_monthly: { xp: 200, flame: 150 },
    goal_yearly: { xp: 1000, flame: 500 },
    
    // Odaklanma (Focus)
    focus_session: { xp: 20, flame: 5 },
    
    // Görev Parçala (Task Breakdown)
    task_7day: { xp: 15, flame: 10 },
    task_14day: { xp: 35, flame: 25 },
    task_30day: { xp: 80, flame: 60 },
    task_90day: { xp: 300, flame: 200 },
    
    // Planlar (Plans)
    plan_daily: { xp: 15, flame: 10 },
    plan_weekly: { xp: 50, flame: 40 },
    plan_monthly: { xp: 150, flame: 100 },
    plan_project: { xp: 750, flame: 300 },
};

// Alev Seviyesi Harcaması
const CONSUMPTION = {
    waffle_ai_image: 10, // AI resim oluşturma
    xp_boost: 50, // AI Arena'da 1 saatlik %20 XP Boost
    deep_analysis: 100, // Akıllı Koç'tan Derin Analiz raporu (PDF)
};

// GET - Get user stats (XP, Flame Level)
async function getStats(req, res) {
    const userId = getUserId(req);
    if (!userId) {
        return res.status(400).json({ error: 'Kullanıcı ID belirlenemedi' });
    }

    try {
        const allStats = await getKVData('user-stats') || {};
        const userStats = allStats[userId] || {
            userId,
            xp: 0,
            flameLevel: 0,
            level: 1,
            history: []
        };

        return res.status(200).json(userStats);
    } catch (error) {
        console.error('Get stats error:', error);
        return res.status(500).json({ error: 'İstatistikler yüklenirken hata oluştu' });
    }
}

// POST - Add XP and Flame Level
async function addReward(req, res) {
    const userId = getUserId(req);
    if (!userId) {
        return res.status(400).json({ error: 'Kullanıcı ID belirlenemedi' });
    }

    try {
        const { rewardType, amount } = req.body;

        if (!rewardType) {
            return res.status(400).json({ error: 'Ödül türü gereklidir' });
        }

        const reward = REWARDS[rewardType] || { xp: amount || 0, flame: 0 };
        
        const allStats = await getKVData('user-stats') || {};
        const userStats = allStats[userId] || {
            userId,
            xp: 0,
            flameLevel: 0,
            level: 1,
            history: []
        };

        // Add rewards
        userStats.xp += reward.xp;
        userStats.flameLevel += reward.flame;

        // Calculate level (every 100 XP = 1 level)
        userStats.level = Math.floor(userStats.xp / 100) + 1;

        // Add to history
        userStats.history.push({
            type: rewardType,
            xp: reward.xp,
            flame: reward.flame,
            timestamp: new Date().toISOString()
        });

        // Keep only last 100 history items
        if (userStats.history.length > 100) {
            userStats.history = userStats.history.slice(-100);
        }

        allStats[userId] = userStats;
        await setKVData('user-stats', allStats);

        return res.status(200).json(userStats);
    } catch (error) {
        console.error('Add reward error:', error);
        return res.status(500).json({ error: 'Ödül eklenirken hata oluştu' });
    }
}

// POST - Consume Flame Level
async function consumeFlame(req, res) {
    const userId = getUserId(req);
    if (!userId) {
        return res.status(400).json({ error: 'Kullanıcı ID belirlenemedi' });
    }

    try {
        const { consumeType } = req.body;

        if (!consumeType || !CONSUMPTION[consumeType]) {
            return res.status(400).json({ error: 'Geçerli harcama türü değil' });
        }

        const cost = CONSUMPTION[consumeType];

        const allStats = await getKVData('user-stats') || {};
        const userStats = allStats[userId] || {
            userId,
            xp: 0,
            flameLevel: 0,
            level: 1,
            history: []
        };

        if (userStats.flameLevel < cost) {
            return res.status(400).json({ 
                error: `Yeterli alev seviyesi yok. Gerekli: ${cost}, Mevcut: ${userStats.flameLevel}` 
            });
        }

        userStats.flameLevel -= cost;

        allStats[userId] = userStats;
        await setKVData('user-stats', allStats);

        return res.status(200).json(userStats);
    } catch (error) {
        console.error('Consume flame error:', error);
        return res.status(500).json({ error: 'Alev seviyesi harcanırken hata oluştu' });
    }
}

export default async function handler(req, res) {
    if (req.method === 'GET') {
        return getStats(req, res);
    } else if (req.method === 'POST') {
        const { action } = req.body;
        
        if (action === 'consume') {
            return consumeFlame(req, res);
        } else {
            return addReward(req, res);
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
