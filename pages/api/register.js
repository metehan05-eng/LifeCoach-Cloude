import { getKVData, setKVData } from '../../lib/db';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: "Please fill in all fields." });

        const users = await getKVData('users');
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: "This email address is already in use." });
        }

        const newUser = { id: Date.now(), name, email, password };
        users.push(newUser);
        await setKVData('users', users);

        return res.status(200).json({ success: true, user: { name, email } });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}