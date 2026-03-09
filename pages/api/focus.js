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

// GET /api/focus - Get focus sessions and stats
export default async function handler(req, res) {
    const user = authenticateToken(req);
    
    if (!user) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    const userId = user.id;
    
    // GET - Fetch focus sessions
    if (req.method === 'GET') {
        try {
            const allFocus = await getKVData('focus');
            const userFocus = allFocus[userId] || [];
            
            // Calculate stats
            const today = new Date().toISOString().split('T')[0];
            const todaySessions = userFocus.filter(s => s.date === today);
            const totalMinutes = userFocus.reduce((sum, s) => sum + (s.duration || 0), 0);
            const totalSessions = userFocus.length;
            
            // Calculate weekly stats
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 7);
            const weekSessions = userFocus.filter(s => new Date(s.startTime) >= weekStart);
            const weeklyMinutes = weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            
            return res.status(200).json({
                sessions: userFocus.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)),
                stats: {
                    totalSessions,
                    totalMinutes,
                    todaySessions: todaySessions.length,
                    todayMinutes: todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0),
                    weeklyMinutes,
                    currentStreak: calculateStreak(userFocus)
                }
            });
        } catch (error) {
            console.error('Get focus error:', error);
            return res.status(500).json({ error: 'Odak verileri yüklenirken hata oluştu' });
        }
    }
    
    // POST - Start or complete a focus session
    if (req.method === 'POST') {
        try {
            const { action, duration, startTime, endTime } = req.body;
            
            const allFocus = await getKVData('focus');
            const userFocus = allFocus[userId] || [];
            
            if (action === 'start') {
                // Start a new focus session
                const newSession = {
                    id: Date.now().toString(),
                    startTime: startTime || new Date().toISOString(),
                    endTime: null,
                    duration: 0,
                    date: new Date().toISOString().split('T')[0],
                    status: 'active'
                };
                
                userFocus.push(newSession);
                allFocus[userId] = userFocus;
                await setKVData('focus', allFocus);
                
                return res.status(201).json(newSession);
            }
            
            if (action === 'complete') {
                // Complete the most recent active session
                const activeSession = userFocus.find(s => s.status === 'active');
                
                if (!activeSession) {
                    return res.status(404).json({ error: 'Aktif oturum bulunamadı' });
                }
                
                const end = endTime ? new Date(endTime) : new Date();
                const start = new Date(activeSession.startTime);
                const sessionDuration = Math.round((end - start) / 60000); // minutes
                
                const updatedSession = {
                    ...activeSession,
                    endTime: end.toISOString(),
                    duration: sessionDuration,
                    status: 'completed'
                };
                
                const sessionIndex = userFocus.findIndex(s => s.id === activeSession.id);
                userFocus[sessionIndex] = updatedSession;
                allFocus[userId] = userFocus;
                await setKVData('focus', allFocus);
                
                return res.status(200).json(updatedSession);
            }
            
            return res.status(400).json({ error: 'Geçersiz eylem' });
        } catch (error) {
            console.error('Focus session error:', error);
            return res.status(500).json({ error: 'Oturum kaydedilirken hata oluştu' });
        }
    }
    
    // DELETE - Delete a focus session
    if (req.method === 'DELETE') {
        try {
            const { id } = req.body;
            
            if (!id) {
                return res.status(400).json({ error: 'Oturum ID gereklidir' });
            }
            
            const allFocus = await getKVData('focus');
            const userFocus = allFocus[userId] || [];
            
            const filteredSessions = userFocus.filter(s => s.id !== id);
            
            if (filteredSessions.length === userFocus.length) {
                return res.status(404).json({ error: 'Oturum bulunamadı' });
            }
            
            allFocus[userId] = filteredSessions;
            await setKVData('focus', allFocus);
            
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Delete focus error:', error);
            return res.status(500).json({ error: 'Oturum silinirken hata oluştu' });
        }
    }
    
    return res.status(405).json({ error: 'İzin verilmeyen metod' });
}

function calculateStreak(sessions) {
    if (!sessions || sessions.length === 0) return 0;
    
    const completedSessions = sessions.filter(s => s.status === 'completed');
    if (completedSessions.length === 0) return 0;
    
    // Get unique dates with sessions
    const dates = [...new Set(completedSessions.map(s => s.date))].sort().reverse();
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Check if there's a session today or yesterday
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
