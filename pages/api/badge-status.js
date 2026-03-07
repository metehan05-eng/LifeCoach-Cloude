import { getKVData, setKVData } from '../../lib/db';

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        
        // Decode JWT to get user email (simple decode, not verification)
        let userEmail;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userEmail = payload.email;
        } catch (e) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        if (!userEmail) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Get user's badge data
        const allBadgeData = await getKVData('badge_data') || {};
        const userBadge = allBadgeData[userEmail] || {
            streak: 0,
            stars: 0,
            lastCheckIn: null,
            totalDays: 0
        };

        // Check if user has chatted today
        const today = new Date().toDateString();
        const hasChattedToday = userBadge.lastCheckIn === today;

        // Get check-in history
        const checkInHistory = await getKVData('checkin_history') || {};
        const userHistory = checkInHistory[userEmail] || [];
        
        // Calculate streak
        let streak = 0;
        if (userHistory.length > 0) {
            const sortedDates = userHistory.sort().reverse();
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);
            
            let checkDate = new Date(todayDate);
            for (let i = 0; i < sortedDates.length; i++) {
                const dateStr = sortedDates[i];
                const checkDateStr = checkDate.toDateString();
                
                if (dateStr === checkDateStr) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else if (i === 0 && dateStr === new Date(todayDate.getTime() - 86400000).toDateString()) {
                    // If first check-in was yesterday, start counting from there
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        // Calculate stars based on streak
        let stars = 0;
        if (streak >= 30) stars = 4;
        else if (streak >= 14) stars = 3;
        else if (streak >= 7) stars = 2;
        else if (streak >= 3) stars = 1;

        return res.status(200).json({
            streak: streak,
            stars: stars,
            chattedToday: hasChattedToday,
            totalDays: userHistory.length
        });

    } catch (error) {
        console.error('Badge status error:', error);
        return res.status(500).json({ error: error.message });
    }
}
