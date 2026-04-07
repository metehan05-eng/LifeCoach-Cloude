import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Get leaderboard - sorted by XP
 */
async function getLeaderboard(type = 'all_time', limit = 100, userId = null) {
  try {
    let query = supabase
      .from('user_xp_profile')
      .select('user_id, total_xp, current_rank, win_count, loss_count, win_streak')
      .order('total_xp', { ascending: false })
      .limit(limit);

    // Filter by type
    if (type === 'daily') {
      query = query.gt('daily_xp', 0);
    } else if (type === 'weekly') {
      query = query.gt('weekly_xp', 0);
    }

    const { data: profiles, error } = await query;

    if (error) throw error;

    // Add rank position and format data
    const leaderboard = profiles.map((profile, index) => ({
      position: index + 1,
      userId: profile.user_id,
      username: profile.user_id.split('@')[0] || 'User', // Extract from email or fallback
      totalXp: profile.total_xp,
      rank: profile.current_rank,
      wins: profile.win_count || 0,
      losses: profile.loss_count || 0,
      winStreak: profile.win_streak || 0,
      winRate: profile.win_count + profile.loss_count > 0 
        ? Math.round((profile.win_count / (profile.win_count + profile.loss_count)) * 100)
        : 0,
      highlighted: profile.user_id === userId // Highlight user's position
    }));

    // Get user's rank if userId provided
    let userRank = null;
    if (userId) {
      userRank = leaderboard.find(u => u.userId === userId);
    }

    return {
      type,
      leaderboard,
      totalPlayers: leaderboard.length,
      userRank
    };

  } catch (error) {
    console.error("Get leaderboard error:", error);
    throw error;
  }
}

/**
 * Get top players with more details
 */
async function getTopPlayers(type = 'all_time', limit = 10) {
  try {
    const leaderboardData = await getLeaderboard(type, limit);

    const topPlayers = leaderboardData.leaderboard.slice(0, limit).map(player => ({
      ...player,
      medal: getMedalForPosition(player.position),
      trend: getTrendIcon(player) // Up/Down arrow based on recent activity
    }));

    return {
      success: true,
      type,
      players: topPlayers,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error("Get top players error:", error);
    throw error;
  }
}

/**
 * Get user's leaderboard position and nearby players
 */
async function getUserLeaderboardContext(userId, rangeSize = 5) {
  try {
    const allLeaderboard = await getLeaderboard('all_time', 1000, userId);
    const userRank = allLeaderboard.leaderboard.find(u => u.userId === userId);

    if (!userRank) {
      return {
        success: false,
        error: 'User not found in leaderboard'
      };
    }

    // Get players around user
    const startIndex = Math.max(0, userRank.position - 1 - rangeSize);
    const endIndex = Math.min(allLeaderboard.leaderboard.length, userRank.position + rangeSize);

    const nearbyPlayers = allLeaderboard.leaderboard.slice(startIndex, endIndex);

    return {
      success: true,
      userRank: userRank.position,
      userPosition: userRank,
      nearbyPlayers,
      aboveUser: nearbyPlayers.slice(0, rangeSize),
      belowUser: nearbyPlayers.slice(rangeSize + 1),
      totalPlayers: allLeaderboard.totalPlayers,
      percentileRank: Math.round((userRank.position / allLeaderboard.totalPlayers) * 100)
    };

  } catch (error) {
    console.error("Get user leaderboard context error:", error);
    throw error;
  }
}

/**
 * Get medal for position
 */
function getMedalForPosition(position) {
  if (position === 1) return '🥇';
  if (position === 2) return '🥈';
  if (position === 3) return '🥉';
  return `#${position}`;
}

/**
 * Get trend icon (dummy implementation)
 */
function getTrendIcon(player) {
  // In production, compare with previous day's position
  if (player.winStreak > 2) return '📈';
  if (player.losses > player.wins) return '📉';
  return '➡️';
}

/**
 * Cache leaderboard (for performance)
 * Run periodically to update cache
 */
async function updateLeaderboardCache() {
  try {
    const allLeaderboardData = await getLeaderboard('all_time', 1000);

    // Clear existing cache
    await supabase
      .from('leaderboard_cache')
      .delete()
      .neq('id', 0); // Delete all

    // Insert new cache
    const cacheData = allLeaderboardData.leaderboard.map((player, index) => ({
      user_id: player.userId,
      username: player.username,
      total_xp: player.totalXp,
      current_rank: player.rank,
      win_count: player.wins,
      position: index + 1,
      leaderboard_type: 'all_time'
    }));

    const { error } = await supabase
      .from('leaderboard_cache')
      .insert(cacheData);

    if (error) throw error;

    return {
      success: true,
      cachedCount: cacheData.length
    };

  } catch (error) {
    console.error("Update leaderboard cache error:", error);
    throw error;
  }
}

/**
 * Get leaderboard comparison between two users
 */
async function compareUsers(userId1, userId2) {
  try {
    const [user1Data, user2Data] = await Promise.all([
      supabase
        .from('user_xp_profile')
        .select('*')
        .eq('user_id', userId1)
        .single(),
      supabase
        .from('user_xp_profile')
        .select('*')
        .eq('user_id', userId2)
        .single()
    ]);

    if (user1Data.error || user2Data.error) {
      throw new Error('One or both users not found');
    }

    const user1 = user1Data.data;
    const user2 = user2Data.data;

    return {
      success: true,
      comparison: {
        user1: {
          id: userId1,
          xp: user1.total_xp,
          rank: user1.current_rank,
          wins: user1.win_count,
          losses: user1.loss_count,
          winRate: Math.round((user1.win_count / (user1.win_count + user1.loss_count)) * 100) || 0
        },
        user2: {
          id: userId2,
          xp: user2.total_xp,
          rank: user2.current_rank,
          wins: user2.win_count,
          losses: user2.loss_count,
          winRate: Math.round((user2.win_count / (user2.win_count + user2.loss_count)) * 100) || 0
        },
        xpDifference: Math.abs(user1.total_xp - user2.total_xp),
        leader: user1.total_xp > user2.total_xp ? userId1 : userId2
      }
    };

  } catch (error) {
    console.error("Compare users error:", error);
    throw error;
  }
}

// ===== API HANDLER =====

export default async function handler(req, res) {
  try {
    const { action, type = 'all_time', limit = 100, userId, rangeSize = 5, user1Id, user2Id } = req.query;

    // GET /api/esports/leaderboard?action=getLeaderboard&type=all_time|daily|weekly&limit=100
    if (action === 'getLeaderboard') {
      const result = await getLeaderboard(type, Math.min(limit, 500), userId);
      return res.status(200).json({
        success: true,
        ...result
      });
    }

    // GET /api/esports/leaderboard?action=getTopPlayers&type=all_time&limit=10
    if (action === 'getTopPlayers') {
      const result = await getTopPlayers(type, Math.min(limit, 50));
      return res.status(200).json(result);
    }

    // GET /api/esports/leaderboard?action=getUserContext&userId=...&rangeSize=5
    if (action === 'getUserContext') {
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      const result = await getUserLeaderboardContext(userId, rangeSize);
      return res.status(200).json(result);
    }

    // GET /api/esports/leaderboard?action=compareUsers&user1Id=...&user2Id=...
    if (action === 'compareUsers') {
      if (!user1Id || !user2Id) {
        return res.status(400).json({ error: 'user1Id and user2Id are required' });
      }
      const result = await compareUsers(user1Id, user2Id);
      return res.status(200).json(result);
    }

    // GET /api/esports/leaderboard?action=updateCache
    if (action === 'updateCache') {
      const result = await updateLeaderboardCache();
      return res.status(200).json(result);
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error("Leaderboard API error:", error);
    return res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
}
