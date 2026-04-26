import { getKVData, setKVData } from '../../lib/db.js';
import jwt from 'jsonwebtoken';
import { callGeminiWithFallback } from '../../lib/gemini-multi-api.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistir';

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

// FLAME COST: 10 per image generation
const FLAME_COST = 10;

// POST /api/waffle - Generate AI images using Flame Level
export default async function handler(req, res) {
    const user = authenticateToken(req);
    
    if (!user) {
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }
    
    const userId = user.id;
    
    if (req.method === 'POST') {
        try {
            const { prompt, style, imageUrl, action } = req.body;
            
            if (!prompt) {
                return res.status(400).json({ error: 'Görseşel açıklama (prompt) gereklidir' });
            }
            
            if (action === 'enhancePrompt') {
                try {
                    const systemPrompt = `You are a world-class prompt engineer for AI image generators (like Midjourney, DALL-E).`;
                    const userPrompt = `Translate the following idea into a highly detailed, comma-separated English prompt for an image generator. 
Make sure you STRICTLY follow the user's concepts (e.g. if they say a car in a forest, do NOT put it in a city).
Enhance it with descriptive keywords for lighting, atmosphere, and high quality (e.g., 8k, masterpiece, highly detailed, photorealistic).
Do not output any introductory or concluding text, JUST the English prompt.

User idea: "${prompt}"`;
                    
                    const enhancedPrompt = await callGeminiWithFallback(userPrompt, systemPrompt);
                    return res.status(200).json({ enhancedPrompt: enhancedPrompt.trim() });
                } catch (e) {
                    console.error('Enhance prompt error:', e);
                    // Fallback to basic translation if failed
                    return res.status(200).json({ enhancedPrompt: prompt + ", visually stunning, 8k resolution, masterpiece, highly detailed" });
                }
            }
            
            // Check user's flame level
            const allStats = await getKVData('user-stats') || {};
            const userStats = allStats[userId] || {
                userId,
                xp: 0,
                flameLevel: 0,
                level: 1,
                history: []
            };
            
            if (action !== 'saveOnly') {
                if (userStats.flameLevel < FLAME_COST) {
                    return res.status(400).json({ 
                        error: `Yeterli alev seviyesi yok. Gerekli: ${FLAME_COST}, Mevcut: ${userStats.flameLevel}`,
                        requiredFlame: FLAME_COST,
                        currentFlame: userStats.flameLevel
                    });
                }
                
                // Consume flame level
                userStats.flameLevel -= FLAME_COST;
            }
            
            if (action !== 'saveOnly') {
                userStats.history.push({
                    type: 'waffle_ai_image',
                    xp: 0,
                    flame: -FLAME_COST,
                    timestamp: new Date().toISOString(),
                    details: { prompt, style }
                });
            }
            
            if (userStats.history.length > 100) {
                userStats.history = userStats.history.slice(-100);
            }
            
            allStats[userId] = userStats;
            await setKVData('user-stats', allStats);
            
            // Save waffle image generation record
            const allWaffles = await getKVData('waffle-generations') || {};
            const userWaffles = allWaffles[userId] || [];
            
            const waffleRecord = {
                id: Date.now().toString(),
                prompt,
                style: style || 'realistic',
                flameCost: FLAME_COST,
                createdAt: new Date().toISOString(),
                // If imageUrl is provided from client (Pollinations), use it and mark completed
                imageUrl: imageUrl || null,
                status: imageUrl ? 'completed' : 'pending' // pending, completed, failed
            };
            
            userWaffles.push(waffleRecord);
            allWaffles[userId] = userWaffles;
            await setKVData('waffle-generations', allWaffles);
            
            return res.status(200).json({
                message: `Resim oluşturuluyor... (${FLAME_COST} alev seviyesi harcandı)`,
                record: waffleRecord,
                remainingFlame: userStats.flameLevel,
                stats: userStats
            });
        } catch (error) {
            console.error('Waffle generation error:', error);
            return res.status(500).json({ error: 'Resim oluşturulurken hata oluştu' });
        }
    }
    
    // GET - Get user's waffle generations
    if (req.method === 'GET') {
        try {
            const allWaffles = await getKVData('waffle-generations') || {};
            const userWaffles = allWaffles[userId] || [];
            
            return res.status(200).json({
                generations: userWaffles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
                totalGenerated: userWaffles.length
            });
        } catch (error) {
            console.error('Get waffle generations error:', error);
            return res.status(500).json({ error: 'Resimler yüklenirken hata oluştu' });
        }
    }
    
    return res.status(405).json({ error: 'İzin verilmeyen metod' });
}
