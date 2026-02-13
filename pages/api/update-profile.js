import { NextResponse } from 'next/server';
import { getKVData, setKVData } from '../../lib/kv';

export const runtime = 'edge';

export default async function handler(req) {
    if (req.method !== 'POST') return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });

    try {
        const { email, newName } = await req.json();
        if (!email || !newName) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

        const users = await getKVData('users');
        const userIndex = users.findIndex(u => u.email === email);

        if (userIndex === -1) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }

        if (users.some(u => u.name === newName && u.email !== email)) {
            return NextResponse.json({ error: "This username is already taken." }, { status: 400 });
        }

        users[userIndex].name = newName;
        await setKVData('users', users);

        return NextResponse.json({ success: true, user: { name: newName, email: email } });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}