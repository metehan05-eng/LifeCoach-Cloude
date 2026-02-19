import { query } from '../config/db.js';

export const startFocusSession = async (userId) => {
    const active = await query(
        "SELECT * FROM focus_sessions WHERE user_id = $1 AND status = 'active'",
        [userId]
    );
    if (active.rows.length > 0) throw new Error("Zaten aktif bir odaklanma oturumu var.");

    const todayCount = await query(
        "SELECT COUNT(*) FROM focus_sessions WHERE user_id = $1 AND date(start_time) = CURRENT_DATE",
        [userId]
    );
    if (parseInt(todayCount.rows[0].count) >= 8) throw new Error("Günlük odaklanma limitine ulaştınız.");

    const res = await query(
        "INSERT INTO focus_sessions (user_id, start_time) VALUES ($1, NOW()) RETURNING id, start_time",
        [userId]
    );
    return res.rows[0];
};

export const endFocusSession = async (userId, sessionId) => {
    const sessionRes = await query(
        "SELECT * FROM focus_sessions WHERE id = $1 AND user_id = $2",
        [sessionId, userId]
    );
    const session = sessionRes.rows[0];
    if (!session || session.status !== 'active') throw new Error("Aktif oturum bulunamadı.");

    const endTime = new Date();
    const startTime = new Date(session.start_time);
    const durationMinutes = (endTime - startTime) / 1000 / 60;

    let status = 'abandoned';
    let points = 0;

    if (durationMinutes >= 24) {
        status = 'completed';
        points = 3;
        await query("UPDATE users SET points = points + $1 WHERE id = $2", [points, userId]);
    }

    await query(
        "UPDATE focus_sessions SET end_time = $1, duration_minutes = $2, status = $3, points_earned = $4 WHERE id = $5",
        [endTime, Math.floor(durationMinutes), status, points, sessionId]
    );

    return { status, points, duration: Math.floor(durationMinutes) };
};