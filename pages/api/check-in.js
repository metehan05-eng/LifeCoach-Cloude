import { getKVData, setKVData } from '../../lib/db';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
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

        const today = new Date().toDateString();
        
        // Get check-in history
        const checkInHistory = await getKVData('checkin_history') || {};
        const userHistory = checkInHistory[userEmail] || [];
        
        // Check if already checked in today
        if (userHistory.includes(today)) {
            return res.status(200).json({ 
                message: 'Zaten bugün check-in yaptınız! 🎉',
                alreadyCheckedIn: true
            });
        }

        // Add today to check-in history
        userHistory.push(today);
        checkInHistory[userEmail] = userHistory;
        await setKVData('checkin_history', checkInHistory);

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
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        // Calculate stars
        let stars = 0;
        let newStar = false;
        if (streak >= 30) stars = 4;
        else if (streak >= 14) stars = 3;
        else if (streak >= 7) stars = 2;
        else if (streak >= 3) stars = 1;

        // Check if user just earned a new star
        let oldStars = 0;
        if (streak - 1 >= 30) oldStars = 4;
        else if (streak - 1 >= 14) oldStars = 3;
        else if (streak - 1 >= 7) oldStars = 2;
        else if (streak - 1 >= 3) oldStars = 1;
        
        newStar = stars > oldStars;

        // Get milestone info
        let milestone = null;
        const nextMilestone = streak < 3 ? 3 : streak < 7 ? 7 : streak < 14 ? 14 : streak < 30 ? 30 : null;
        
        let message = `Check-in başarılı! 🔥 ${streak} günlük seri`;
        if (newStar) {
            message = `🎉 Tebrikler! Yeni bir yıldız kazandınız! (${stars} ⭐)`;
        } else if (nextMilestone) {
            message += `. ${nextMilestone - streak} gün sonra yeni yıldız!`;
        }

        return res.status(200).json({
            success: true,
            message: message,
            streak: streak,
            stars: stars,
            newStar: newStar,
            totalDays: userHistory.length
        });

    } catch (error) {
        console.error('Check-in error:', error);
        return res.status(500).json({ error: error.message });
    }
}
