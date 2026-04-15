import { callGeminiWithFallback } from '@/lib/gemini-multi-api';

console.log('[Habit-Insights] Multi-API Key sistemi aktif');

/**
 * Analyze habit patterns from history
 */
function analyzeHabitPattern(completionHistory, habitName) {
  if (!completionHistory || completionHistory.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      pattern: 'no_data',
      completionRate: 0,
      consistency: 'unknown'
    };
  }

  const dates = completionHistory.sort().map(d => new Date(d));
  
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = dates.length - 1; i >= 0; i--) {
    const date = new Date(dates[i]);
    date.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === i === dates.length - 1 ? 0 : currentStreak) {
      currentStreak++;
    } else {
      break;
    }
  }

  let longestStreak = 1;
  let temp = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = Math.floor((dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      temp++;
      longestStreak = Math.max(longestStreak, temp);
    } else {
      temp = 1;
    }
  }

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentCompletions = dates.filter(d => d >= thirtyDaysAgo).length;
  const completionRate = Math.round((recentCompletions / 30) * 100);

  let pattern = 'irregular';
  if (completionRate >= 85) pattern = 'consistent';
  else if (completionRate >= 70) pattern = 'mostly_consistent';
  else if (completionRate >= 50) pattern = 'inconsistent';
  else if (completionRate >= 30) pattern = 'sporadic';
  else pattern = 'abandoned';

  let consistency = 'poor';
  if (pattern === 'consistent') consistency = 'excellent';
  else if (pattern === 'mostly_consistent') consistency = 'good';
  else if (pattern === 'inconsistent') consistency = 'fair';
  else consistency = 'poor';

  return {
    currentStreak,
    longestStreak,
    pattern,
    completionRate,
    consistency,
    recentCompletions,
    totalCompletions: dates.length
  };
}

/**
 * Get AI insights for habit
 */
async function getHabitAIInsights(habitName, habitDescription, patternData, nextOptimalTime) {
  try {
    const prompt = `You are a habit coach. Provide ONE specific, actionable improvement for this habit. Return ONLY valid JSON (no markdown).

Habit: ${habitName}
Description: ${habitDescription}
Pattern: ${patternData.pattern}
Completion Rate: ${patternData.completionRate}%
Current Streak: ${patternData.currentStreak} days
Longest Streak: ${patternData.longestStreak} days
Consistency: ${patternData.consistency}

Return this JSON structure:
{
    "insight": "Brief analysis of their habit performance",
    "nextSuggestion": "ONE specific thing to improve this week",
    "motivationalMessage": "Personalized encouragement",
    "strategicTip": "How to maintain or improve streak",
    "optimalTimeToComplete": "Best time in day based on pattern",
    "riskFactor": "Potential to break habit",
    "nextLevel": "Challenge to deepen this habit"
}`;

    const response = await callGeminiWithFallback(prompt, "", {
      model: "gemini-2.0-flash",
      maxOutputTokens: 1500
    });

    const jsonText = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Habit insights error:", error);
    return {
      insight: 'Could not generate insights',
      suggestion: '',
      motivation: 'Keep going!'
    };
  }
}

/**
 * Predict optimal time to complete habit
 */
function predictOptimalTime(completionHistory, dayOfWeek = null) {
  if (!completionHistory || completionHistory.length === 0) {
    return '09:00';
  }

  const completions = completionHistory.map(d => new Date(d));
  const dayGroups = {};

  completions.forEach(date => {
    const day = date.toLocaleDateString('en-US', { weekday: 'long' });
    dayGroups[day] = (dayGroups[day] || 0) + 1;
  });

  const mostCommonDay = Object.keys(dayGroups).reduce((a, b) => 
    dayGroups[a] > dayGroups[b] ? a : b
  );

  return '09:00';
}

/**
 * Generate habit streak motivations
 */
async function generateStreakMotivations(currentStreak, longestStreak, habitName) {
  try {
    const prompt = `Generate short motivations for this habit streak. ONLY return JSON (no markdown).

Habit: ${habitName}
Current Streak: ${currentStreak} days
Personal Best: ${longestStreak} days

Return this structure:
{
    "currentStreakMotivation": "Encouraging message for their current streak",
    "nextStreakMilestone": ${currentStreak + 7},
    "nextMilestoneMotivation": "Motivation to reach next milestone",
    "personalBestChallenge": "Challenge to beat their personal best"
}`;

    const response = await callGeminiWithFallback(prompt, "", {
      model: "gemini-2.0-flash",
      maxOutputTokens: 800
    });

    const jsonText = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Motivation generation error:", error);
    return {
      current: '🔥 Keep your streak alive!',
      nextMilestone: `Aim for ${currentStreak + 7} days!`
    };
  }
}

/**
 * API Handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      action, 
      habitName, 
      habitDescription, 
      completionHistory 
    } = req.body;

    if (!habitName) {
      return res.status(400).json({ error: 'habitName parameter required' });
    }

    if (action === 'analyze') {
      const pattern = analyzeHabitPattern(completionHistory || [], habitName);
      const optimalTime = predictOptimalTime(completionHistory || []);
      
      const insights = await getHabitAIInsights(
        habitName,
        habitDescription || '',
        pattern,
        optimalTime
      );

      const motivations = await generateStreakMotivations(
        pattern.currentStreak,
        pattern.longestStreak,
        habitName
      );

      return res.status(200).json({
        success: true,
        habit: habitName,
        pattern,
        optimalTime,
        insights,
        motivations
      });
    }

    if (action === 'generateMotivation') {
      if (!completionHistory) {
        return res.status(400).json({ error: 'completionHistory parameter required' });
      }

      const pattern = analyzeHabitPattern(completionHistory, habitName);
      const motivations = await generateStreakMotivations(
        pattern.currentStreak,
        pattern.longestStreak,
        habitName
      );

      return res.status(200).json({
        success: true,
        motivations
      });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error("Habit insights API error:", error);
    return res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
}
