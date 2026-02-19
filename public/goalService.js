import { query } from '../config/db.js';
import { analyzeGoalInput } from './aiService.js';

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

export const analyzeGoal = async (userId, text) => {
    return await analyzeGoalInput(text);
};

export const createConfirmedGoal = async (userId, goalData) => {
    const id = Date.now();
    const res = await query(
        `INSERT INTO goals (
            id, user_id, title, current_level, target_level, deadline, 
            ai_generated, goal_feasibility_score, structured_breakdown
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
            id, 
            userId, 
            goalData.title, 
            goalData.current_value, 
            goalData.target_value, 
            goalData.deadline,
            true,
            goalData.feasibility_score,
            JSON.stringify(goalData.breakdown)
        ]
    );
    return res.rows[0];
};