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

// GET /api/task-breakdown - Get all task breakdowns
export default async function handler(req, res) {
    const user = authenticateToken(req);
    
    if (!user) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    const userId = user.id;
    
    // GET - Fetch task breakdowns
    if (req.method === 'GET') {
        try {
            const allBreakdowns = await getKVData('task-breakdowns');
            const userBreakdowns = allBreakdowns[userId] || [];
            
            // Sort by creation date (newest first)
            userBreakdowns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            return res.status(200).json(userBreakdowns);
        } catch (error) {
            console.error('Get task-breakdowns error:', error);
            return res.status(500).json({ error: 'Görev parçaları yüklenirken hata oluştu' });
        }
    }
    
    // POST - Create new task breakdown (7, 14, 30, or 90 day)
    if (req.method === 'POST') {
        try {
            const { title, description, days, tasks } = req.body;
            
            if (!title || !days) {
                return res.status(400).json({ error: 'Başlık ve gün sayısı gereklidir' });
            }
            
            const validDays = [7, 14, 30, 90];
            if (!validDays.includes(Number(days))) {
                return res.status(400).json({ error: 'Gün sayısı 7, 14, 30 veya 90 olmalıdır' });
            }
            
            const allBreakdowns = await getKVData('task-breakdowns');
            const userBreakdowns = allBreakdowns[userId] || [];
            
            const newBreakdown = {
                id: Date.now().toString(),
                title,
                description: description || '',
                days: Number(days),
                tasks: tasks || [],
                status: 'in-progress',
                progress: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                completedAt: null
            };
            
            userBreakdowns.push(newBreakdown);
            allBreakdowns[userId] = userBreakdowns;
            
            await setKVData('task-breakdowns', allBreakdowns);
            
            return res.status(201).json(newBreakdown);
        } catch (error) {
            console.error('Create task-breakdown error:', error);
            return res.status(500).json({ error: 'Görev parçası oluşturulurken hata oluştu' });
        }
    }
    
    // PUT - Update task breakdown
    if (req.method === 'PUT') {
        try {
            const { id, title, description, tasks, status, progress } = req.body;
            
            if (!id) {
                return res.status(400).json({ error: 'Görev parçası ID gereklidir' });
            }
            
            const allBreakdowns = await getKVData('task-breakdowns');
            const userBreakdowns = allBreakdowns[userId] || [];
            
            const breakdownIndex = userBreakdowns.findIndex(b => b.id === id);
            
            if (breakdownIndex === -1) {
                return res.status(404).json({ error: 'Görev parçası bulunamadı' });
            }
            
            const wasCompleted = userBreakdowns[breakdownIndex].status === 'completed';
            
            const updatedBreakdown = {
                ...userBreakdowns[breakdownIndex],
                title: title !== undefined ? title : userBreakdowns[breakdownIndex].title,
                description: description !== undefined ? description : userBreakdowns[breakdownIndex].description,
                tasks: tasks !== undefined ? tasks : userBreakdowns[breakdownIndex].tasks,
                status: status !== undefined ? status : userBreakdowns[breakdownIndex].status,
                progress: progress !== undefined ? Math.min(100, Math.max(0, progress)) : userBreakdowns[breakdownIndex].progress,
                updatedAt: new Date().toISOString()
            };
            
            // Mark as completed if status is 'completed'
            if (status === 'completed' && !wasCompleted) {
                updatedBreakdown.completedAt = new Date().toISOString();
                
                // Add XP and Flame level reward for completing task breakdown
                try {
                    const allStats = await getKVData('user-stats') || {};
                    const userStats = allStats[userId] || {
                        userId,
                        xp: 0,
                        flameLevel: 0,
                        level: 1,
                        history: []
                    };

                    const rewardMap = {
                        7: { xp: 7, flame: 3 },
                        14: { xp: 10, flame: 7 },
                        30: { xp: 15, flame: 12 },
                        90: { xp: 40, flame: 20 }
                    };

                    const reward = rewardMap[userBreakdowns[breakdownIndex].days] || { xp: 0, flame: 0 };
                    userStats.xp += reward.xp;
                    userStats.flameLevel += reward.flame;
                    userStats.level = Math.floor(userStats.xp / 100) + 1;

                    userStats.history.push({
                        type: `task_${userBreakdowns[breakdownIndex].days}day`,
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
                    console.error('Failed to add reward for task breakdown completion:', error);
                }
            }
            
            userBreakdowns[breakdownIndex] = updatedBreakdown;
            allBreakdowns[userId] = userBreakdowns;
            
            await setKVData('task-breakdowns', allBreakdowns);
            
            return res.status(200).json(updatedBreakdown);
        } catch (error) {
            console.error('Update task-breakdown error:', error);
            return res.status(500).json({ error: 'Görev parçası güncellenirken hata oluştu' });
        }
    }
    
    // DELETE - Delete task breakdown
    if (req.method === 'DELETE') {
        try {
            const { id } = req.body;
            
            if (!id) {
                return res.status(400).json({ error: 'Görev parçası ID gereklidir' });
            }
            
            const allBreakdowns = await getKVData('task-breakdowns');
            const userBreakdowns = allBreakdowns[userId] || [];
            
            const filteredBreakdowns = userBreakdowns.filter(b => b.id !== id);
            
            if (filteredBreakdowns.length === userBreakdowns.length) {
                return res.status(404).json({ error: 'Görev parçası bulunamadı' });
            }
            
            allBreakdowns[userId] = filteredBreakdowns;
            await setKVData('task-breakdowns', allBreakdowns);
            
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Delete task-breakdown error:', error);
            return res.status(500).json({ error: 'Görev parçası silinirken hata oluştu' });
        }
    }
    
    return res.status(405).json({ error: 'İzin verilmeyen metod' });
}
