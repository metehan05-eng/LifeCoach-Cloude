import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("UYARI: SUPABASE_URL veya SUPABASE_KEY eksik. Veritabanı çalışmayabilir.");
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');

export async function getKVData(key) {
    const { data, error } = await supabase
        .from('kv_store')
        .select('value')
        .eq('key', key)
        .single();

    if (error) {
        // Veri bulunamadıysa veya hata varsa varsayılan değer dön
        return key === 'users' ? [] : {};
    }
    return data ? data.value : (key === 'users' ? [] : {});
}

export async function setKVData(key, value) {
    const { error } = await supabase
        .from('kv_store')
        .upsert({ key, value }, { onConflict: 'key' });

    if (error) {
        console.error(`Supabase Set Error (${key}):`, error.message);
    }
}