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

        // Get current user profile first
        let currentProfile = await getKVData(`user_profile:${currentUserId}`);
        if (!currentProfile) {
            currentProfile = {
                user_id: currentUserId,
                total_xp: 0,
                level: 1,
                current_xp: 0,
                created_at: new Date().toISOString()
            };
            await setKVData(`user_profile:${currentUserId}`, currentProfile);
        }

        // Mock leaderboard with current user and sample users
        const leaderboard = [
            {
                user_id: currentUserId,
                name: `You`,
                total_xp: currentProfile.total_xp || 0,
                level: currentProfile.level || 1,
                current_xp: currentProfile.current_xp || 0,
                me: true,
                rank: 1
            },
            {
                user_id: 'user_2',
                name: 'Başarılı Koçu',
                total_xp: 2500,
                level: 5,
                current_xp: 250,
                me: false,
                rank: 2
            },
            {
                user_id: 'user_3',
                name: 'Meditasyon Ustası',
                total_xp: 1800,
                level: 4,
                current_xp: 300,
                me: false,
                rank: 3
            }
        ];

        // Sort by XP (descending) and update ranks
        leaderboard.sort((a, b) => b.total_xp - a.total_xp);
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
