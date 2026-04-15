// OpenRouter API Entegrasyonu
// Çoklu model ve API key desteği ile fallback mekanizması

// OpenRouter API Ayarları
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Varsayılan OpenRouter Modelleri
const DEFAULT_MODELS = [
    'arcee-ai/trinity-large-preview:free',
    'nvidia/nemotron-nano-12b-v2-vl:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'openai/gpt-oss-120b:free',
    'openai/gpt-oss-120b:free',
    'google/gemini-2.0-flash-exp:free'
];

// Çoklu API Key Sistemi
class MultiAPIKeyManager {
    constructor() {
        this.keys = [];
        this.currentIndex = 0;
        this.failedAttempts = new Map();
        
        this.loadKeys();
    }

    loadKeys() {
        // Dinamik olarak OPENROUTER_API_KEY_1, OPENROUTER_API_KEY_2, ... şeklinde key'leri yükle
        let i = 1;
        let key = process.env[`OPENROUTER_API_KEY_${i}`] || process.env.OPENROUTER_API_KEY;
        
        while (key && key !== 'YOUR_OPENROUTER_API_KEY_HERE' && key !== '' && key !== undefined) {
            this.keys.push(key);
            console.log(`[Multi-API] OpenRouter Key ${i} yüklendi`);
            i++;
            key = process.env[`OPENROUTER_API_KEY_${i}`];
        }

        if (this.keys.length === 0) {
            console.warn('[Multi-API] Hiçbir OpenRouter API key bulunamadı!');
        } else {
            console.log(`[Multi-API] Toplam ${this.keys.length} API key yüklendi`);
        }
    }

    getCurrentKeyIndex() {
        return this.currentIndex;
    }

    getCurrentKey() {
        return this.keys[this.currentIndex] || null;
    }

    markKeyFailed(index = this.currentIndex) {
        const current = this.failedAttempts.get(index) || 0;
        this.failedAttempts.set(index, current + 1);
        
        // Eğer bu key 3 kere üst üste başarısız olduysa atla
        if (current + 1 >= 3) {
            console.warn(`[Multi-API] Key ${index + 1} 3 kez başarısız, atlanıyor...`);
            this.skipToNextKey();
        }
    }

    markKeySuccess(index = this.currentIndex) {
        this.failedAttempts.set(index, 0);
    }

    skipToNextKey() {
        const oldIndex = this.currentIndex;
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        
        if (this.currentIndex !== oldIndex) {
            console.log(`[Multi-API] Key ${oldIndex + 1} -> Key ${this.currentIndex + 1} geçildi`);
        }
        
        // Eğer tüm key'leri denedi ve hepsi başarısız olduysa başa dön
        if (this.currentIndex === 0 && this.failedAttempts.size > 0) {
            console.error('[Multi-API] TÜM API KEYLER BAŞARISIZ! Lütfen key\'leri kontrol edin.');
        }
    }

    hasNextKey() {
        return this.keys.length > 1;
    }

    getTotalKeys() {
        return this.keys.length;
    }
}

// Global instance
const multiKeyManager = new MultiAPIKeyManager();

// OpenRouter API çağrısı
async function callOpenRouterAPI(messages, model, apiKey, systemPrompt = null, temperature = 0.7, maxTokens = 2000) {
    const response = await fetch(OPENROUTER_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://han-ai.dev/',
            'X-Title': 'Life Coach AI'
        },
        body: JSON.stringify({
            model: model,
            messages: systemPrompt 
                ? [{ role: 'system', content: systemPrompt }, ...messages]
                : messages,
            temperature: temperature,
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API hatası: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
        text: data.choices[0]?.message?.content || '',
        model: model
    };
}

// Tek prompt ile OpenRouter çağrısı
export async function callOpenRouterWithFallback(prompt, systemPrompt = "", options = {}) {
    const {
        model = DEFAULT_MODELS[0],
        maxRetries = 3,
        temperature = 0.7,
        maxOutputTokens = 2000
    } = options;

    const messages = [{ role: 'user', content: prompt }];
    let lastError;
    
    // Modelleri sırayla dene (Yedek zincir)
    for (const modelName of DEFAULT_MODELS) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const apiKey = multiKeyManager.getCurrentKey();
            
            if (!apiKey) {
                throw new Error('OpenRouter API yapılandırılmamış');
            }

            try {
                console.log(`[Multi-API] Deneniyor: ${modelName} (Key ${multiKeyManager.getCurrentKeyIndex() + 1}, Deneme ${attempt + 1})`);
                
                const result = await callOpenRouterAPI(messages, modelName, apiKey, systemPrompt, temperature, maxOutputTokens);
                
                // Başarılı!
                multiKeyManager.markKeySuccess();
                console.log(`[Multi-API] ${modelName} başarılı`);
                return result.text;
                
            } catch (error) {
                lastError = error;
                console.warn(`[Multi-API] ${modelName} hata: ${error.message}`);
                
                // Kota aşıldı veya rate limit mi?
                const isRateLimit = error.message?.includes('429') || 
                                   error.message?.includes('rate limit');
                
                const isModelNotFound = error.message?.includes('404') ||
                                       error.message?.includes('not found') ||
                                       error.message?.includes('model');
                
                if (isRateLimit) {
                    multiKeyManager.markKeyFailed();
                    
                    if (multiKeyManager.hasNextKey()) {
                        multiKeyManager.skipToNextKey();
                        console.log(`[Multi-API] Sonraki key deneniyor...`);
                        await sleep(1000 * (attempt + 1));
                        continue;
                    }
                }
                
                // Model bulunamadı hatası - sonraki modeli dene
                if (isModelNotFound) {
                    console.warn(`[Multi-API] Model ${modelName} bulunamadı, sonraki model deneniyor...`);
                    break;
                }
                
                throw error;
            }
        }
    }

    throw lastError || new Error('Tüm OpenRouter modelleri başarısız oldu');
}

// Chat için (history ile)
export async function callOpenRouterChatWithFallback(messages, systemPrompt = "", options = {}) {
    const {
        model = DEFAULT_MODELS[0],
        maxRetries = 3,
        temperature = 0.7,
        maxOutputTokens = 4000
    } = options;

    let lastError;
    
    // Modelleri sırayla dene (Yedek zincir)
    for (const modelName of DEFAULT_MODELS) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const apiKey = multiKeyManager.getCurrentKey();
            
            if (!apiKey) {
                throw new Error('OpenRouter API yapılandırılmamış');
            }

            try {
                console.log(`[Multi-API Chat] Deneniyor: ${modelName} (Key ${multiKeyManager.getCurrentKeyIndex() + 1})`);
                
                const result = await callOpenRouterAPI(messages, modelName, apiKey, systemPrompt, temperature, maxOutputTokens);
                
                // Başarılı!
                multiKeyManager.markKeySuccess();
                console.log(`[Multi-API Chat] ${modelName} başarılı`);
                return result.text;
                
            } catch (error) {
                lastError = error;
                console.warn(`[Multi-API Chat] ${modelName} hata: ${error.message}`);
                
                const isRateLimit = error.message?.includes('429') || 
                                   error.message?.includes('rate limit');
                
                const isModelNotFound = error.message?.includes('404') ||
                                       error.message?.includes('not found') ||
                                       error.message?.includes('model');
                
                if (isRateLimit) {
                    multiKeyManager.markKeyFailed();
                    
                    if (multiKeyManager.hasNextKey()) {
                        multiKeyManager.skipToNextKey();
                        console.log(`[Multi-API Chat] Sonraki key deneniyor...`);
                        await sleep(1000 * (attempt + 1));
                        continue;
                    }
                }
                
                // Model bulunamadı hatası - sonraki modeli dene
                if (isModelNotFound) {
                    console.warn(`[Multi-API Chat] Model ${modelName} bulunamadı, sonraki model deneniyor...`);
                    break;
                }
                
                throw error;
            }
        }
    }

    throw lastError || new Error('Tüm OpenRouter Chat modelleri başarısız oldu');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Geriye uyumluluk için eski fonksiyon isimlerini de export et
export { callOpenRouterWithFallback as callGeminiWithFallback, callOpenRouterChatWithFallback as callGeminiChatWithFallback };

export default multiKeyManager;
