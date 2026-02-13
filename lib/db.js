import { kv } from '@vercel/kv';

export async function getKVData(key) {
    try {
        const data = await kv.get(key);
        // Veri yoksa varsayılan değer döndür
        if (!data) {
            return key === 'users' ? [] : {};
        }
        return data;
    } catch (error) {
        console.error(`KV Get Error (${key}):`, error);
        return key === 'users' ? [] : {};
    }
}

export async function setKVData(key, data) {
    try {
        await kv.set(key, data);
    } catch (error) {
        console.error(`KV Set Error (${key}):`, error);
    }
}