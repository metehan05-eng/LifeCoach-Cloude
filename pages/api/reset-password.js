import { NextResponse } from 'next/server';
import { getKVData, setKVData } from '../../lib/kv';

export const runtime = 'edge';

export default async function handler(req) {
    if (req.method !== 'POST') return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });

    try {
        const { email, newPassword } = await req.json();
        if (!email || !newPassword) return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });

        const users = await getKVData('users');
        const userIndex = users.findIndex(u => u.email === email);

        if (userIndex === -1) {
            return NextResponse.json({ error: "User not found with this email." }, { status: 404 });
        }

        users[userIndex].password = newPassword; // Not: Gerçek bir uygulamada şifre hashlenmelidir.
        await setKVData('users', users);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}