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

// Helper: Calculate streak for a habit
function calculateStreak(completions) {
    if (!completions || completions.length === 0) return 0;
    
    // Sort completions by date descending
    const sortedDates = [...completions].sort((a, b) => new Date(b) - new Date(a));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastCompletion = new Date(sortedDates[0]);
    lastCompletion.setHours(0, 0, 0, 0);
    
    // If last completion wasn't today or yesterday, streak is broken
    if (lastCompletion < yesterday) {
        return 0;
    }
    
    let streak = 0;
    let currentDate = lastCompletion.getTime() === today.getTime() ? today : yesterday;
    
    for (let i = 0; i < sortedDates.length; i++) {
        const completionDate = new Date(sortedDates[i]);
        completionDate.setHours(0, 0, 0, 0);
        
        if (completionDate.getTime() === currentDate.getTime()) {
            streak++;
            currentDate = new Date(currentDate);
            currentDate.setDate(currentDate.getDate() - 1);
        } else if (completionDate.getTime() < currentDate.getTime()) {
            break;
        }
    }
    
    return streak;
}

// GET /api/habits - Get all habits for user
export default async function handler(req, res) {
    const user = authenticateToken(req);
    
    if (!user) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    const userId = user.id;
    
    // GET - Fetch habits
    if (req.method === 'GET') {
        try {
            const allHabits = await getKVData('habits');
            const userHabits = allHabits[userId] || [];
            
            // Calculate streaks and today's completion status
            const today = new Date().toISOString().split('T')[0];
            
            const habitsWithStats = userHabits.map(habit => {
                const completions = habit.completions || [];
                const streak = calculateStreak(completions);
                const completedToday = completions.includes(today);
                
                return {
                    ...habit,
                    streak,
                    completedToday
                };
            });
            
            // Sort by creation date (newest first)
            habitsWithStats.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            return res.status(200).json(habitsWithStats);
        } catch (error) {
            console.error('Get habits error:', error);
            return res.status(500).json({ error: 'Alışkanlıklar yüklenirken hata oluştu' });
        }
    }
    
    // POST - Create new habit
    if (req.method === 'POST') {
        try {
            const { name, description, frequency, icon, color } = req.body;
            
            if (!name) {
                return res.status(400).json({ error: 'Alışkanlık adı gereklidir' });
            }
            
            const allHabits = await getKVData('habits');
            const userHabits = allHabits[userId] || [];
            
            const newHabit = {
                id: Date.now().toString(),
                name,
                description: description || '',
                frequency: frequency || 'daily', // daily, weekly
                icon: icon || 'star',
                color: color || '#2DD4BF',
                completions: [], // Array of date strings (YYYY-MM-DD)
                streak: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            userHabits.push(newHabit);
            allHabits[userId] = userHabits;
            
            await setKVData('habits', allHabits);
            
            return res.status(201).json(newHabit);
        } catch (error) {
            console.error('Create habit error:', error);
            return res.status(500).json({ error: 'Alışkanlık oluşturulurken hata oluştu' });
        }
    }
    
    // PUT - Update habit
    if (req.method === 'PUT') {
        try {
            const { id, name, description, frequency, icon, color } = req.body;
            
            if (!id) {
                return res.status(400).json({ error: 'Alışkanlık ID gereklidir' });
            }
            
            const allHabits = await getKVData('habits');
            const userHabits = allHabits[userId] || [];
            
            const habitIndex = userHabits.findIndex(h => h.id === id);
            
            if (habitIndex === -1) {
                return res.status(404).json({ error: 'Alışkanlık bulunamadı' });
            }
            
            const updatedHabit = {
                ...userHabits[habitIndex],
                name: name !== undefined ? name : userHabits[habitIndex].name,
                description: description !== undefined ? description : userHabits[habitIndex].description,
                frequency: frequency !== undefined ? frequency : userHabits[habitIndex].frequency,
                icon: icon !== undefined ? icon : userHabits[habitIndex].icon,
                color: color !== undefined ? color : userHabits[habitIndex].color,
                updatedAt: new Date().toISOString()
            };
            
            userHabits[habitIndex] = updatedHabit;
            allHabits[userId] = userHabits;
            
            await setKVData('habits', allHabits);
            
            return res.status(200).json(updatedHabit);
        } catch (error) {
            console.error('Update habit error:', error);
            return res.status(500).json({ error: 'Alışkanlık güncellenirken hata oluştu' });
        }
    }
    
    // POST - Toggle habit completion for today
    if (req.method === 'POST' && req.body.action === 'toggle') {
        try {
            const { id } = req.body;
            
            if (!id) {
                return res.status(400).json({ error: 'Alışkanlık ID gereklidir' });
            }
            
            const allHabits = await getKVData('habits');
            const userHabits = allHabits[userId] || [];
            
            const habitIndex = userHabits.findIndex(h => h.id === id);
            
            if (habitIndex === -1) {
                return res.status(404).json({ error: 'Alışkanlık bulunamadı' });
            }
            
            const today = new Date().toISOString().split('T')[0];
            const completions = userHabits[habitIndex].completions || [];
            
            let updatedCompletions;
            let completed;
            
            if (completions.includes(today)) {
                updatedCompletions = completions.filter(d => d !== today);
                completed = false;
            } else {
                updatedCompletions = [...completions, today];
                completed = true;
            }
            
            const streak = calculateStreak(updatedCompletions);
            
            const updatedHabit = {
                ...userHabits[habitIndex],
                completions: updatedCompletions,
                streak,
                completedToday: completed,
                updatedAt: new Date().toISOString()
            };
            
            userHabits[habitIndex] = updatedHabit;
            allHabits[userId] = userHabits;
            
            await setKVData('habits', allHabits);
            
            return res.status(200).json(updatedHabit);
        } catch (error) {
            console.error('Toggle habit error:', error);
            return res.status(500).json({ error: 'Alışkanlık işaretlenirken hata oluştu' });
        }
    }
    
    // DELETE - Delete habit
    if (req.method === 'DELETE') {
        try {
            const { id } = req.body;
            
            if (!id) {
                return res.status(400).json({ error: 'Alışkanlık ID gereklidir' });
            }
            
            const allHabits = await getKVData('habits');
            const userHabits = allHabits[userId] || [];
            
            const filteredHabits = userHabits.filter(h => h.id !== id);
            
            if (filteredHabits.length === userHabits.length) {
                return res.status(404).json({ error: 'Alışkanlık bulunamadı' });
            }
            
            allHabits[userId] = filteredHabits;
            await setKVData('habits', allHabits);
            
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Delete habit error:', error);
            return res.status(500).json({ error: 'Alışkanlık silinirken hata oluştu' });
        }
    }
    
    return res.status(405).json({ error: 'İzin verilmeyen metod' });
}
