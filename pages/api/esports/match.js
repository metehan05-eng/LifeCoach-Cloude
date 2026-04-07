import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const MATCH_DURATION_HOURS = 24;
const WIN_XP = 100;
const LOSS_XP = 50;
const PARTICIPATION_XP = 25;

/**
 * Start a new 1v1 match between two users
 */
async function startMatch(user1Id, user2Id) {
  try {
    if (user1Id === user2Id) {
      throw new Error('Cannot start match with yourself');
    }

    // Create match record
    const { data: match, error } = await supabase
      .from('esports_matches')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
        status: 'active',
        match_duration_hours: MATCH_DURATION_HOURS,
        user1_tasks_completed: 0,
        user2_tasks_completed: 0,
        user1_xp_earned: 0,
        user2_xp_earned: 0
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      match: {
        matchId: match.id,
        user1: user1Id,
        user2: user2Id,
        startedAt: match.started_at,
        endsAt: new Date(new Date(match.started_at).getTime() + MATCH_DURATION_HOURS * 60 * 60 * 1000),
        status: 'active'
      }
    };

  } catch (error) {
    console.error("Start match error:", error);
    throw error;
  }
}

/**
 * Get match details
 */
async function getMatchDetails(matchId) {
  try {
    const { data: match, error } = await supabase
      .from('esports_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (error) throw error;
    if (!match) {
      throw new Error('Match not found');
    }

    const startedAt = new Date(match.started_at);
    const expectedEndAt = new Date(startedAt.getTime() + MATCH_DURATION_HOURS * 60 * 60 * 1000);
    const now = new Date();
    const timeRemaining = Math.max(0, expectedEndAt - now);
    const isExpired = now > expectedEndAt;

    return {
      success: true,
      matchId,
      user1Id: match.user1_id,
      user2Id: match.user2_id,
      status: match.status,
      user1TasksCompleted: match.user1_tasks_completed,
      user2TasksCompleted: match.user2_tasks_completed,
      user1XpEarned: match.user1_xp_earned,
      user2XpEarned: match.user2_xp_earned,
      winner: match.winner_id,
      startedAt,
      endsAt: expectedEndAt,
      timeRemaining,
      isExpired,
      durationMinutes: Math.round(timeRemaining / 60000),
      leadingPlayer: match.user1_tasks_completed > match.user2_tasks_completed ? match.user1_id : match.user2_id,
      lead: Math.abs(match.user1_tasks_completed - match.user2_tasks_completed)
    };

  } catch (error) {
    console.error("Get match details error:", error);
    throw error;
  }
}

/**
 * User completes a task in match
 */
async function completeMatchTask(matchId, userId, xpGained = 10) {
  try {
    // Get match
    const { data: match, error: fetchError } = await supabase
      .from('esports_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (fetchError) throw fetchError;
    if (!match) throw new Error('Match not found');
    if (match.status !== 'active') throw new Error('Match is not active');

    // Validate user is in this match
    if (userId !== match.user1_id && userId !== match.user2_id) {
      throw new Error('User not in this match');
    }

    // Check if match expired
    const startedAt = new Date(match.started_at);
    const expectedEndAt = new Date(startedAt.getTime() + MATCH_DURATION_HOURS * 60 * 60 * 1000);
    if (new Date() > expectedEndAt) {
      throw new Error('Match has expired');
    }

    // Update match
    const isUser1 = userId === match.user1_id;
    const updates = isUser1
      ? { user1_tasks_completed: match.user1_tasks_completed + 1, user1_xp_earned: match.user1_xp_earned + xpGained }
      : { user2_tasks_completed: match.user2_tasks_completed + 1, user2_xp_earned: match.user2_xp_earned + xpGained };

    const { data: updatedMatch, error: updateError } = await supabase
      .from('esports_matches')
      .update(updates)
      .eq('id', matchId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      success: true,
      matchId,
      userId,
      tasksCompleted: isUser1 ? updatedMatch.user1_tasks_completed : updatedMatch.user2_tasks_completed,
      xpEarned: xpGained,
      matchStatus: updatedMatch.status
    };

  } catch (error) {
    console.error("Complete task error:", error);
    throw error;
  }
}

/**
 * End/complete a match and award XP
 */
async function endMatch(matchId) {
  try {
    const { data: match, error: fetchError } = await supabase
      .from('esports_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (fetchError) throw fetchError;
    if (!match) throw new Error('Match not found');
    if (match.status === 'completed') throw new Error('Match already completed');

    // Determine winner
    let winnerId = null;
    let results = {
      user1: { tasks: match.user1_tasks_completed, xp: PARTICIPATION_XP },
      user2: { tasks: match.user2_tasks_completed, xp: PARTICIPATION_XP }
    };

    if (match.user1_tasks_completed > match.user2_tasks_completed) {
      winnerId = match.user1_id;
      results.user1.xp = WIN_XP;
      results.user2.xp = LOSS_XP;
    } else if (match.user2_tasks_completed > match.user1_tasks_completed) {
      winnerId = match.user2_id;
      results.user1.xp = LOSS_XP;
      results.user2.xp = WIN_XP;
    } else {
      // Tie - both get participation XP
      results.user1.xp = PARTICIPATION_XP;
      results.user2.xp = PARTICIPATION_XP;
    }

    // Update match status
    const { data: updatedMatch, error: updateError } = await supabase
      .from('esports_matches')
      .update({
        status: 'completed',
        winner_id: winnerId,
        ended_at: new Date()
      })
      .eq('id', matchId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Award XP to both players
    const { addXP } = await import('./xp-system.js');
    
    // Dynamically import addXP function logic
    // For now, return results (integration needed)

    // Update user stats
    if (winnerId === match.user1_id) {
      await supabase
        .from('user_xp_profile')
        .update({
          win_count: supabase.raw('win_count + 1'),
          win_streak: supabase.raw('win_streak + 1'),
          total_matches_played: supabase.raw('total_matches_played + 1')
        })
        .eq('user_id', match.user1_id);

      await supabase
        .from('user_xp_profile')
        .update({
          loss_count: supabase.raw('loss_count + 1'),
          win_streak: 0,
          total_matches_played: supabase.raw('total_matches_played + 1')
        })
        .eq('user_id', match.user2_id);
    } else if (winnerId === match.user2_id) {
      await supabase
        .from('user_xp_profile')
        .update({
          loss_count: supabase.raw('loss_count + 1'),
          win_streak: 0,
          total_matches_played: supabase.raw('total_matches_played + 1')
        })
        .eq('user_id', match.user1_id);

      await supabase
        .from('user_xp_profile')
        .update({
          win_count: supabase.raw('win_count + 1'),
          win_streak: supabase.raw('win_streak + 1'),
          total_matches_played: supabase.raw('total_matches_played + 1')
        })
        .eq('user_id', match.user2_id);
    } else {
      // Tie
      await supabase
        .from('user_xp_profile')
        .update({
          total_matches_played: supabase.raw('total_matches_played + 1')
        })
        .eq('user_id', match.user1_id);

      await supabase
        .from('user_xp_profile')
        .update({
          total_matches_played: supabase.raw('total_matches_played + 1')
        })
        .eq('user_id', match.user2_id);
    }

    return {
      success: true,
      matchId,
      winner: winnerId,
      results: {
        user1: {
          userId: match.user1_id,
          tasksCompleted: match.user1_tasks_completed,
          xpAwarded: results.user1.xp,
          result: winnerId === match.user1_id ? 'WIN' : winnerId ===match.user2_id ? 'LOSS' : 'TIE'
        },
        user2: {
          userId: match.user2_id,
          tasksCompleted: match.user2_tasks_completed,
          xpAwarded: results.user2.xp,
          result: winnerId === match.user2_id ? 'WIN' : winnerId === match.user1_id ? 'LOSS' : 'TIE'
        }
      }
    };

  } catch (error) {
    console.error("End match error:", error);
    throw error;
  }
}

/**
 * Get user's active matches
 */
async function getUserActiveMatches(userId) {
  try {
    const { data: matches, error } = await supabase
      .from('esports_matches')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (error) throw error;

    const activeMatches = matches.map(match => {
      const isUser1 = userId === match.user1_id;
      return {
        matchId: match.id,
        opponent: isUser1 ? match.user2_id : match.user1_id,
        userTasks: isUser1 ? match.user1_tasks_completed : match.user2_tasks_completed,
        opponentTasks: isUser1 ? match.user2_tasks_completed : match.user1_tasks_completed,
        userLeading: (isUser1 ? match.user1_tasks_completed : match.user2_tasks_completed) > (isUser1 ? match.user2_tasks_completed : match.user1_tasks_completed),
        startedAt: match.started_at
      };
    });

    return {
      success: true,
      activeMatches,
      count: activeMatches.length
    };

  } catch (error) {
    console.error("Get user matches error:", error);
    throw error;
  }
}

// ===== API HANDLER =====

export default async function handler(req, res) {
  try {
    const { action, matchId, userId, user1Id, user2Id, xpGained } = req.body;

    // POST /api/esports/match - START NEW MATCH
    if (action === 'startMatch') {
      if (!user1Id || !user2Id) {
        return res.status(400).json({ error: 'user1Id and user2Id are required' });
      }
      const result = await startMatch(user1Id, user2Id);
      return res.status(200).json(result);
    }

    // GET /api/esports/match - GET MATCH DETAILS
    if (action === 'getMatchDetails') {
      if (!matchId) {
        return res.status(400).json({ error: 'matchId is required' });
      }
      const result = await getMatchDetails(matchId);
      return res.status(200).json(result);
    }

    // POST /api/esports/match - COMPLETE TASK
    if (action === 'completeTask') {
      if (!matchId || !userId) {
        return res.status(400).json({ error: 'matchId and userId are required' });
      }
      const result = await completeMatchTask(matchId, userId, xpGained || 10);
      return res.status(200).json(result);
    }

    // POST /api/esports/match - END MATCH
    if (action === 'endMatch') {
      if (!matchId) {
        return res.status(400).json({ error: 'matchId is required' });
      }
      const result = await endMatch(matchId);
      return res.status(200).json(result);
    }

    // GET /api/esports/match - GET USER ACTIVE MATCHES
    if (action === 'getUserMatches') {
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      const result = await getUserActiveMatches(userId);
      return res.status(200).json(result);
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error("Match API error:", error);
    return res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
}
