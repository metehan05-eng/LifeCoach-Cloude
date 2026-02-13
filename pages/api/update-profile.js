import { getKVData, setKVData } from '../../lib/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { email, newName } = req.body;
        if (!email || !newName) return res.status(400).json({ error: "Invalid request." });

        const users = await getKVData('users');
        const userIndex = users.findIndex(u => u.email === email);

        if (userIndex === -1) {
            return res.status(404).json({ error: "User not found." });
        }

        if (users.some(u => u.name === newName && u.email !== email)) {
            return res.status(400).json({ error: "This username is already taken." });
        }

        users[userIndex].name = newName;
        await setKVData('users', users);

        return res.status(200).json({ success: true, user: { name: newName, email: email } });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}