import { getKVData } from '../../lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Invalid email or password." });

        const users = await getKVData('users');
        const user = users.find(u => u.email === email);

        if (!user) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        // Backward compatibility: support old plain-text password records.
        const isLegacyPlainText = typeof user.password === 'string' && !user.password.startsWith('$2');
        const validPassword = isLegacyPlainText
            ? user.password === password
            : await bcrypt.compare(password, user.password || '');

        if (!validPassword) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, type: user.type || 'free' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                type: user.type || 'free',
                avatar: user.avatar || null
            }
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}