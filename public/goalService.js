import { query } from '../config/db.js';

export const createGoal = async (userId, { description, currentLevel, targetLevel, deadline }) => {
    // ID olarak timestamp kullanıyoruz (Frontend uyumluluğu için)
    const id = Date.now();
    const res = await query(
        `INSERT INTO goals (id, user_id, title, current_level, target_level, deadline) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [id, userId, description, currentLevel, targetLevel, deadline]
    );
    return res.rows[0];
};