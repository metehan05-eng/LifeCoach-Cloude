// ⚠️ Ensure environment variables are loaded
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import * as LocalStorage from './local-storage.js';

// Helper function to check if Supabase is configured
function isSupabaseConfigured() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    return url && key && !url.includes('YOUR_');
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const USE_LOCAL_STORAGE = !isSupabaseConfigured();

// Only show message if actually using local storage
if (USE_LOCAL_STORAGE) {
    console.log("\n📁 Yerel dosya depolaması kullanılıyor (Supabase yapılandırılmamış)");
    console.log("   Supabase kurulumu için bkz: SETUP_SUPABASE.md\n");
} else {
    console.log("\n✅ Supabase veritabanı yapılandırılmıştır");
}

const supabase = !USE_LOCAL_STORAGE ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export async function getKVData(key) {
    // Yerel depolama kullanılıyorsa
    if (USE_LOCAL_STORAGE) {
        return LocalStorage.getKVData(key);
    }

    const { data, error } = await supabase
        .from('kv_store')
        .select('value')
        .eq('key', key)
        .single();

    if (error) {
        // PGRST116: Veri bulunamadı hatası (Normal durum, varsayılan değer dön)
        if (error.code === 'PGRST116') {
            return key === 'users' ? [] : {};
        }
        
        if (error.message.includes('Could not find the table')) {
             console.error("\n⚠️  İPUCU: Supabase veritabanında 'kv_store' tablosu bulunamadı.");
             console.error("👉 Çözüm: Supabase Dashboard -> SQL Editor kısmına gidip tabloyu oluşturun.\n");
        }

        // Diğer hatalar (Yetki, Bağlantı vb.) -> Hatayı fırlat
        console.error(`Supabase Get Error (${key}):`, error.message);
        throw new Error(`Veritabanı okuma hatası: ${error.message}`);
    }
    return data ? data.value : (key === 'users' ? [] : {});
}

export async function setKVData(key, value) {
    // Yerel depolama kullanılıyorsa
    if (USE_LOCAL_STORAGE) {
        return LocalStorage.setKVData(key, value);
    }

    const { error } = await supabase
        .from('kv_store')
        .upsert({ key, value }, { onConflict: 'key' });

    if (error) {
        console.error(`Supabase Set Error (${key}):`, error.message);
        
        if (error.message.includes('row-level security')) {
            console.error("\n⚠️  İPUCU: Supabase panelinde 'kv_store' tablosu için RLS (Row Level Security) açık kalmış olabilir.");
            console.error("👉 Çözüm: Supabase Dashboard -> Table Editor -> kv_store -> RLS ayarını kapatın.\n");
        }

        if (error.message.includes('Could not find the table')) {
             console.error("\n⚠️  İPUCU: Supabase veritabanında 'kv_store' tablosu bulunamadı.");
             console.error("👉 Çözüm: Supabase Dashboard -> SQL Editor kısmına gidip şu komutu çalıştırın:");
             console.error("   create table kv_store ( key text primary key, value jsonb );\n");
        }

        // Hatayı fırlat ki kayıt işlemi başarılı sanılmasın
        throw new Error(`Veritabanı yazma hatası: ${error.message}`);
    }
}