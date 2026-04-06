import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

/**
 * Generate comprehensive AI progress insights
 */
async function generateProgressInsights(userStats) {
  if (!genAI) {
    return {
      insights: [],
      recommendations: [],
      nextFocus: 'N/A'
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-pro-preview"
    });

    const insightPrompt = `You are a data analyst and life coach. Analyze this user's progress data and provide meaningful insights. Return ONLY valid JSON (no markdown).

USER PROGRESS DATA:
${JSON.stringify(userStats, null, 2)}

Return this JSON structure:
{
    "overallScore": 75,
    "scoreExplanation": "Why they're at this level",
    "topStrengths": [
        "Strength 1 - why they excel here",
        "Strength 2 - evidence"
    ],
    "areasForImprovement": [
        "Area 1 - current status vs ideal",
        "Area 2 - what's holding them back"
    ],
    "keyInsights": [
        "Deep insight 1 - pattern analysis",
        "Deep insight 2 - breakthrough realization"
    ],
    "priorityRecommendations": [
        {
            "title": "Action 1",
            "impact": "Why this matters",
            "effort": "easy|medium|hard",
            "timeline": "This week"
        }
    ],
    "nextFocusArea": "Goal/Habit/Lifestyle area to prioritize next",
    "milestoneAhead": "Next important achievement",
    "motivationalMessage": "Personalized encouragement"
}`;

    const result = await model.generateContent(insightPrompt);
    const responseText = result.response.text();
    
    const jsonText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Progress insights error:", error);
    return {
      insights: ['Unable to generate insights'],
      recommendations: [],
      nextFocus: 'Focus on consistency'
    };
  }
}

/**
 * Calculate user progress metrics
 */
async function calculateProgressMetrics(userId) {
  try {
    // Fetch all relevant data
    const [goalsData, habitsData, reflectionsData] = await Promise.all([
      supabase.from('goals').select('*').eq('user_id', userId),
      supabase.from('habits').select('*').eq('user_id', userId),
      supabase.from('reflections').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30)
    ]);

    const goals = goalsData.data || [];
    const habits = habitsData.data || [];
    const reflections = reflectionsData.data || [];

    // Calculate metrics
    const metrics = {
      goals: {
        total: goals.length,
        completed: goals.filter(g => g.status === 'completed').length,
        inProgress: goals.filter(g => g.status === 'in_progress').length,
        completionRate: goals.length > 0 
          ? Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100)
          : 0
      },
      habits: {
        total: habits.length,
        activeHabits: habits.filter(h => h.active !== false).length,
        averageStreak: habits.length > 0
          ? Math.round(habits.reduce((sum, h) => sum + (h.currentStreak || 0), 0) / habits.length)
          : 0,
        totalCompletions: habits.reduce((sum, h) => sum + (h.totalCompletions || 0), 0, 0)
      },
      reflections: {
        totalReflections: reflections.length,
        recentMoodTrend: reflections.slice(0, 7).map(r => r.mood || 'neutral'),
        averageMood: calculateAverageMood(reflections)
      },
      projectHealth: {
        consistency: calculateConsistency(habits),
        momentum: calculateMomentum(goals, habits, reflections),
        wellbeing: calculateWellbeing(reflections)
      }
    };

    return metrics;

  } catch (error) {
    console.error("Metrics calculation error:", error);
    return null;
  }
}

/**
 * Calculate average mood from reflections
 */
function calculateAverageMood(reflections) {
  if (reflections.length === 0) return 'neutral';
  
  const moodValues = {
    'very_negative': -2,
    'negative': -1,
    'neutral': 0,
    'positive': 1,
    'very_positive': 2
  };

  const average = reflections.reduce((sum, r) => {
    return sum + (moodValues[r.mood] || 0);
  }, 0) / reflections.length;

  if (average > 1.5) return 'very_positive';
  if (average > 0.5) return 'positive';
  if (average > -0.5) return 'neutral';
  if (average > -1.5) return 'negative';
  return 'very_negative';
}

/**
 * Calculate consistency score (0-100)
 */
function calculateConsistency(habits) {
  if (habits.length === 0) return 0;
  
  const consistencyScores = habits.map(h => {
    const completionRate = h.completionRate || 0; // Should be 0-100
    const streak = (h.currentStreak || 0) / 30; // Normalize max 30
    return (completionRate * 0.7 + Math.min(streak, 100) * 0.3);
  });

  return Math.round(consistencyScores.reduce((a, b) => a + b) / consistencyScores.length);
}

/**
 * Calculate momentum (0-100) - are they accelerating or? plateauing
 */
function calculateMomentum(goals, habits, reflections) {
  let momentum = 50; // Base

  // Check recent goal completions
  const recentCompletions = goals.filter(g => {
    const daysAgo = Math.floor((Date.now() - new Date(g.completedAt)) / (1000 * 60 * 60 * 24));
    return daysAgo < 7;
  }).length;
  
  if (recentCompletions > 2) momentum += 20;
  else if (recentCompletions === 0) momentum -= 10;

  // Check habit consistency in last week
  const activeHabits = habits.filter(h => h.active !== false).length;
  if (activeHabits > 0) momentum += 10;

  // Check mood trend
  if (reflections.length > 0) {
    const trendingUp = reflections.slice(0, 3).some(r => r.mood === 'positive' || r.mood === 'very_positive');
    if (trendingUp) momentum += 15;
  }

  return Math.min(momentum, 100);
}

/**
 * Calculate wellbeing score (0-100) - based on mood, stress, energy
 */
function calculateWellbeing(reflections) {
  if (reflections.length === 0) return 70; // Default

  const recent = reflections.slice(0, 7);
  let score = 50;

  // Mood contribution
  recent.forEach(r => {
    if (r.mood === 'very_positive') score += 8;
    else if (r.mood === 'positive') score += 4;
    else if (r.mood === 'negative') score -= 4;
    else if (r.mood === 'very_negative') score -= 8;
  });

  // Stress/energy contribution
  recent.forEach(r => {
    if (r.stressLevel && r.stressLevel < 4) score += 5;
    if (r.energyLevel && r.energyLevel > 6) score += 5;
  });

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Generate weekly progress summary
 */
async function generateWeeklySummary(userId) {
  try {
    // Get this week's data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [completions, reflections] = await Promise.all([
      supabase
        .from('goal_completions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase
        .from('reflections')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString())
    ]);

    const summary = {
      goalsCompleted: completions.data?.length || 0,
      reflectionsLogged: reflections.data?.length || 0,
      moodAverage: calculateAverageMood(reflections.data || []),
      topicsFocused: extractTopics(reflections.data || [])
    };

    return summary;

  } catch (error) {
    console.error("Weekly summary error:", error);
    return null;
  }
}

/**
 * Extract main topics from reflections
 */
function extractTopics(reflections) {
  const keywords = ['goal', 'habit', 'work', 'health', 'relationship', 'stress', 'motivation'];
  const topics = {};

  reflections.forEach(r => {
    const text = (r.content || '').toLowerCase();
    keywords.forEach(kw => {
      if (text.includes(kw)) {
        topics[kw] = (topics[kw] || 0) + 1;
      }
    });
  });

  return Object.entries(topics)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([topic]) => topic);
}

/**
 * API Handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId parameter required' });
    }

    if (action === 'getMetrics') {
      // Calculate progress metrics
      const metrics = await calculateProgressMetrics(userId);

      if (!metrics) {
        return res.status(500).json({ error: 'Could not calculate metrics' });
      }

      return res.status(200).json({
        success: true,
        metrics
      });
    }

    if (action === 'getInsights') {
      // Get progress insights
      const metrics = await calculateProgressMetrics(userId);
      
      if (!metrics) {
        return res.status(500).json({ error: 'Could not calculate metrics' });
      }

      const insights = await generateProgressInsights(metrics);

      return res.status(200).json({
        success: true,
        metrics,
        insights
      });
    }

    if (action === 'getWeeklySummary') {
      // Get weekly progress summary
      const summary = await generateWeeklySummary(userId);

      return res.status(200).json({
        success: true,
        summary
      });
    }

    if (action === 'fullDashboard') {
      // Get everything for dashboard
      const [metrics, summary] = await Promise.all([
        calculateProgressMetrics(userId),
        generateWeeklySummary(userId)
      ]);

      const insights = metrics ? await generateProgressInsights(metrics) : null;

      return res.status(200).json({
        success: true,
        metrics,
        insights,
        summary
      });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error("Progress dashboard API error:", error);
    return res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
}
