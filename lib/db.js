import fs from 'fs';
import path from 'path';

const USERS_FILE = path.join(process.cwd(), 'users.json');
const LIMITS_FILE = path.join(process.cwd(), 'user_limits.json');

function ensureFile(filePath, defaultData) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
}

export async function getKVData(key) {
    // key 'users' ise users.json, değilse user_limits.json (basitleştirilmiş mantık)
    const filePath = key === 'users' ? USERS_FILE : LIMITS_FILE;
    const defaultData = key === 'users' ? [] : {};
    
    ensureFile(filePath, defaultData);
    
    try {
        const fileData = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileData);
    } catch (e) {
        return defaultData;
    }
}

export async function setKVData(key, data) {
    const filePath = key === 'users' ? USERS_FILE : LIMITS_FILE;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}