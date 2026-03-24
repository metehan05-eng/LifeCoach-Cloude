import { getKVData, setKVData } from '../../../lib/db.js';

const XP_PER_LEVEL = 500; // XP to level up

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const { xpGained, reason } = req.body;

        if (!xpGained || xpGained <= 0) {
            return res.status(400).json({ error: 'Invalid XP amount' });
        }

        // Get user ID from JWT token
        let userId;
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            userId = payload.sub || payload.user_id || 'user_' + Buffer.from(token).toString('base64').slice(0, 10);
        } catch (e) {
            userId = 'user_' + token.slice(0, 10);
        }

        // Get current user profile
        let userProfile = await getKVData(`user_profile:${userId}`);
        
        if (!userProfile) {
            userProfile = {
                user_id: userId,
                total_xp: 0,
                level: 1,
                current_xp: 0,
                challenges_completed: 0,
                created_at: new Date().toISOString()
            };
        }

        // Update XP
        userProfile.total_xp += xpGained;
        userProfile.current_xp += xpGained;

        let levelUp = false;
        
        // Check for level up
        while (userProfile.current_xp >= XP_PER_LEVEL) {
            userProfile.level += 1;
            userProfile.current_xp -= XP_PER_LEVEL;
            levelUp = true;
        }

        // Save updated profile
        await setKVData(`user_profile:${userId}`, userProfile);

        // Add to user activity log
        const activityLog = await getKVData(`user_activity:${userId}`) || [];
        activityLog.push({
            timestamp: new Date().toISOString(),
            type: 'xp_gained',
            amount: xpGained,
            reason: reason || 'Activity completed'
        });
        await setKVData(`user_activity:${userId}`, activityLog.slice(-100)); // Keep last 100 entries

        return res.status(200).json({
            success: true,
            updatedStats: userProfile,
            levelUp: levelUp,
            xpGained: xpGained
        });
    } catch (error) {
        console.error('XP update error:', error);
        return res.status(500).json({ error: 'Failed to update XP' });
    }
}
