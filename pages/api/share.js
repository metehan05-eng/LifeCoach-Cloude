import { getKVData } from '../../lib/db.js';
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

/**
 * Social Media Share Handler
 * POST /api/share - Generate share URLs for different platforms
 */
export default async function handler(req, res) {
    console.log('[SHARE API] Request received:', {
        method: req.method,
        hasAuth: !!req.headers['authorization'],
        body: req.body
    });

    const user = authenticateToken(req);
    
    if (!user) {
        console.error('[SHARE API] Authentication failed');
        return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }

    console.log('[SHARE API] User authenticated:', user.id);
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'İzin verilmeyen metod' });
    }
    
    try {
        const { platform, goalId, goalTitle, goalProgress, includeImage } = req.body;
        
        if (!platform || !['instagram', 'twitter', 'tiktok', 'reddit'].includes(platform)) {
            return res.status(400).json({ error: 'Geçerli bir platform seçin' });
        }
        
        if (!goalTitle) {
            return res.status(400).json({ error: 'Hedef başlığı gereklidir' });
        }
        
        // Prepare share text
        const shareText = `LifeCoach AI ile hedefime ilerliyorum! 🎯\n\nHedef: ${goalTitle}\nİlerleme: %${goalProgress || 0}\n\nSen de potansiyelini keşfet! ✨\n#LifeCoachAI #Hedeflerim #PersonalGrowth`;
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lifecoach-ai.vercel.app';
        const shareUrl = `${appUrl}?goal=${encodeURIComponent(goalTitle)}&progress=${goalProgress}&shared=true`;
        
        // Generate platform-specific URLs
        const shareUrls = {
            instagram: {
                // Instagram doesn't support direct post sharing, so we use mobile deep link
                web: 'https://www.instagram.com/',
                deepLink: `instagram://`,
                description: 'Instagram masaüstü uygulamasını açar. Hikayenizde paylaşabilirsiniz.',
                action: 'Uygulamayı Aç'
            },
            twitter: {
                web: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
                deepLink: `twitter://post?message=${encodeURIComponent(shareText)}`,
                description: 'Twitter\'da hemen paylaş'
            },
            tiktok: {
                web: 'https://www.tiktok.com/upload',
                deepLink: 'tiktok://',
                description: 'TikTok\'ta video paylaş veya bilgi ekle',
                action: 'Uygulamayı Aç'
            },
            reddit: {
                web: `https://www.reddit.com/submit?title=${encodeURIComponent('LifeCoach AI ile Gelişimim!')}&text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
                deepLink: 'reddit://submit',
                description: 'Reddit\'de paylaş'
            }
        };
        
        const platformData = shareUrls[platform];
        
        // Generate image-based share data if requested
        let imageData = null;
        if (includeImage) {
            imageData = generateGoalImage(goalTitle, goalProgress);
        }
        
        return res.status(200).json({
            success: true,
            platform,
            shareUrl: platformData.web,
            deepLink: platformData.deepLink || null,
            shareText,
            description: platformData.description,
            action: platformData.action || 'Paylaş',
            imageData: imageData
        });
        
    } catch (error) {
        console.error('Share error:', error);
        return res.status(500).json({ error: 'Paylaşım sırasında hata oluştu' });
    }
}

/**
 * Generate Goal Image (Base64 encoded SVG)
 * Creates a visual card that can be shared
 */
function generateGoalImage(title, progress) {
    const progressPercentage = Math.min(100, Math.max(0, progress || 0));
    
    // Create SVG image
    const svg = `
        <svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#14b8a6;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
                </linearGradient>
            </defs>
            
            <!-- Background -->
            <rect width="600" height="600" fill="url(#bgGradient)"/>
            
            <!-- Border -->
            <rect x="20" y="20" width="560" height="560" fill="none" stroke="#0ea5e9" stroke-width="2" rx="20"/>
            
            <!-- Header -->
            <text x="300" y="80" font-size="32" font-weight="bold" fill="#14b8a6" text-anchor="middle" font-family="Arial">
                LifeCoach AI
            </text>
            
            <!-- Icon -->
            <text x="300" y="140" font-size="48" text-anchor="middle">🎯</text>
            
            <!-- Goal Title (truncated with word wrap) -->
            <text x="300" y="200" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="Arial" width="500">
                ${truncateText(title, 30)}
            </text>
            
            <!-- Progress Circle Background -->
            <circle cx="300" cy="350" r="80" fill="none" stroke="#334155" stroke-width="8"/>
            
            <!-- Progress Circle -->
            <circle cx="300" cy="350" r="80" fill="none" stroke="url(#progressGradient)" stroke-width="8"
                stroke-dasharray="${Math.PI * 160 * progressPercentage / 100} ${Math.PI * 160}"
                stroke-linecap="round" transform="rotate(-90 300 350)"/>
            
            <!-- Progress Text -->
            <text x="300" y="360" font-size="48" font-weight="bold" fill="#14b8a6" text-anchor="middle" font-family="Arial">
                %${progressPercentage}
            </text>
            
            <!-- Footer -->
            <text x="300" y="520" font-size="14" fill="#64748b" text-anchor="middle" font-family="Arial">
                Başarmayı Bırakma! 💪
            </text>
            
            <!-- Hashtags -->
            <text x="300" y="560" font-size="12" fill="#0ea5e9" text-anchor="middle" font-family="Arial">
                #LifeCoachAI #Hedeflerim #PersonalGrowth
            </text>
        </svg>
    `;
    
    return {
        svg: svg,
        mimeType: 'image/svg+xml',
        dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    };
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength) {
    if (text.length > maxLength) {
        return text.substring(0, maxLength) + '...';
    }
    return text;
}
