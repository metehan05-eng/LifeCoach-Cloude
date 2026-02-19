import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Supabase bağlantısı için gerekli
});

export const query = (text, params) => pool.query(text, params);
export default pool;