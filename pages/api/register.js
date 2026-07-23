import { getKVData, setKVData } from '../../lib/db';
import bcrypt from 'bcryptjs';
import { sendEmail, isEmailConfigured } from '../../lib/email.js';

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

        // Welcome email (async — hatayı bloklamaz)
        if (isEmailConfigured()) {
            sendEmail({
                to: email,
                subject: 'LifeCoach AI\'ya Hoş Geldin! 🎉',
                html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #7c3aed, #6366f1); padding: 24px; border-radius: 12px 12px 0 0;">
                            <h1 style="color: white; margin: 0; font-size: 20px;">🧘 LifeCoach AI</h1>
                        </div>
                        <div style="background: #1a1a2e; padding: 24px; border-radius: 0 0 12px 12px; color: #e2e8f0;">
                            <p style="margin-top: 0;">Merhaba <strong>${name}</strong>,</p>
                            <p>LifeCoach AI ailesine hoş geldin! 🚀</p>
                            <p>Yapay zeka destekli kişisel koçunla hedeflerine ulaşmaya hazır mısın?</p>
                            <div style="background: #16213e; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                <p style="margin: 0; line-height: 1.6;">🌟 Hedeflerini belirle<br>
                                📊 Gelişimini takip et<br>
                                🎯 AI koçunla çalış<br>
                                🏆 Başarılarını kutla</p>
                            </div>
                            <p style="color: #94a3b8; font-size: 13px;">Haydi başlayalım! 🐼</p>
                        </div>
                    </div>
                `,
            }).catch(err => console.warn('[Register] Welcome email failed:', err.message));
        }

        return res.status(200).json({ success: true, user: { name, email, avatar: null } });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}