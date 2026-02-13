import { getKVData, setKVData } from '../../lib/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) return res.status(400).json({ error: "Please fill in all fields." });

        const users = await getKVData('users');
        const userIndex = users.findIndex(u => u.email === email);

        if (userIndex === -1) {
            return res.status(404).json({ error: "User not found with this email." });
        }

        users[userIndex].password = newPassword; // Not: Gerçek bir uygulamada şifre hashlenmelidir.
        await setKVData('users', users);

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}