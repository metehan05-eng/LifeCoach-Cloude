import { query } from '../config/db.js';
import { generateStudyPlan } from './aiService.js';

export const createDailyPlan = async (userId, { subject, hours }) => {
    // 1. Bugün için plan var mı kontrol et
    const existing = await query(
        'SELECT * FROM daily_plans WHERE user_id = $1 AND date = CURRENT_DATE',
        [userId]
    );

    if (existing.rows.length > 0) {
        if (existing.rows[0].regeneration_count >= 2) {
            throw new Error("Günlük plan oluşturma limitine ulaştınız (Max: 2).");
        }
        // Mevcut planı temizle
        await query('DELETE FROM plan_tasks WHERE plan_id = $1', [existing.rows[0].id]);
        await query('UPDATE daily_plans SET regeneration_count = regeneration_count + 1 WHERE id = $1', [existing.rows[0].id]);
    }

    // 2. AI ile görevleri oluştur
    const tasks = await generateStudyPlan(subject, hours, 'Intermediate');

    // 3. Planı DB'ye kaydet
    let planId;
    if (existing.rows.length === 0) {
        const res = await query(
            'INSERT INTO daily_plans (user_id, target_subject, available_hours) VALUES ($1, $2, $3) RETURNING id',
            [userId, subject, hours]
        );
        planId = res.rows[0].id;
    } else {
        planId = existing.rows[0].id;
    }

    for (const task of tasks) {
        await query(
            'INSERT INTO plan_tasks (plan_id, task_description, duration_minutes) VALUES ($1, $2, $3)',
            [planId, task.task, task.duration]
        );
    }

    return { planId, tasks };
};

export const getTodayPlan = async (userId) => {
    const planRes = await query('SELECT * FROM daily_plans WHERE user_id = $1 AND date = CURRENT_DATE', [userId]);
    if (planRes.rows.length === 0) return null;

    const tasksRes = await query('SELECT * FROM plan_tasks WHERE plan_id = $1 ORDER BY id', [planRes.rows[0].id]);
    return { ...planRes.rows[0], tasks: tasksRes.rows };
};