import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * Generate structured goal breakdown using AI
 * Creates subgoals, milestones, timeline, risks, motivation
 */
async function generateStructuredGoalBreakdown(goalTitle, goalDescription, existingGoals = []) {
  if (!genAI) {
    return {
      mainGoal: goalTitle,
      status: 'error',
      message: 'AI not available'
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro" // Use more powerful model for complex breakdown
    });

    const existingGoalsStr = existingGoals.length > 0 
      ? `User's other active goals:\n${existingGoals.map(g => `- ${g}`).join('\n')}\n\n`
      : '';

    const breakdownPrompt = `You are an expert life coach and strategic planning specialist.

Create a detailed, actionable breakdown for this goal. Return ONLY a valid JSON object (no markdown wrapper).

USER'S GOAL:
Title: ${goalTitle}
Description: ${goalDescription}

${existingGoalsStr}

RETURN THIS EXACT JSON STRUCTURE:
{
    "mainGoal": "${goalTitle}",
    "goalSummary": "Brief summary of what success looks like",
    "timelineWeeks": 12,
    "difficulty": "easy|medium|hard",
    "priority": "low|medium|high",
    
    "subgoals": [
        {
            "id": 1,
            "title": "First milestone step",
            "description": "What needs to happen",
            "weekTarget": 2,
            "xpReward": 50,
            "difficulty": "easy"
        }
    ],
    
    "milestones": [
        {
            "week": 2,
            "target": "First milestone reached",
            "xpReward": 100,
            "celebration": "Emoji celebration message",
            "checkpoints": ["checkpoint1", "checkpoint2"]
        }
    ],
    
    "dailyHabits": [
        {
            "habit": "Action name",
            "frequency": "daily|3x-week|weekly",
            "duration": "15 min",
            "impact": "What this contributes"
        }
    ],
    
    "riskAnalysis": [
        {
            "risk": "Common challenge",
            "likelihood": "high|medium|low",
            "impact": "How it affects progress",
            "mitigation": "How to handle it"
        }
    ],
    
    "successMetrics": [
        "Measurable outcome 1",
        "Quantifiable progress indicator 2"
    ],
    
    "motivationReminders": [
        "Why this goal matters",
        "How it aligns with bigger picture",
        "Potential positive impact"
    ],
    
    "potentialObstacles": [
        {
            "obstacle": "Specific challenge",
            "preventionStrategy": "How to avoid it"
        }
    ],
    
    "dependencyGoals": [
        "Any prerequisites from existing goals"
    ],
    
    "celebrationPlan": "How to celebrate when goal is achieved",
    
    "confidenceScore": 0.85
}

IMPORTANT:
1. Make subgoals specific and measurable
2. Realistic timeline - not too ambitious, not too simple
3. Include daily habits that support the goal
4. Provide genuine, personalized motivation
5. Consider user's other goals for conflicts
6. XP rewards should be balanced
7. Milestones should be at 25%, 50%, 75%, 100% progress points`;

    const result = await model.generateContent(breakdownPrompt);
    const responseText = result.response.text();
    
    // Clean markdown
    const jsonText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const breakdown = JSON.parse(jsonText);
    
    return {
      success: true,
      ...breakdown
    };

  } catch (error) {
    console.error("Goal breakdown error:", error);
    return {
      mainGoal: goalTitle,
      status: 'error',
      message: error.message
    };
  }
}

/**
 * Refine existing goal breakdown
 */
async function refineGoalBreakdown(goalBreakdown, feedback) {
  if (!genAI) {
    return goalBreakdown;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const refinePrompt = `Based on this feedback, refine the goal breakdown. Return ONLY valid JSON (no markdown).

Current breakdown:
${JSON.stringify(goalBreakdown, null, 2)}

User feedback:
${feedback}

Make adjustments to subgoals, timeline, and difficulty as needed while maintaining the full JSON structure.`;

    const result = await model.generateContent(refinePrompt);
    const responseText = result.response.text();
    
    const jsonText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const refined = JSON.parse(jsonText);
    return refined;

  } catch (error) {
    console.error("Goal refinement error:", error);
    return goalBreakdown;
  }
}

/**
 * Generate goal check-in prompt
 * What to reflect on while working on goal
 */
async function generateGoalCheckInPrompt(goal, weekNumber) {
  if (!genAI) {
    return {
      weekPrompts: []
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const checkInPrompt = `Create personalized check-in questions for someone working on this goal at week ${weekNumber}.

Goal: ${JSON.stringify(goal)}

Return ONLY valid JSON with this structure:
{
    "weekNumber": ${weekNumber},
    "reflectionQuestions": [
        "Deep question 1",
        "Reflection question 2"
    ],
    "actionItems": [
        "What to focus on this week"
    ],
    "motivationBoost": "Encouraging message"
}`;

    const result = await model.generateContent(checkInPrompt);
    const responseText = result.response.text();
    
    const jsonText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Check-in generation error:", error);
    return { weekPrompts: [] };
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
    const { action, goalTitle, goalDescription, existingGoals, goalBreakdown, feedback, weekNumber } = req.body;

    if (!goalTitle) {
      return res.status(400).json({ error: 'goalTitle parameter required' });
    }

    if (action === 'breakdown') {
      // Generate goal breakdown
      const breakdown = await generateStructuredGoalBreakdown(
        goalTitle,
        goalDescription || '',
        existingGoals || []
      );

      return res.status(200).json(breakdown);
    }

    if (action === 'refine') {
      // Refine existing breakdown
      if (!goalBreakdown || !feedback) {
        return res.status(400).json({ error: 'goalBreakdown and feedback parameters required for refine action' });
      }

      const refined = await refineGoalBreakdown(goalBreakdown, feedback);

      return res.status(200).json({
        success: true,
        refined
      });
    }

    if (action === 'checkIn') {
      // Generate check-in prompt for specific week
      if (!goalBreakdown || !weekNumber) {
        return res.status(400).json({ error: 'goalBreakdown and weekNumber parameters required for checkIn action' });
      }

      const checkIn = await generateGoalCheckInPrompt(goalBreakdown, weekNumber);

      return res.status(200).json({
        success: true,
        checkIn
      });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error("Goal breakdown API error:", error);
    return res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
}
