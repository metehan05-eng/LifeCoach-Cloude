-- ========================================
-- ESPORTS MODE - DATABASE SCHEMA
-- ========================================

-- 1. USER XP PROFILE TABLE
CREATE TABLE IF NOT EXISTS user_xp_profile (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id TEXT NOT NULL UNIQUE REFERENCES public.user(id) ON DELETE CASCADE,
    total_xp BIGINT NOT NULL DEFAULT 0,
    current_rank TEXT NOT NULL DEFAULT 'Bronze',
    next_rank_xp BIGINT NOT NULL DEFAULT 100,
    daily_xp BIGINT NOT NULL DEFAULT 0,
    weekly_xp BIGINT NOT NULL DEFAULT 0,
    all_time_xp BIGINT NOT NULL DEFAULT 0,
    win_count INT DEFAULT 0,
    loss_count INT DEFAULT 0,
    win_streak INT DEFAULT 0,
    longest_win_streak INT DEFAULT 0,
    total_matches_played INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. XP TRANSACTIONS LOG (for history)
CREATE TABLE IF NOT EXISTS xp_transactions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id TEXT NOT NULL REFERENCES public.user(id) ON DELETE CASCADE,
    xp_amount BIGINT NOT NULL,
    transaction_type TEXT NOT NULL, -- 'daily_task', 'weekly_goal', 'streak_bonus', 'match_win', 'achievement'
    description TEXT,
    match_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. USER RANKS TABLE (predefined ranks)
CREATE TABLE IF NOT EXISTS user_ranks (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    rank_name TEXT NOT NULL UNIQUE,
    min_xp BIGINT NOT NULL,
    max_xp BIGINT NOT NULL,
    badge_color TEXT,
    badge_emoji TEXT,
    rank_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert predefined ranks
INSERT INTO user_ranks (rank_name, min_xp, max_xp, badge_color, badge_emoji, rank_order)
VALUES
    ('Bronze', 0, 99, '#CD7F32', '🥉', 1),
    ('Silver', 100, 299, '#C0C0C0', '🥈', 2),
    ('Gold', 300, 699, '#FFD700', '🥇', 3),
    ('Diamond', 700, 1499, '#00D9FF', '💎', 4),
    ('Master', 1500, 2999, '#9D4EDD', '👑', 5),
    ('Grandmaster', 3000, 999999, '#FF006E', '⚡', 6)
ON CONFLICT DO NOTHING;

-- 4. ESPORTS MATCHES TABLE
CREATE TABLE IF NOT EXISTS esports_matches (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user1_id TEXT NOT NULL REFERENCES public.user(id) ON DELETE CASCADE,
    user2_id TEXT NOT NULL REFERENCES public.user(id) ON DELETE CASCADE,
    user1_tasks_completed INT DEFAULT 0,
    user2_tasks_completed INT DEFAULT 0,
    user1_xp_earned INT DEFAULT 0,
    user2_xp_earned INT DEFAULT 0,
    winner_id TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    match_duration_hours INT DEFAULT 24,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. LEADERBOARD CACHE TABLE (for quick queries)
CREATE TABLE IF NOT EXISTS leaderboard_cache (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id TEXT NOT NULL UNIQUE REFERENCES public.user(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    total_xp BIGINT NOT NULL,
    current_rank TEXT NOT NULL,
    win_count INT NOT NULL,
    position INT,
    leaderboard_type TEXT NOT NULL, -- 'daily', 'weekly', 'all_time'
    last_updated TIMESTAMP DEFAULT NOW()
);

-- 6. ACHIEVEMENTS TABLE (esports-specific achievements)
CREATE TABLE IF NOT EXISTS esports_achievements (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id TEXT NOT NULL REFERENCES public.user(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL, -- 'first_match', 'win_streak_5', 'reach_diamond', 'epic_comeback'
    achievement_name TEXT NOT NULL,
    xp_reward INT DEFAULT 0,
    unlocked_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. COMMENTATOR TEMPLATES (AI messages)
CREATE TABLE IF NOT EXISTS ai_commentator_templates (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    template_text TEXT NOT NULL,
    trigger_type TEXT NOT NULL, -- 'streak', 'xp_milestone', 'rank_up', 'match_win', 'comeback', 'general'
    intensity TEXT DEFAULT 'normal', -- 'low', 'normal', 'high'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert commentator templates
INSERT INTO ai_commentator_templates (template_text, trigger_type, intensity)
VALUES
    ('{user} is on fire today 🔥', 'streak', 'high'),
    ('{count} tasks completed in a row! 🎯', 'streak', 'high'),
    ('{user} reached {rank} rank! 🎊', 'rank_up', 'high'),
    ('{user} won the match! 🏆', 'match_win', 'normal'),
    ('Incredible comeback by {user}! 💪', 'comeback', 'high'),
    ('{user} is grinding hard today 💯', 'general', 'normal'),
    ('{user} earned {xp} XP! Nice work! ✨', 'xp_milestone', 'normal'),
    ('{user} is unstoppable! 🚀', 'streak', 'high'),
    ('The competition is heating up! 🔥', 'general', 'normal'),
    ('{user} just broke their personal record! 📈', 'xp_milestone', 'high')
ON CONFLICT DO NOTHING;

-- Create indexes for faster queries
CREATE INDEX idx_user_xp_profile_total_xp ON user_xp_profile(total_xp DESC);
CREATE INDEX idx_user_xp_profile_rank ON user_xp_profile(current_rank);
CREATE INDEX idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX idx_esports_matches_user1 ON esports_matches(user1_id);
CREATE INDEX idx_esports_matches_user2 ON esports_matches(user2_id);
CREATE INDEX idx_esports_matches_status ON esports_matches(status);
CREATE INDEX idx_leaderboard_cache_xp ON leaderboard_cache(total_xp DESC);
CREATE INDEX idx_leaderboard_cache_type ON leaderboard_cache(leaderboard_type);

-- Create updated_at trigger for user_xp_profile
CREATE OR REPLACE FUNCTION update_user_xp_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_xp_profile_updated_at
BEFORE UPDATE ON user_xp_profile
FOR EACH ROW
EXECUTE FUNCTION update_user_xp_profile_updated_at();
