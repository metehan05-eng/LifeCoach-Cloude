import { callGeminiWithFallback } from '@/lib/gemini-multi-api';

console.log('[Smart-Routing] Multi-API Key sistemi aktif');

const COACHING_MODES = {
  mentor: {
    id: 'mentor',
    name: 'Mentor',
    keywords: ['how', 'teach', 'learn', 'plan', 'strategy', 'technical', 'explain'],
    triggers: ['professional', 'detailed', 'structured', 'academic']
  },
  therapist: {
    id: 'therapist',
    name: 'Danışman',
    keywords: ['feel', 'feeling', 'sad', 'cry', 'emotional', 'support', 'help'],
    triggers: ['emotional', 'struggling', 'support', 'listening']
  },
  drill_sergeant: {
    id: 'drill_sergeant',
    name: 'Eğitmen',
    keywords: ['push', 'motivate', 'challenge', 'goal', 'action', 'now', 'do'],
    triggers: ['procrastinate', 'laziness', 'motivation', 'accountability']
  },
  friend: {
    id: 'friend',
    name: 'Arkadaş',
    keywords: ['chat', 'tell', 'think', 'casual', 'what'],
    triggers: ['casual', 'chatting', 'venting', 'thinking']
  },
  dream_coach: {
    id: 'dream_coach',
    name: 'Hayalperest',
    keywords: ['dream', 'imagine', 'future', 'vision', 'possibility', 'big', 'would be nice'],
    triggers: ['ambitious', 'dreaming', 'possibilities', 'vision']
  }
};

/**
 * AI-powered smart routing
 */
async function smartlyRouteCoachingMode(userMessage, conversationContext = {}) {
  try {
    const contextStr = conversationContext.emotionalState 
      ? `User's emotional state: ${conversationContext.emotionalState}`
      : '';

    const prompt = `You are an expert at matching coaching approaches to user needs.

Based on this message, determine the BEST coaching mode. Return ONLY valid JSON (no markdown).

USER MESSAGE:
"${userMessage}"

${contextStr}

COACHING MODES:
1. mentor - For learning, planning, technical help, detailed structured guidance
2. therapist - For emotional support, feeling overwhelmed, need to vent
3. drill_sergeant - For motivation, accountability, pushing to take action
4. friend - For casual chatting, thinking out loud, friendly conversation
5. dream_coach - For big dreams, visualizing future, ambitious goals

Return this JSON:
{
    "recommendedMode": "mentor|therapist|drill_sergeant|friend|dream_coach",
    "confidence": 0.95,
    "reasoning": "Why this mode fits best",
    "alternativeMode": "secondary option if primary isn't perfect",
    "adaptations": ["specific instruction 1", "specific instruction 2"]
}`;

    const response = await callGeminiWithFallback(prompt, "", {
      model: "gemini-2.0-flash",
      maxOutputTokens: 1000
    });

    const jsonText = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Smart routing error:", error);
    return {
      recommendedMode: 'mentor',
      confidence: 0.5,
      reason: 'Error in AI routing - defaulting to mentor'
    };
  }
}

/**
 * Multi-turn mode routing
 */
async function dynamicModeSelection(userMessage, userPreferencedMode = null, conversationHistory = []) {
  if (userPreferencedMode) {
    const needsEmotionalSupport = /sad|angry|depressed|hopeless|overwhelmed|struggling/.test(userMessage.toLowerCase());
    const needsMotivation = /stuck|procrastinating|lazy|unmotivated|can't|not/.test(userMessage.toLowerCase());
    
    if (needsEmotionalSupport && userPreferencedMode !== 'therapist') {
      return {
        selectedMode: 'therapist',
        reason: 'Switching to therapist for emotional support while maintaining user preference',
        returnToPreferred: userPreferencedMode
      };
    }
    
    if (needsMotivation && userPreferencedMode !== 'drill_sergeant') {
      return {
        selectedMode: 'drill_sergeant',
        reason: 'Boost with motivation, then back to preferred mode',
        returnToPreferred: userPreferencedMode
      };
    }
    
    return {
      selectedMode: userPreferencedMode,
      reason: 'Using user\'s preferred coaching mode',
      confidence: 0.9
    };
  }

  const routing = await smartlyRouteCoachingMode(userMessage, {
    conversationHistoryLength: conversationHistory.length
  });

  return {
    selectedMode: routing.recommendedMode,
    confidence: routing.confidence,
    reasoning: routing.reasoning,
    adaptations: routing.adaptations
  };
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
      userMessage, 
      userPreferencedMode, 
      conversationHistory,
      conversationContext
    } = req.body;

    if (!userMessage) {
      return res.status(400).json({ error: 'userMessage parameter required' });
    }

    if (action === 'smartRoute') {
      const recommendation = await smartlyRouteCoachingMode(
        userMessage,
        conversationContext || {}
      );

      return res.status(200).json({
        success: true,
        ...recommendation
      });
    }

    if (action === 'dynamicSelect') {
      const selection = await dynamicModeSelection(
        userMessage,
        userPreferencedMode,
        conversationHistory || []
      );

      return res.status(200).json({
        success: true,
        ...selection
      });
    }

    if (action === 'getModes') {
      return res.status(200).json({
        success: true,
        modes: Object.values(COACHING_MODES)
      });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error("Smart routing API error:", error);
    return res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
}
