import { createClient } from '@supabase/supabase-js';
import { callGeminiWithFallback } from '@/lib/gemini-multi-api';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('[Esports-Commentator] Multi-API Key sistemi aktif');

/**
 * Predefined commentator templates
 */
const COMMENTATOR_TEMPLATES = {
  streak: [
    '{user} is on fire today 🔥',
    '{count} tasks completed in a row! 🎯',
    '{user} is unstoppable! 🚀',
    'THE STREAAAK CONTINUES! {user} is absolutely crushing it! 🔥🔥🔥',
    '{user} just hit a {count}-task streak. INSANE! 💪'
  ],
  rankUp: [
    '{user} reached {rank} rank! 🎊 Congratulations! 🏆',
    'RANK UP! {user} is now {rank}! 👑',
    '{user} climbed to {rank}! The grind pays off! 💎'
  ],
  matchWin: [
    '{user} WINS THE MATCH! 🏆 Victory is yours! 👑',
    'VICTORY! {user} dominates with {tasks} tasks completed! 🎉',
    '{user} takes the W! GGs! 🎮'
  ],
  comeback: [
    'WOW! INCREDIBLE COMEBACK by {user}! 💪 They\'re back in it! 🔥',
    '{user} is making a huge comeback! Don\'t count them out! 🚀',
    'FROM DEAD TO AHEAD! {user} pulls off an EPIC comeback! 🎯'
  ],
  newMilestone: [
    '{user} earned {xp} XP! Nice work! ✨',
    '{user} just became {titleType}! What a grind! 📈',
    '{xp} XP for {user}! The points are adding up! 💯'
  ],
  general: [
    '{user} is grinding hard today 💯',
    'Productivity is at an all-time high! 📈',
    'The competition is heating up! 🔥',
    '{user} is making moves! 🎮',
    'Another task bites the dust! ✅'
  ],
  leaderboardChange: [
    '{user} moved up to position #{position}! 📈',
    '{user} climbed the leaderboard! Now at #{position}! 🚀',
    'Watch out! {user} is climbing fast! Currently #{position}! 🔝'
  ]
};

/**
 * Get random template from category
 */
function getRandomTemplate(category) {
  const templates = COMMENTATOR_TEMPLATES[category] || COMMENTATOR_TEMPLATES.general;
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Replace template variables
 */
function replaceVariables(template, variables) {
  let message = template;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{${key}}`, 'g');
    message = message.replace(regex, variables[key]);
  });
  return message;
}

/**
 * Generate commentator message for streak
 */
function generateStreakCommentary(username, streakCount) {
  const template = getRandomTemplate('streak');
  return replaceVariables(template, {
    user: username,
    count: streakCount
  });
}

/**
 * Generate commentator message for rank up
 */
function generateRankUpCommentary(username, newRank) {
  const template = getRandomTemplate('rankUp');
  return replaceVariables(template, {
    user: username,
    rank: newRank
  });
}

/**
 * Generate commentator message for match win
 */
function generateMatchWinCommentary(username, tasksCompleted) {
  const template = getRandomTemplate('matchWin');
  return replaceVariables(template, {
    user: username,
    tasks: tasksCompleted
  });
}

/**
 * Generate commentator message for comeback
 */
function generateComebckCommentary(username) {
  const template = getRandomTemplate('comeback');
  return replaceVariables(template, {
    user: username
  });
}

/**
 * Generate commentator message for milestone
 */
function generateMilestoneCommentary(username, xpAmount, titleType = 'power user') {
  const template = getRandomTemplate('newMilestone');
  return replaceVariables(template, {
    user: username,
    xp: xpAmount,
    titleType: titleType
  });
}

/**
 * Generate commentator message for leaderboard change
 */
function generateLeaderboardCommentary(username, newPosition) {
  const template = getRandomTemplate('leaderboardChange');
  return replaceVariables(template, {
    user: username,
    position: newPosition
  });
}

/**
 * Generate general commentary
 */
function generateGeneralCommentary(context = {}) {
  const template = getRandomTemplate('general');
  return template.replace('{user}', context.username || 'Player');
}

/**
 * AI-powered commentary generation (using Multi-Key Gemini system)
 */
async function generateAICommentary(event, context = {}) {
  try {
    const eventDescriptions = {
      streak: `User ${context.username} has completed ${context.count} tasks in a row`,
      rankUp: `User ${context.username} just reached ${context.rank} rank!`,
      matchWin: `User ${context.username} won the esports match with ${context.tasks} tasks completed`,
      comeback: `User ${context.username} made an amazing comeback in their match`,
      milestone: `User ${context.username} earned ${context.xp} XP`,
      leaderboard: `User ${context.username} reached position #${context.position} on the leaderboard`
    };

    const eventText = eventDescriptions[event] || 'A user achieved something amazing';

    const prompt = `You are an enthusiastic esports commentator for a productivity gaming app. Generate ONE short, exciting commentary line about this event. Use emojis. Keep it under 100 characters. Be hype and motivational!

Event: ${eventText}

Reply only with the commentary line, no explanation.`;

    const response = await callGeminiWithFallback(prompt, "", {
      model: "gemini-2.0-flash",
      maxOutputTokens: 200
    });
    
    return response.trim();

  } catch (error) {
    console.error("AI commentary error:", error);
    return generateCommentaryFallback(event, context);
  }
}

/**
 * Fallback commentary generation
 */
function generateCommentaryFallback(event, context) {
  switch(event) {
    case 'streak':
      return generateStreakCommentary(context.username, context.count);
    case 'rankUp':
      return generateRankUpCommentary(context.username, context.rank);
    case 'matchWin':
      return generateMatchWinCommentary(context.username, context.tasks);
    case 'comeback':
      return generateComebckCommentary(context.username);
    case 'milestone':
      return generateMilestoneCommentary(context.username, context.xp, context.titleType);
    case 'leaderboard':
      return generateLeaderboardCommentary(context.username, context.position);
    default:
      return generateGeneralCommentary(context);
  }
}

/**
 * Store commentary message (for history)
 */
async function storeCommentary(eventType, username, message) {
  try {
    // Could be stored if we had a commentator_history table
    // For now, just log it
    console.log(`[Commentary] ${eventType} - ${username}: ${message}`);
    return { success: true };
  } catch (error) {
    console.error("Store commentary error:", error);
    return { success: false };
  }
}

/**
 * Get trending commentary (most hyped events)
 */
async function getTrendingCommentary() {
  const trendingEvents = [
    {
      type: 'milestone',
      message: '🔥 HUGE grind session happening RIGHT NOW! SO MANY users crushing their goals! 🎮',
      engagementScore: 95
    },
    {
      type: 'streak',
      message: '💪 The winning streaks are REAL! Productivity is SKY HIGH! 📈',
      engagementScore: 88
    },
    {
      type: 'leaderboard',
      message: '👑 Check the leaderboard - INCREDIBLE competition tonight! 🏆',
      engagementScore: 82
    }
  ];

  return {
    success: true,
    trending: trendingEvents
  };
}

// ===== API HANDLER =====

export default async function handler(req, res) {
  try {
    const { action, eventType, username, count, rank, tasks, xp, position, useAI = false } = req.body;

    // POST /api/esports/commentator - GENERATE COMMENTARY
    if (action === 'generateCommentary') {
      if (!eventType || !username) {
        return res.status(400).json({ error: 'eventType and username are required' });
      }

      let message;
      const context = { username, count, rank, tasks, xp, position };

      if (useAI) {
        message = await generateAICommentary(eventType, context);
      } else {
        message = generateCommentaryFallback(eventType, context);
      }

      // Store commentary
      await storeCommentary(eventType, username, message);

      return res.status(200).json({
        success: true,
        eventType,
        username,
        message
      });
    }

    // POST /api/esports/commentator - STREAK COMMENTARY
    if (action === 'streak') {
      if (!username || !count) {
        return res.status(400).json({ error: 'username and count are required' });
      }
      const message = generateStreakCommentary(username, count);
      return res.status(200).json({
        success: true,
        message
      });
    }

    // POST /api/esports/commentator - RANK UP COMMENTARY
    if (action === 'rankUp') {
      if (!username || !rank) {
        return res.status(400).json({ error: 'username and rank are required' });
      }
      const message = generateRankUpCommentary(username, rank);
      return res.status(200).json({
        success: true,
        message
      });
    }

    // POST /api/esports/commentator - MATCH WIN COMMENTARY
    if (action === 'matchWin') {
      if (!username || !tasks) {
        return res.status(400).json({ error: 'username and tasks are required' });
      }
      const message = generateMatchWinCommentary(username, tasks);
      return res.status(200).json({
        success: true,
        message
      });
    }

    // POST /api/esports/commentator - COMEBACK COMMENTARY
    if (action === 'comeback') {
      if (!username) {
        return res.status(400).json({ error: 'username is required' });
      }
      const message = generateComebckCommentary(username);
      return res.status(200).json({
        success: true,
        message
      });
    }

    // POST /api/esports/commentator - MILESTONE COMMENTARY
    if (action === 'milestone') {
      if (!username || !xp) {
        return res.status(400).json({ error: 'username and xp are required' });
      }
      const message = generateMilestoneCommentary(username, xp);
      return res.status(200).json({
        success: true,
        message
      });
    }

    // GET /api/esports/commentator - GET TRENDING COMMENTARY
    if (action === 'trending') {
      const trending = await getTrendingCommentary();
      return res.status(200).json(trending);
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error("Commentator API error:", error);
    return res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
}
