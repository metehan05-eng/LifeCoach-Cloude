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

// GET /api/goals - Get all goals for user
export default async function handler(req, res) {
    const user = authenticateToken(req);
    
    if (!user) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    const userId = user.id;
    
    // GET - Fetch goals
    if (req.method === 'GET') {
        try {
            const allGoals = await getKVData('goals');
            const userGoals = allGoals[userId] || [];
            
            // Sort by creation date (newest first)
            userGoals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            return res.status(200).json(userGoals);
        } catch (error) {
            console.error('Get goals error:', error);
            return res.status(500).json({ error: 'Hedefler yüklenirken hata oluştu' });
        }
    }
    
    // POST - Create new goal
    if (req.method === 'POST') {
        try {
            const { title, type, description, targetDate } = req.body;
            
            if (!title || !type) {
                return res.status(400).json({ error: 'Başlık ve tür gereklidir' });
            }
            
            const validTypes = ['daily', 'weekly', 'monthly', 'yearly'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({ error: 'Geçersiz hedef türü' });
            }
            
            const allGoals = await getKVData('goals');
            const userGoals = allGoals[userId] || [];
            
            const newGoal = {
                id: Date.now().toString(),
                title,
                type,
                description: description || '',
                progress: 0,
                status: 'in-progress', // in-progress, completed, paused
                targetDate: targetDate || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                completedAt: null
            };
            
            userGoals.push(newGoal);
            allGoals[userId] = userGoals;
            
            await setKVData('goals', allGoals);
            
            return res.status(201).json(newGoal);
        } catch (error) {
            console.error('Create goal error:', error);
            return res.status(500).json({ error: 'Hedef oluşturulurken hata oluştu' });
        }
    }
    
    // PUT - Update goal
    if (req.method === 'PUT') {
        try {
            const { id, title, type, description, progress, status, targetDate } = req.body;
            
            if (!id) {
                return res.status(400).json({ error: 'Hedef ID gereklidir' });
            }
            
            const allGoals = await getKVData('goals');
            const userGoals = allGoals[userId] || [];
            
            const goalIndex = userGoals.findIndex(g => g.id === id);
            
            if (goalIndex === -1) {
                return res.status(404).json({ error: 'Hedef bulunamadı' });
            }
            
            const updatedGoal = {
                ...userGoals[goalIndex],
                title: title !== undefined ? title : userGoals[goalIndex].title,
                type: type !== undefined ? type : userGoals[goalIndex].type,
                description: description !== undefined ? description : userGoals[goalIndex].description,
                progress: progress !== undefined ? Math.min(100, Math.max(0, progress)) : userGoals[goalIndex].progress,
                status: status !== undefined ? status : userGoals[goalIndex].status,
                targetDate: targetDate !== undefined ? targetDate : userGoals[goalIndex].targetDate,
                updatedAt: new Date().toISOString()
            };
            
            if (status === 'completed' && !userGoals[goalIndex].completedAt) {
                updatedGoal.completedAt = new Date().toISOString();
            }
            
            userGoals[goalIndex] = updatedGoal;
            allGoals[userId] = userGoals;
            
            await setKVData('goals', allGoals);
            
            return res.status(200).json(updatedGoal);
        } catch (error) {
            console.error('Update goal error:', error);
            return res.status(500).json({ error: 'Hedef güncellenirken hata oluştu' });
        }
    }
    
    // DELETE - Delete goal
    if (req.method === 'DELETE') {
        try {
            const { id } = req.body;
            
            if (!id) {
                return res.status(400).json({ error: 'Hedef ID gereklidir' });
            }
            
            const allGoals = await getKVData('goals');
            const userGoals = allGoals[userId] || [];
            
            const filteredGoals = userGoals.filter(g => g.id !== id);
            
            if (filteredGoals.length === userGoals.length) {
                return res.status(404).json({ error: 'Hedef bulunamadı' });
            }
            
            allGoals[userId] = filteredGoals;
            await setKVData('goals', allGoals);
            
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Delete goal error:', error);
            return res.status(500).json({ error: 'Hedef silinirken hata oluştu' });
        }
    }
    
    return res.status(405).json({ error: 'İzin verilmeyen metod' });
}
