import { getKVData, setKVData } from '../../../lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Get current user ID
        let currentUserId;
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            currentUserId = payload.sub || payload.user_id || 'user_' + Buffer.from(token).toString('base64').slice(0, 10);
        } catch (e) {
            currentUserId = 'user_' + token.slice(0, 10);
        }

        // Get all user profiles from KV store
        // For simplicity, we'll get a predefined list of users
        const usersData = await getKVData('all_users');
        const userIds = usersData?.userIds || [currentUserId];

        // Fetch all user profiles and sort by XP
        const leaderboard = [];
        
        for (const userId of userIds) {
            const profile = await getKVData(`user_profile:${userId}`);
            if (profile) {
                leaderboard.push({
                    user_id: userId,
                    name: profile.name || `User ${userId.slice(-6)}`,
                    total_xp: profile.total_xp || 0,
                    level: profile.level || 1,
                    current_xp: profile.current_xp || 0,
                    me: userId === currentUserId
                });
            }
        }

        // Sort by XP (descending)
        leaderboard.sort((a, b) => b.total_xp - a.total_xp);

        // Add rank
        const leaderboardWithRank = leaderboard.map((entry, index) => ({
            ...entry,
            rank: index + 1
        }));

        return res.status(200).json(leaderboardWithRank);
    } catch (error) {
        console.error('Leaderboard error:', error);
        return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
}
