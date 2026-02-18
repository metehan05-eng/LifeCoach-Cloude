import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("UYARI: SUPABASE_URL veya SUPABASE_KEY eksik. Veritabanı çalışmayabilir.");
    console.warn("Mevcut ENV Değerleri -> URL:", SUPABASE_URL ? "Var" : "YOK", "| KEY:", SUPABASE_KEY ? "Var" : "YOK");
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');

export async function getKVData(key) {
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