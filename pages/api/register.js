import { NextResponse } from 'next/server';
import { getKVData, setKVData } from '../../lib/db';

export default async function handler(req) {
    if (req.method !== 'POST') return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });

    try {
        const { name, email, password } = await req.json();
        if (!name || !email || !password) return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });

        const users = await getKVData('users');
        if (users.find(u => u.email === email)) {
            return NextResponse.json({ error: "This email address is already in use." }, { status: 400 });
        }

        const newUser = { id: Date.now(), name, email, password };
        users.push(newUser);
        await setKVData('users', users);

        return NextResponse.json({ success: true, user: { name, email } });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}