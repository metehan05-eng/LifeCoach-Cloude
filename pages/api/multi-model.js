import { callGeminiWithFallback } from '@/lib/gemini-multi-api';

console.log('[Multi-Model] Multi-API Key sistemi aktif');

/**
 * Multi-Model AI Provider Support
 * Gemini Multi-Key System - Automatically rotates through API keys when one runs out
 */

// Model listesi
const MODELS = [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google', performance: 'excellent', speed: 'fast' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', performance: 'good', speed: 'fast' }
];

// Provider listesi
const PROVIDERS = {
    google: {
        name: 'Google Gemini',
        models: MODELS
    }
};

/**
 * AI Çağrısı - Multi-Key sistemi ile
 */
async function callAI(prompt, systemPrompt = '', options = {}) {
    const { preferredModel } = options;
    
    try {
        const response = await callGeminiWithFallback(prompt, systemPrompt, {
            model: preferredModel || 'gemini-2.0-flash',
            maxOutputTokens: 2000,
            temperature: 0.7
        });
        
        return {
            provider: 'google',
            model: preferredModel || 'gemini-2.0-flash',
            text: response
        };
    } catch (error) {
        console.error("[Multi-Model] AI call failed:", error.message);
        throw error;
    }
}

/**
 * Model listesini döndür
 */
function getModels() {
    return MODELS;
}

/**
 * Provider listesini döndür
 */
function getProviders() {
    return PROVIDERS;
}

/**
 * API Handler
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { action, prompt, systemPrompt, model } = req.body;

        if (action === 'models') {
            return res.status(200).json({
                success: true,
                models: getModels(),
                providers: getProviders()
            });
        }

        if (action === 'call') {
            if (!prompt) {
                return res.status(400).json({ error: 'prompt parameter required' });
            }

            const result = await callAI(prompt, systemPrompt || '', { preferredModel: model });

            return res.status(200).json({
                success: true,
                ...result
            });
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
        console.error("Multi-Model API error:", error);
        return res.status(500).json({ 
            error: error.message,
            success: false
        });
    }
}
