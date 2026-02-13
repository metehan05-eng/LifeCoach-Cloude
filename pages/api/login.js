import { NextResponse } from 'next/server';
import { getKVData } from '../../lib/kv';

export const runtime = 'edge';

export default async function handler(req) {
    if (req.method !== 'POST') return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });

    try {
        const { email, password } = await req.json();
        if (!email || !password) return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });

        const users = await getKVData('users');
        const user = users.find(u => u.email === email && u.password === password);

        if (user) return NextResponse.json({ success: true, user: { name: user.name, email: user.email } });
        else return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}