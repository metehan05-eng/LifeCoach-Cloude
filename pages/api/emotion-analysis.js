import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * Analyze emotional state from text using AI
 * Returns: sentiment, confidence, energy_level, stress_level, recommended_tone
 */
async function analyzeEmotionFromText(text) {
  if (!genAI || !text) {
    return {
      sentiment: 'neutral',
      confidence: 0,
      energy_level: 5,
      stress_level: 5,
      recommended_tone: 'supportive'
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview"
    });

    const analysisPrompt = `Analyze this text and extract emotional signals. Return ONLY a JSON object, no markdown wrapper.

RETURN THIS JSON STRUCTURE:
{
    "sentiment": "positive|neutral|negative|mixed",
    "confidence": 0.85,
    "energy_level": 7,
    "stress_level": 3,
    "emotion_tags": ["motivated", "tired"],
    "recommended_tone": "encouraging|calm|supportive|energetic|challenging",
    "needs_comfort": true|false,
    "needs_motivation": true|false,
    "needs_rest": true|false
}

Text to analyze:
${text}`;

    const result = await model.generateContent(analysisPrompt);
    const responseText = result.response.text();
    
    // Clean markdown
    const jsonText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const analysis = JSON.parse(jsonText);
    return analysis;

  } catch (error) {
    console.error("Emotion analysis error:", error);
    return {
      sentiment: 'neutral',
      confidence: 0,
      energy_level: 5,
      stress_level: 5,
      recommended_tone: 'supportive'
    };
  }
}

/**
 * Adapt system prompt based on emotional analysis
 */
function adaptSystemPromptForEmotion(basePrompt, emotionAnalysis) {
  if (!emotionAnalysis) return basePrompt;

  let emotionAdaptation = '';

  // Handle stressed user
  if (emotionAnalysis.stress_level > 7) {
    emotionAdaptation = `
⚠️ USER APPEARS STRESSED - COACHING ADJUSTMENT:
- Keep responses concise and focused
- Offer one action at a time
- Suggest a breathing/meditation break first
- Use reassuring, grounding language
- Avoid overwhelming them with options
`;
  }

  // Handle low energy/exhausted
  if (emotionAnalysis.energy_level < 3) {
    emotionAdaptation = `
😴 USER APPEARS EXHAUSTED - COACHING ADJUSTMENT:
- Suggest rest as first priority
- Recommend short, achievable tasks
- Offer encouragement and validation
- Consider postponing big decisions
- Be warm and understanding
`;
  }

  // Handle highly motivated
  if (emotionAnalysis.energy_level > 8 && emotionAnalysis.sentiment === 'positive') {
    emotionAdaptation = `
🔥 USER APPEARS HIGHLY MOTIVATED - COACHING ADJUSTMENT:
- Push for ambitious goals
- Channel energy into meaningful projects
- Set stretch targets
- Maintain momentum with challenging work
- Be enthusiastic and bold
`;
  }

  // Handle negative sentiment
  if (emotionAnalysis.sentiment === 'negative' && emotionAnalysis.needs_comfort) {
    emotionAdaptation = `
💙 USER APPEARS STRUGGLING - COACHING ADJUSTMENT:
- Lead with empathy and validation
- Ask what support they need
- Break down into smaller steps
- Focus on progress, not perfection
- Offer perspective on temporary nature of challenges
`;
  }

  // Handle mixed/confused
  if (emotionAnalysis.sentiment === 'mixed') {
    emotionAdaptation = `
🤔 USER APPEARS CONFUSED/CONFLICTED - COACHING ADJUSTMENT:
- Clarify their actual needs first
- Help them identify what's conflicting
- Take structured approach to decision
- Be patient and exploratory
- Avoid forcing a direction
`;
  }

  return emotionAdaptation + '\n' + basePrompt;
}

/**
 * Generate emotion-aware response suggestions
 */
async function generateEmotionAwareResponseTips(emotionAnalysis) {
  const tips = [];

  if (emotionAnalysis.needs_motivation) {
    tips.push('💪 Start with a quick win - suggest something achievable they can do today');
  }

  if (emotionAnalysis.needs_comfort) {
    tips.push('🤗 Lead with empathy - acknowledge their feelings before problem-solving');
  }

  if (emotionAnalysis.needs_rest) {
    tips.push('😴 Suggest recovery - recommend they rest first before pursuing goals');
  }

  if (emotionAnalysis.stress_level > 7) {
    tips.push('🧘 Offer a breathing exercise or short meditation');
  }

  if (emotionAnalysis.energy_level > 8) {
    tips.push('🎯 Encourage them to tackle something they\'ve been putting off');
  }

  if (emotionAnalysis.sentiment === 'positive') {
    tips.push('✨ Celebrate their momentum - help them capitalize on positive mood');
  }

  return tips;
}

/**
 * API Handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, text, basePrompt } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text parameter required' });
    }

    if (action === 'analyze') {
      // Analyze emotion
      const analysis = await analyzeEmotionFromText(text);
      const tips = await generateEmotionAwareResponseTips(analysis);

      return res.status(200).json({
        success: true,
        analysis,
        tips
      });
    }

    if (action === 'adaptPrompt') {
      // Analyze and adapt prompt
      if (!basePrompt) {
        return res.status(400).json({ error: 'basePrompt parameter required with adaptPrompt action' });
      }

      const analysis = await analyzeEmotionFromText(text);
      const adapted = adaptSystemPromptForEmotion(basePrompt, analysis);

      return res.status(200).json({
        success: true,
        analysis,
        adaptedPrompt: adapted
      });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error("Emotion analysis API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
