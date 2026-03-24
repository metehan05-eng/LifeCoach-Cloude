// ⚠️ Load environment variables FIRST
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env.local');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('⚠️ .env.local load error:', result.error.message);
} else {
    console.log('✅ .env.local loaded:', Object.keys(result.parsed || {}).length, 'variables');
}

dotenv.config(); // Also try .env

// Now import and start app
export { default } from './api/index.js';
