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

// GET /api/reflections - Get all reflections
export default async function handler(req, res) {
    const user = authenticateToken(req);
    
    if (!user) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    const userId = user.id;
    
    // GET - Fetch reflections
    if (req.method === 'GET') {
        try {
            const allReflections = await getKVData('reflections');
            const userReflections = allReflections[userId] || [];
            
            // Sort by creation date (newest first)
            userReflections.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            // Get today's reflection if exists
            const today = new Date().toISOString().split('T')[0];
            const todayReflection = userReflections.find(r => r.date === today);
            
            // Calculate streak
            const streak = calculateReflectionStreak(userReflections);
            
            return res.status(200).json({
                reflections: userReflections,
                todayReflection,
                streak,
                totalReflections: userReflections.length
            });
        } catch (error) {
            console.error('Get reflections error:', error);
            return res.status(500).json({ error: 'Yansımalar yüklenirken hata oluştu' });
        }
    }
    
    // POST - Create new reflection
    if (req.method === 'POST') {
        try {
            const { content, type, mood, achievements, improvements, tomorrowGoals } = req.body;
            
            if (!content) {
                return res.status(400).json({ error: 'İçerik gereklidir' });
            }
            
            const validTypes = ['daily', 'weekly', 'monthly'];
            const reflectionType = validTypes.includes(type) ? type : 'daily';
            
            const allReflections = await getKVData('reflections');
            const userReflections = allReflections[userId] || [];
            
            const today = new Date().toISOString().split('T')[0];
            
            // Check if already reflected today
            const existingToday = userReflections.find(r => r.date === today && r.type === reflectionType);
            
            const newReflection = {
                id: Date.now().toString(),
                content,
                type: reflectionType,
                mood: mood || 'neutral',
                achievements: achievements || '',
                improvements: improvements || '',
                tomorrowGoals: tomorrowGoals || '',
                date: today,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            if (existingToday) {
                // Update existing reflection
                const index = userReflections.findIndex(r => r.id === existingToday.id);
                userReflections[index] = {
                    ...existingToday,
                    ...newReflection,
                    id: existingToday.id,
                    createdAt: existingToday.createdAt,
                    updatedAt: new Date().toISOString()
                };
            } else {
                userReflections.push(newReflection);
            }
            
            allReflections[userId] = userReflections;
            await setKVData('reflections', allReflections);
            
            // Add XP and Flame level reward for reflection (only for new reflections, not updates)
            if (!existingToday) {
                try {
                    const allStats = await getKVData('user-stats') || {};
                    const userStats = allStats[userId] || {
                        userId,
                        xp: 0,
                        flameLevel: 0,
                        level: 1,
                        history: []
                    };

                    const reward = { xp: 5, flame: 10 };
                    userStats.xp += reward.xp;
                    userStats.flameLevel += reward.flame;
                    userStats.level = Math.floor(userStats.xp / 100) + 1;

                    userStats.history.push({
                        type: 'reflection',
                        xp: reward.xp,
                        flame: reward.flame,
                        timestamp: new Date().toISOString()
                    });

                    if (userStats.history.length > 100) {
                        userStats.history = userStats.history.slice(-100);
                    }

                    allStats[userId] = userStats;
                    await setKVData('user-stats', allStats);
                } catch (error) {
                    console.error('Failed to add reward for reflection:', error);
                }
            }
            
            return res.status(201).json(existingToday ? userReflections.find(r => r.id === existingToday.id) : newReflection);
        } catch (error) {
            console.error('Create reflection error:', error);
            return res.status(500).json({ error: 'Yansıma kaydedilirken hata oluştu' });
        }
    }
    
    // PUT - Update reflection
    if (req.method === 'PUT') {
        try {
            const { id, content, type, mood, achievements, improvements, tomorrowGoals } = req.body;
            
            if (!id) {
                return res.status(400).json({ error: 'Yansıma ID gereklidir' });
            }
            
            const allReflections = await getKVData('reflections');
            const userReflections = allReflections[userId] || [];
            
            const reflectionIndex = userReflections.findIndex(r => r.id === id);
            
            if (reflectionIndex === -1) {
                return res.status(404).json({ error: 'Yansıma bulunamadı' });
            }
            
            const updatedReflection = {
                ...userReflections[reflectionIndex],
                content: content !== undefined ? content : userReflections[reflectionIndex].content,
                type: type !== undefined ? type : userReflections[reflectionIndex].type,
                mood: mood !== undefined ? mood : userReflections[reflectionIndex].mood,
                achievements: achievements !== undefined ? achievements : userReflections[reflectionIndex].achievements,
                improvements: improvements !== undefined ? improvements : userReflections[reflectionIndex].improvements,
                tomorrowGoals: tomorrowGoals !== undefined ? tomorrowGoals : userReflections[reflectionIndex].tomorrowGoals,
                updatedAt: new Date().toISOString()
            };
            
            userReflections[reflectionIndex] = updatedReflection;
            allReflections[userId] = userReflections;
            
            await setKVData('reflections', allReflections);
            
            return res.status(200).json(updatedReflection);
        } catch (error) {
            console.error('Update reflection error:', error);
            return res.status(500).json({ error: 'Yansıma güncellenirken hata oluştu' });
        }
    }
    
    // DELETE - Delete reflection
    if (req.method === 'DELETE') {
        try {
            const { id } = req.body;
            
            if (!id) {
                return res.status(400).json({ error: 'Yansıma ID gereklidir' });
            }
            
            const allReflections = await getKVData('reflections');
            const userReflections = allReflections[userId] || [];
            
            const filteredReflections = userReflections.filter(r => r.id !== id);
            
            if (filteredReflections.length === userReflections.length) {
                return res.status(404).json({ error: 'Yansıma bulunamadı' });
            }
            
            allReflections[userId] = filteredReflections;
            await setKVData('reflections', allReflections);
            
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Delete reflection error:', error);
            return res.status(500).json({ error: 'Yansıma silinirken hata oluştu' });
        }
    }
    
    return res.status(405).json({ error: 'İzin verilmeyen metod' });
}

function calculateReflectionStreak(reflections) {
    if (!reflections || reflections.length === 0) return 0;
    
    const dates = [...new Set(reflections.map(r => r.date))].sort().reverse();
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Check if there's a reflection today or yesterday
    if (dates[0] !== today && dates[0] !== yesterdayStr) {
        return 0;
    }
    
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
        const current = new Date(dates[i - 1]);
        const prev = new Date(dates[i]);
        const diffDays = Math.round((current - prev) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}
