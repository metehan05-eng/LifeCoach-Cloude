export async function getKVData(key) {
    // Cloudflare KV'den veri okuma
    // Eğer veri yoksa; 'users' için boş dizi [], diğerleri için boş obje {} dön.
    const data = await process.env.LIFE_COACH_KV.get(key);
    return data ? JSON.parse(data) : (key === 'users' ? [] : {});
}

export async function setKVData(key, data) {
    // Cloudflare KV'ye veri yazma
    await process.env.LIFE_COACH_KV.put(key, JSON.stringify(data));
}