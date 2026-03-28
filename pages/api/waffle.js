import { getKVData, setKVData } from '../../lib/db.js';
import jwt from 'jsonwebtoken';

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
            const { prompt, style } = req.body;
            
            if (!prompt) {
                return res.status(400).json({ error: 'Görseşel açıklama (prompt) gereklidir' });
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
            
            if (userStats.flameLevel < FLAME_COST) {
                return res.status(400).json({ 
                    error: `Yeterli alev seviyesi yok. Gerekli: ${FLAME_COST}, Mevcut: ${userStats.flameLevel}`,
                    requiredFlame: FLAME_COST,
                    currentFlame: userStats.flameLevel
                });
            }
            
            // Consume flame level
            userStats.flameLevel -= FLAME_COST;
            
            userStats.history.push({
                type: 'waffle_ai_image',
                xp: 0,
                flame: -FLAME_COST,
                timestamp: new Date().toISOString(),
                details: { prompt, style }
            });
            
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
                // In a real implementation, you'd call an external API here (DALL-E, Stable Diffusion, etc.)
                // For now, we're just recording the request
                imageUrl: null, // Would be populated by actual API call
                status: 'pending' // pending, completed, failed
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
