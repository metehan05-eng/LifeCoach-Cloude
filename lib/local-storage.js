import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || './data';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getStoragePath(key) {
    return path.join(DATA_DIR, `${key}.json`);
}

export async function getKVData(key) {
    try {
        const filePath = getStoragePath(key);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        }
        return key === 'users' ? [] : {};
    } catch (error) {
        console.error(`Local storage get error (${key}):`, error.message);
        return key === 'users' ? [] : {};
    }
}

export async function setKVData(key, value) {
    try {
        const filePath = getStoragePath(key);
        fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error(`Local storage set error (${key}):`, error.message);
        throw new Error(`Veri yazma hatası: ${error.message}`);
    }
}
