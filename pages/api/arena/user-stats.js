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

        // Get user ID from JWT token (simple parsing)
        let userId;
        try {
            // Base64 decode JWT payload
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            userId = payload.sub || payload.user_id || 'user_' + Buffer.from(token).toString('base64').slice(0, 10);
        } catch (e) {
            userId = 'user_' + token.slice(0, 10);
        }

        // Get user profile from KV store
        const userProfile = await getKVData(`user_profile:${userId}`);
        
        if (!userProfile) {
            // Initialize new user
            const newProfile = {
                user_id: userId,
                total_xp: 0,
                level: 1,
                current_xp: 0,
                challenges_completed: 0,
                created_at: new Date().toISOString()
            };
            await setKVData(`user_profile:${userId}`, newProfile);
            return res.status(200).json(newProfile);
        }

        return res.status(200).json(userProfile);
    } catch (error) {
        console.error('User stats error:', error);
        return res.status(500).json({ error: 'Failed to fetch user stats' });
    }
}
