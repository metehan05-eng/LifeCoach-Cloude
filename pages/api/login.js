import { getKVData } from '../../lib/db';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Invalid email or password." });

        const users = await getKVData('users');
        const user = users.find(u => u.email === email && u.password === password);

        if (user) return res.status(200).json({ success: true, user: { name: user.name, email: user.email } });
        else return res.status(401).json({ error: "Invalid email or password." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}