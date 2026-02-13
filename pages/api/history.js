import { NextResponse } from 'next/server';
import { getKVData } from '../../lib/kv';

export const runtime = 'edge';

export default async function handler(req) {
    if (req.method !== 'POST') return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });

    try {
        const { email } = await req.json();
        if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

        const users = await getKVData('users');
        const user = users.find(u => u.email === email);

        if (user && user.sessions) {
            const history = user.sessions.map(s => ({ id: s.id, title: s.title }));
            return NextResponse.json(history);
        }
        return NextResponse.json([]);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}