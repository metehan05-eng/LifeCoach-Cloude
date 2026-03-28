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

// GET /api/plans - Get all plans for user
export default async function handler(req, res) {
    const user = authenticateToken(req);
    
    if (!user) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    const userId = user.id;
    
    // GET - Fetch plans
    if (req.method === 'GET') {
        try {
            const allPlans = await getKVData('plans');
            const userPlans = allPlans[userId] || [];
            
            // Sort by creation date (newest first)
            userPlans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            return res.status(200).json(userPlans);
        } catch (error) {
            console.error('Get plans error:', error);
            return res.status(500).json({ error: 'Planlar yüklenirken hata oluştu' });
        }
    }
    
    // POST - Create new plan (from AI or manual)
    if (req.method === 'POST') {
        try {
            const { title, type, description, tasks, aiGenerated } = req.body;
            
            if (!title || !type) {
                return res.status(400).json({ error: 'Başlık ve tür gereklidir' });
            }
            
            const validTypes = ['daily', 'weekly', 'monthly', 'project'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({ error: 'Geçersiz plan türü' });
            }
            
            const allPlans = await getKVData('plans');
            const userPlans = allPlans[userId] || [];
            
            const newPlan = {
                id: Date.now().toString(),
                title,
                type,
                description: description || '',
                tasks: tasks || [], // Array of task objects: { id, time, task, priority, status }
                aiGenerated: aiGenerated || false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            userPlans.push(newPlan);
            allPlans[userId] = userPlans;
            
            await setKVData('plans', allPlans);
            
            return res.status(201).json(newPlan);
        } catch (error) {
            console.error('Create plan error:', error);
            return res.status(500).json({ error: 'Plan oluşturulurken hata oluştu' });
        }
    }
    
    // PUT - Update plan
    if (req.method === 'PUT') {
        try {
            const { id, title, type, description, tasks } = req.body;
            
            if (!id) {
                return res.status(400).json({ error: 'Plan ID gereklidir' });
            }
            
            const allPlans = await getKVData('plans');
            const userPlans = allPlans[userId] || [];
            
            const planIndex = userPlans.findIndex(p => p.id === id);
            
            if (planIndex === -1) {
                return res.status(404).json({ error: 'Plan bulunamadı' });
            }
            
            const updatedPlan = {
                ...userPlans[planIndex],
                title: title !== undefined ? title : userPlans[planIndex].title,
                type: type !== undefined ? type : userPlans[planIndex].type,
                description: description !== undefined ? description : userPlans[planIndex].description,
                tasks: tasks !== undefined ? tasks : userPlans[planIndex].tasks,
                updatedAt: new Date().toISOString()
            };
            
            userPlans[planIndex] = updatedPlan;
            allPlans[userId] = userPlans;
            
            await setKVData('plans', allPlans);
            
            return res.status(200).json(updatedPlan);
        } catch (error) {
            console.error('Update plan error:', error);
            return res.status(500).json({ error: 'Plan güncellenirken hata oluştu' });
        }
    }
    
    // PUT - Update single task status
    if (req.method === 'PUT' && req.body.action === 'updateTask') {
        try {
            const { planId, taskId, status } = req.body;
            
            if (!planId || !taskId) {
                return res.status(400).json({ error: 'Plan ID ve Görev ID gereklidir' });
            }
            
            const allPlans = await getKVData('plans');
            const userPlans = allPlans[userId] || [];
            
            const planIndex = userPlans.findIndex(p => p.id === planId);
            
            if (planIndex === -1) {
                return res.status(404).json({ error: 'Plan bulunamadı' });
            }
            
            const tasks = userPlans[planIndex].tasks || [];
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            
            if (taskIndex === -1) {
                return res.status(404).json({ error: 'Görev bulunamadı' });
            }
            
            tasks[taskIndex] = {
                ...tasks[taskIndex],
                status: status || tasks[taskIndex].status
            };
            
            userPlans[planIndex] = {
                ...userPlans[planIndex],
                tasks,
                updatedAt: new Date().toISOString()
            };
            
            allPlans[userId] = userPlans;
            await setKVData('plans', allPlans);
            
            return res.status(200).json(userPlans[planIndex]);
        } catch (error) {
            console.error('Update task error:', error);
            return res.status(500).json({ error: 'Görev güncellenirken hata oluştu' });
        }
    }

    // PUT - Complete plan (mark as done and give rewards)
    if (req.method === 'PUT' && req.body.action === 'complete') {
        try {
            const { planId } = req.body;

            if (!planId) {
                return res.status(400).json({ error: 'Plan ID gereklidir' });
            }

            const allPlans = await getKVData('plans');
            const userPlans = allPlans[userId] || [];

            const planIndex = userPlans.findIndex(p => p.id === planId);

            if (planIndex === -1) {
                return res.status(404).json({ error: 'Plan bulunamadı' });
            }

            const plan = userPlans[planIndex];
            const wasCompleted = plan.status === 'completed';

            const updatedPlan = {
                ...plan,
                status: 'completed',
                completedAt: plan.completedAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            userPlans[planIndex] = updatedPlan;
            allPlans[userId] = userPlans;
            await setKVData('plans', allPlans);

            // Add XP and Flame level reward for completing plan (only if not already completed)
            if (!wasCompleted) {
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
                        'daily': { xp: 10, flame: 10 },
                        'weekly': { xp: 15, flame: 15 },
                        'monthly': { xp: 25, flame: 25 },
                        'project': { xp: 500, flame: 100 }
                    };

                    const reward = rewardMap[plan.type] || { xp: 0, flame: 0 };
                    userStats.xp += reward.xp;
                    userStats.flameLevel += reward.flame;
                    userStats.level = Math.floor(userStats.xp / 100) + 1;

                    userStats.history.push({
                        type: `plan_${plan.type}`,
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
                    console.error('Failed to add reward for plan completion:', error);
                }
            }

            return res.status(200).json(updatedPlan);
        } catch (error) {
            console.error('Complete plan error:', error);
            return res.status(500).json({ error: 'Plan tamamlanırken hata oluştu' });
        }
    }
    
    // DELETE - Delete plan
    if (req.method === 'DELETE') {
        try {
            const { id } = req.body;
            
            if (!id) {
                return res.status(400).json({ error: 'Plan ID gereklidir' });
            }
            
            const allPlans = await getKVData('plans');
            const userPlans = allPlans[userId] || [];
            
            const filteredPlans = userPlans.filter(p => p.id !== id);
            
            if (filteredPlans.length === userPlans.length) {
                return res.status(404).json({ error: 'Plan bulunamadı' });
            }
            
            allPlans[userId] = filteredPlans;
            await setKVData('plans', allPlans);
            
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Delete plan error:', error);
            return res.status(500).json({ error: 'Plan silinirken hata oluştu' });
        }
    }
    
    return res.status(405).json({ error: 'İzin verilmeyen metod' });
}
