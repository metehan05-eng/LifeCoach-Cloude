import { getKVData } from '../../lib/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required." });

        const users = await getKVData('users');
        const user = users.find(u => u.email === email);

        if (user && user.sessions) {
            const history = user.sessions.map(s => ({ id: s.id, title: s.title }));
            return res.status(200).json(history);
        }
        return res.status(200).json([]);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}