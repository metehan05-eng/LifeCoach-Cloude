import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// Helper: Authenticate token
function authenticateToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return null;
  
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * ENHANCED: Extract detailed memory from conversation using AI
 */
async function extractMemoryFromConversation(messages) {
  if (!messages || messages.length === 0) return null;
  if (!genAI) return null;
  
  const conversationText = messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash"
    });

    const extractionPrompt = `Analyze this conversation and extract ONLY valid information. Return ONLY a JSON object, no markdown, no text wrapper.

# EXTRACTION RULES:
1. Extract user's STATED goals (not speculated)
2. Extract mentioned pain points/challenges
3. Extract preferred communication style
4. Extract any insights or realizations they mentioned
5. Get emotional tone/sentiment

RETURN THIS JSON STRUCTURE ONLY:
{
    "userGoals": ["goal1", "goal2"],
    "painPoints": ["pain1", "pain2"],
    "communicationPreference": "formal|casual|technical|supportive",
    "emotionalTone": "positive|neutral|negative|mixed",
    "keyInsights": ["insight1", "insight2"],
    "topicsFocused": ["topic1", "topic2"],
    "extractionConfidence": 0.85
}

Conversation:
${conversationText}`;

    const result = await model.generateContent(extractionPrompt);
    const responseText = result.response.text();
    
    // Clean response - remove markdown code blocks
    const jsonText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const extracted = JSON.parse(jsonText);
    
    return {
      ...extracted,
      extractedAt: new Date().toISOString(),
      messageCount: messages.length
    };
  } catch (error) {
    console.error("Memory extraction error:", error);
    return null;
  }
}

/**
 * Store User Memory to Supabase
 */
async function storeUserMemory(userId, extraction, sessionId) {
  if (!extraction || extraction.extractionConfidence < 0.6) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('conversation_memories')
      .insert({
        user_id: userId,
        session_id: sessionId,
        user_goals: extraction.userGoals,
        pain_points: extraction.painPoints,
        communication_preference: extraction.communicationPreference,
        emotional_tone: extraction.emotionalTone,
        key_insights: extraction.keyInsights,
        topics_focused: extraction.topicsFocused,
        confidence_score: extraction.extractionConfidence,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error("Supabase insert error:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Store memory error:", error);
    return null;
  }
}

/**
 * Retrieve User Memory Profile
 * Geçmiş memories'den composite user profile oluştur
 */
async function getUserMemoryProfile(userId) {
  try {
    // Son 5 memories'i al
    const { data: memories, error } = await supabase
      .from('conversation_memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !memories || memories.length === 0) {
      return null;
    }

    // Aggregate memories
    const profile = {
      allGoals: [],
      allPainPoints: [],
      allInsights: [],
      preferredCommunicationStyle: 'neutral',
      overallEmotionalTrend: 'neutral',
      topTopics: [],
      memoryCount: memories.length,
      lastUpdated: memories[0]?.created_at
    };

    // Consolidate data
    memories.forEach(mem => {
      if (mem.user_goals) profile.allGoals.push(...mem.user_goals);
      if (mem.pain_points) profile.allPainPoints.push(...mem.pain_points);
      if (mem.key_insights) profile.allInsights.push(...mem.key_insights);
      if (mem.topics_focused) profile.topTopics.push(...mem.topics_focused);
    });

    // Get most common & deduplicate
    profile.allGoals = [...new Set(profile.allGoals)].slice(0, 5);
    profile.allPainPoints = [...new Set(profile.allPainPoints)].slice(0, 5);
    profile.allInsights = [...new Set(profile.allInsights)].slice(0, 5);
    profile.topTopics = [...new Set(profile.topTopics)].slice(0, 3);

    // Get dominant communication style
    const commStyles = memories
      .filter(m => m.communication_preference)
      .map(m => m.communication_preference);
    profile.preferredCommunicationStyle = commStyles.length > 0 
      ? commStyles.sort((a, b) => 
          commStyles.filter(v => v === a).length - 
          commStyles.filter(v => v === b).length
        ).pop()
      : 'neutral';

    // Get emotional trend (most recent)
    const tones = memories
      .filter(m => m.emotional_tone)
      .map(m => m.emotional_tone);
    profile.overallEmotionalTrend = tones.length > 0 ? tones[0] : 'neutral';

    return profile;
  } catch (error) {
    console.error("Get memory profile error:", error);
    return null;
  }
}

/**
 * Build Enhanced System Prompt with Memory Context
 */
async function buildMemoryEnhancedPrompt(userId, basePrompt) {
  const profile = await getUserMemoryProfile(userId);

  if (!profile) {
    return basePrompt; // Fallback to base
  }

  const memoryContext = `
# USER MEMORY PROFILE
- Goals: ${profile.allGoals.join(', ') || 'Not specified'}
- Pain Points: ${profile.allPainPoints.join(', ') || 'Not specified'}
- Key Insights: ${profile.allInsights.join(', ') || 'None recorded'}
- Preferred Style: ${profile.preferredCommunicationStyle}
- Emotional Trend: ${profile.overallEmotionalTrend}
- Focus Areas: ${profile.topTopics.join(', ') || 'Various'}

IMPORTANT: Reference this profile to provide more personalized, consistent coaching.
`;

  return memoryContext + '\n' + basePrompt;
}

// --- API HANDLER ---

export default async function handler(req, res) {
  const user = authenticateToken(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
  }
  
  const userId = user.id;
  
  // GET /api/memory - Get user's memory profile
  if (req.method === 'GET') {
    try {
      const profile = await getUserMemoryProfile(userId);
      
      return res.status(200).json({
        success: true,
        memory: profile,
        message: 'Konuşma hafızası başarıyla alındı'
      });
    } catch (err) {
      console.error('Memory GET error:', err);
      return res.status(500).json({ error: 'Hafıza alınamadı' });
    }
  }
  
  // POST /api/memory - Extract and store memory from conversation
  if (req.method === 'POST') {
    try {
      const { action, messages, sessionId, basePrompt } = req.body;

      if (action === 'extract') {
        // Extract memory from conversation
        const extraction = await extractMemoryFromConversation(messages);
        
        if (extraction) {
          await storeUserMemory(userId, extraction, sessionId);
        }

        return res.status(200).json({ 
          success: true, 
          extraction 
        });
      }

      if (action === 'buildPrompt') {
        // Build memory-enhanced prompt
        const enhanced = await buildMemoryEnhancedPrompt(userId, basePrompt || '');
        return res.status(200).json({ 
          success: true, 
          prompt: enhanced 
        });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
      console.error('Memory POST error:', err);
      return res.status(500).json({ error: 'Hafıza güncellenemedi' });
    }
  }
  
  // DELETE /api/memory - Clear memory
  if (req.method === 'DELETE') {
    try {
      const { data, error } = await supabase
        .from('conversation_memories')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        return res.status(500).json({ error: 'Hafıza silinemedi' });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Konuşma hafızası temizlendi'
      });
    } catch (err) {
      console.error('Memory DELETE error:', err);
      return res.status(500).json({ error: 'Hafıza silinemedi' });
    }
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
