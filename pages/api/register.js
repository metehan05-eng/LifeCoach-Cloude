import { getKVData, setKVData } from '../../lib/db';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: "Please fill in all fields." });
        }

        if (typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ error: "Invalid email format." });
        }

        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters." });
        }

        const users = await getKVData('users');
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: "This email address is already in use." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: Date.now(), name, email, password: hashedPassword };
        users.push(newUser);
        await setKVData('users', users);

        return res.status(200).json({ success: true, user: { name, email, avatar: null } });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}