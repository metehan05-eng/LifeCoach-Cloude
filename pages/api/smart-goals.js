import { callGeminiWithFallback } from '@/lib/gemini-multi-api';

/**
 * Generate structured goal breakdown using AI
 * Creates subgoals, milestones, timeline, risks, motivation
 */
async function generateStructuredGoalBreakdown(goalTitle, goalDescription, existingGoals = []) {
  try {
    const existingGoalsStr = existingGoals.length > 0 
      ? `User's other active goals:\n${existingGoals.map(g => `- ${g}`).join('\n')}\n\n`
      : '';

    const prompt = `You are an expert life coach and strategic planning specialist.

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

    const response = await callGeminiWithFallback(prompt, "", {
      model: "gemini-2.0-flash",
      maxOutputTokens: 4000
    });

    if (!response) {
      console.warn("[Smart-Goals] AI returned empty response, using fallback");
      return generateFallbackBreakdown(goalTitle, goalDescription);
    }

    const jsonText = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      const breakdown = JSON.parse(jsonText);
      return {
        success: true,
        ...breakdown
      };
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return generateFallbackBreakdown(goalTitle, goalDescription);
    }

  } catch (error) {
    console.error("Goal breakdown error:", error);
    return generateFallbackBreakdown(goalTitle, goalDescription);
  }
}

// Fallback breakdown generator
function generateFallbackBreakdown(goalTitle, goalDescription) {
  return {
    success: true,
    mainGoal: goalTitle,
    goalSummary: goalDescription || "Bu hedefe ulaşmak için çalışmaya devam edin.",
    timelineWeeks: 8,
    difficulty: "medium",
    priority: "medium",
    subgoals: [
      { id: 1, title: "Hedefi planla", description: "Adımlarını belirle", weekTarget: 1, xpReward: 50, difficulty: "easy" },
      { id: 2, title: "İlk adımı at", description: "Başla ve ilerle", weekTarget: 2, xpReward: 50, difficulty: "medium" },
      { id: 3, title: "Gelişimi kontrol et", description: "İlerlemeni değerlendir", weekTarget: 4, xpReward: 100, difficulty: "medium" },
      { id: 4, title: "Tamamla", description: "Hedefini bitir", weekTarget: 8, xpReward: 200, difficulty: "hard" }
    ],
    milestones: [
      { week: 2, target: "İlk ilerleme", xpReward: 50, celebration: "İyi gidiyorsun! 🎉", checkpoints: ["Plan yapıldı", "İlk adım atıldı"] },
      { week: 4, target: "Yarı yol", xpReward: 100, celebration: "Yarısını bitirdin! 🔥", checkpoints: ["İlerleme kaydedildi"] },
      { week: 8, target: "Hedefe ulaşıldı!", xpReward: 200, celebration: "Başardın! 🏆", checkpoints: ["Hedef tamamlandı"] }
    ],
    dailyHabits: [
      { habit: "Günde 30 dk ayır", frequency: "daily", duration: "30 dk", impact: "İlerleme için gerekli" }
    ],
    riskAnalysis: [
      { risk: "Motivasyon kaybı", likelihood: "medium", impact: "İlerleme yavaşlar", mitigation: "Küçük başarıları kutla" }
    ],
    successMetrics: ["Hedefe ulaşıldı", "İlerleme kaydedildi"],
    motivationReminders: ["Başarı seninle!", "Devam et!"],
    potentialObstacles: [
      { obstacle: "Zaman yetersizliği", preventionStrategy: "Her gün küçük adımlar at" }
    ],
    dependencyGoals: [],
    celebrationPlan: "Hedefini tamamladığında kendini ödüllendir!",
    confidenceScore: 0.7,
    isFallback: true
  };
}

/**
 * Refine existing goal breakdown
 */
async function refineGoalBreakdown(goalBreakdown, feedback) {
  try {
    const prompt = `Based on this feedback, refine the goal breakdown. Return ONLY valid JSON (no markdown).

Current breakdown:
${JSON.stringify(goalBreakdown, null, 2)}

User feedback:
${feedback}

Make adjustments to subgoals, timeline, and difficulty as needed while maintaining the full JSON structure.`;

    const response = await callGeminiWithFallback(prompt, "", {
      model: "gemini-2.0-flash",
      maxOutputTokens: 3000
    });

    if (!response) {
      console.warn("[Smart-Goals] Refine AI returned empty, keeping original");
      return goalBreakdown;
    }

    const jsonText = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      const refined = JSON.parse(jsonText);
      return refined;
    } catch (parseError) {
      console.error("JSON parse error in refine:", parseError);
      return goalBreakdown;
    }

  } catch (error) {
    console.error("Goal refinement error:", error);
    return goalBreakdown;
  }
}

/**
 * Generate goal check-in prompt
 */
async function generateGoalCheckInPrompt(goal, weekNumber) {
  try {
    const prompt = `Create personalized check-in questions for someone working on this goal at week ${weekNumber}.

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

    const response = await callGeminiWithFallback(prompt, "", {
      model: "gemini-2.0-flash",
      maxOutputTokens: 1500
    });

    if (!response) {
      console.warn("[Smart-Goals] CheckIn AI returned empty, using fallback");
      return {
        weekNumber: weekNumber,
        reflectionQuestions: [
          "Bu hafta neyi başardın?",
          "Bir sonraki hafta için ne planlıyorsun?"
        ],
        actionItems: ["Hedefe odaklan", "Küçük adımlar at"],
        motivationBoost: "Devam et, başarı yakın! 💪"
      };
    }

    const jsonText = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      return JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse error in checkIn:", parseError);
      return {
        weekNumber: weekNumber,
        reflectionQuestions: ["İlerleme kaydettin mi?"],
        actionItems: ["Devam et!"],
        motivationBoost: "Başarı seninle!"
      };
    }

  } catch (error) {
    console.error("Check-in generation error:", error);
    return {
      weekNumber: weekNumber,
      reflectionQuestions: ["Bugün ne yaptın?"],
      actionItems: ["Hedefe odaklan"],
      motivationBoost: "Devam et! 💪"
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
    const { action, goalTitle, goalDescription, existingGoals, goalBreakdown, feedback, weekNumber } = req.body;

    if (!goalTitle) {
      return res.status(400).json({ error: 'goalTitle parameter required' });
    }

    if (action === 'breakdown') {
      const breakdown = await generateStructuredGoalBreakdown(
        goalTitle,
        goalDescription || '',
        existingGoals || []
      );

      return res.status(200).json(breakdown);
    }

    if (action === 'refine') {
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
