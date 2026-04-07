import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Rank progression levels
 */
const RANK_TIERS = [
  { name: 'Bronze', minXp: 0, maxXp: 100, emoji: '🥉', color: '#CD7F32', order: 1 },
  { name: 'Silver', minXp: 100, maxXp: 300, emoji: '🥈', color: '#C0C0C0', order: 2 },
  { name: 'Gold', minXp: 300, maxXp: 700, emoji: '🥇', color: '#FFD700', order: 3 },
  { name: 'Diamond', minXp: 700, maxXp: 1500, emoji: '💎', color: '#00D9FF', order: 4 },
  { name: 'Master', minXp: 1500, maxXp: 3000, emoji: '👑', color: '#9D4EDD', order: 5 },
  { name: 'Grandmaster', minXp: 3000, maxXp: 999999, emoji: '⚡', color: '#FF006E', order: 6 }
];

/**
 * Calculate rank from XP
 */
function calculateRank(xp) {
  const tier = RANK_TIERS.find(t => xp >= t.minXp && xp <= t.maxXp);
  return tier || RANK_TIERS[RANK_TIERS.length - 1]; // Fallback to Grandmaster
}

/**
 * Get next rank info
 */
function getNextRank(currentRank) {
  const currentIndex = RANK_TIERS.findIndex(t => t.name === currentRank);
  if (currentIndex < RANK_TIERS.length - 1) {
    return RANK_TIERS[currentIndex + 1];
  }
  return null; // Already at max rank
}

/**
 * Initialize user XP profile if not exists
 */
async function initializeUserXpProfile(userId, username) {
  try {
    // Check if profile exists
    const { data: existing } = await supabase
      .from('user_xp_profile')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return existing;
    }

    // Create new profile
    const { data: newProfile, error } = await supabase
      .from('user_xp_profile')
      .insert({
        user_id: userId,
        total_xp: 0,
        current_rank: 'Bronze',
        next_rank_xp: 100,
        daily_xp: 0,
        weekly_xp: 0,
        all_time_xp: 0
      })
      .select()
      .single();

    if (error) throw error;
    return newProfile;

  } catch (error) {
    console.error("Initialize profile error:", error);
    throw error;
  }
}

/**
 * Add XP to user
 */
async function addXP(userId, xpAmount, transactionType, description = '') {
  try {
    // Get or create profile
    let { data: profile } = await supabase
      .from('user_xp_profile')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      profile = await initializeUserXpProfile(userId, '');
    }

    // Calculate new XP
    const newTotalXp = profile.total_xp + xpAmount;
    const newDaily = profile.daily_xp + xpAmount;
    const newWeekly = profile.weekly_xp + xpAmount;
    const newAllTime = profile.all_time_xp + xpAmount;

    // Calculate new rank
    const newRank = calculateRank(newTotalXp);
    const oldRank = calculateRank(profile.total_xp);
    const rankUp = newRank.name !== oldRank.name;

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_xp_profile')
      .update({
        total_xp: newTotalXp,
        current_rank: newRank.name,
        daily_xp: newDaily,
        weekly_xp: newWeekly,
        all_time_xp: newAllTime,
        next_rank_xp: getNextRank(newRank.name)?.minXp || 999999
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log transaction
    await supabase
      .from('xp_transactions')
      .insert({
        user_id: userId,
        xp_amount: xpAmount,
        transaction_type: transactionType,
        description: description
      });

    // Check for achievements
    let achievements = [];
    if (rankUp) {
      achievements.push({
        type: 'rank_up',
        name: `Reached ${newRank.name}!`,
        xpReward: 50
      });

      // Add bonus XP for rank up
      await addXP(userId, 50, 'achievement', `Rank Up to ${newRank.name}`);
    }

    return {
      success: true,
      xpAdded: xpAmount,
      previousXp: profile.total_xp,
      newXp: newTotalXp,
      rank: newRank,
      rankUp,
      achievements
    };

  } catch (error) {
    console.error("Add XP error:", error);
    throw error;
  }
}

/**
 * Get user rank info
 */
async function getUserRankInfo(userId) {
  try {
    const { data: profile, error } = await supabase
      .from('user_xp_profile')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    if (!profile) {
      throw new Error('User profile not found');
    }

    const currentRank = calculateRank(profile.total_xp);
    const nextRank = getNextRank(currentRank.name);
    const xpToNextRank = nextRank ? nextRank.minXp - profile.total_xp : 0;
    const xpInCurrentRank = profile.total_xp - currentRank.minXp;
    const xpRequiredForRank = currentRank.maxXp - currentRank.minXp;
    const progressPercent = Math.round((xpInCurrentRank / xpRequiredForRank) * 100);

    return {
      userId,
      totalXp: profile.total_xp,
      dailyXp: profile.daily_xp,
      weeklyXp: profile.weekly_xp,
      allTimeXp: profile.all_time_xp,
      currentRank: currentRank.name,
      rankEmoji: currentRank.emoji,
      rankColor: currentRank.color,
      nextRank: nextRank?.name || 'MAX',
      xpToNextRank,
      xpProgress: {
        current: xpInCurrentRank,
        required: xpRequiredForRank,
        percent: progressPercent
      },
      stats: {
        wins: profile.win_count,
        losses: profile.loss_count,
        winStreak: profile.win_streak,
        matchesPlayed: profile.total_matches_played
      }
    };

  } catch (error) {
    console.error("Get rank info error:", error);
    throw error;
  }
}

/**
 * Get all rank tiers
 */
function getAllRankTiers() {
  return RANK_TIERS.map(tier => ({
    ...tier,
    xpRange: `${tier.minXp} - ${tier.maxXp}`
  }));
}

/**
 * Reset daily/weekly XP (for scheduled tasks)
 */
async function resetDailyXP(userId) {
  try {
    const { error } = await supabase
      .from('user_xp_profile')
      .update({ daily_xp: 0 })
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };

  } catch (error) {
    console.error("Reset daily XP error:", error);
    throw error;
  }
}

/**
 * Reset weekly XP
 */
async function resetWeeklyXP(userId) {
  try {
    const { error } = await supabase
      .from('user_xp_profile')
      .update({ weekly_xp: 0 })
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };

  } catch (error) {
    console.error("Reset weekly XP error:", error);
    throw error;
  }
}

// ===== API HANDLER =====

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, userId, xpAmount, transactionType, description } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // POST /api/esports/xp-system - ADD XP
    if (req.method === 'POST' && action === 'addXP') {
      if (!xpAmount || !transactionType) {
        return res.status(400).json({ error: 'xpAmount and transactionType are required' });
      }

      const result = await addXP(userId, xpAmount, transactionType, description || '');
      return res.status(200).json(result);
    }

    // POST /api/esports/xp-system - INITIALIZE PROFILE
    if (req.method === 'POST' && action === 'initProfile') {
      const { username } = req.body;
      const profile = await initializeUserXpProfile(userId, username || '');
      return res.status(200).json({
        success: true,
        profile
      });
    }

    // GET /api/esports/xp-system - GET RANK INFO
    if (req.method === 'GET' && action === 'getUserRank') {
      const rankInfo = await getUserRankInfo(userId);
      return res.status(200).json({
        success: true,
        ...rankInfo
      });
    }

    // GET /api/esports/xp-system - GET ALL RANKS
    if (req.method === 'GET' && action === 'getAllRanks') {
      const ranks = getAllRankTiers();
      return res.status(200).json({
        success: true,
        ranks
      });
    }

    // POST /api/esports/xp-system - RESET DAILY
    if (req.method === 'POST' && action === 'resetDaily') {
      const result = await resetDailyXP(userId);
      return res.status(200).json(result);
    }

    // POST /api/esports/xp-system - RESET WEEKLY
    if (req.method === 'POST' && action === 'resetWeekly') {
      const result = await resetWeeklyXP(userId);
      return res.status(200).json(result);
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error("XP System API error:", error);
    return res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
}
