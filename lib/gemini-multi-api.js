import { GoogleGenerativeAI } from '@google/generative-ai';

// Çoklu API Key Sistemi
// API_KEY_1, API_KEY_2, API_KEY_3... şeklinde birden fazla key tanımla
// Bir key'in kota dolduğunda veya hata verdiğinde otomatik olarak bir sonraki key'e geçer

class MultiAPIKeyManager {
    constructor() {
        this.keys = [];
        this.currentIndex = 0;
        this.genAIInstances = [];
        this.failedAttempts = new Map(); // Hangi key'in ne kadar başarısız olduğunu takip
        
        this.loadKeys();
    }

    loadKeys() {
        // Dinamik olarak API_KEY_1, API_KEY_2, ... şeklinde key'leri yükle
        let i = 1;
        let key = process.env[`GEMINI_API_KEY_${i}`] || process.env.GEMINI_API_KEY;
        
        while (key && key !== 'YOUR_GEMINI_API_KEY_HERE' && key !== '') {
            this.keys.push(key);
            try {
                const genAI = new GoogleGenerativeAI(key);
                this.genAIInstances.push(genAI);
                console.log(`[Multi-API] Key ${i} yüklendi`);
            } catch (e) {
                console.warn(`[Multi-API] Key ${i} geçersiz`);
            }
            i++;
            key = process.env[`GEMINI_API_KEY_${i}`];
        }

        if (this.keys.length === 0) {
            console.warn('[Multi-API] Hiçbir Gemini API key bulunamadı!');
        } else {
            console.log(`[Multi-API] Toplam ${this.keys.length} API key yüklendi`);
        }
    }

    getCurrentGenAI() {
        if (this.genAIInstances.length === 0) return null;
        return this.genAIInstances[this.currentIndex];
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

// Yardımcı fonksiyonlar
// Gemini Modelleri - Yedek zincir için öncelik sırasına göre
const GEMINI_MODELS = [
    'gemini-1.5-pro',
    'gemini-1.5-flash'
];

export async function callGeminiWithFallback(prompt, systemPrompt = "", options = {}) {
    const {
        model = GEMINI_MODELS[0],
        maxRetries = 3,
        temperature = 0.7,
        maxOutputTokens = 2000
    } = options;

    let lastError;
    
    // Modelleri sırayla dene (Yedek zincir)
    for (const modelName of GEMINI_MODELS) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const genAI = multiKeyManager.getCurrentGenAI();
            
            if (!genAI) {
                throw new Error('Gemini API yapılandırılmamış');
            }

            try {
                console.log(`[Multi-API] Deneniyor: ${modelName} (Key ${multiKeyManager.getCurrentKeyIndex() + 1}, Deneme ${attempt + 1})`);
                
                const modelConfig = {
                    model: modelName,
                    generationConfig: {
                        temperature: temperature,
                        maxOutputTokens: maxOutputTokens
                    }
                };

                if (systemPrompt) {
                    modelConfig.systemInstruction = systemPrompt;
                }

                const geminiModel = genAI.getGenerativeModel(modelConfig);
                const result = await geminiModel.generateContent(prompt);
                
                // Başarılı!
                multiKeyManager.markKeySuccess();
                console.log(`[Multi-API] ${modelName} başarılı`);
                return result.response.text();
                
            } catch (error) {
                lastError = error;
                console.warn(`[Multi-API] ${modelName} hata: ${error.message}`);
                
                // Kota aşıldı veya geçici hata mı?
                const isRateLimit = error.message?.includes('429') || 
                                   error.message?.includes('RESOURCE_EXHAUSTED') ||
                                   error.message?.includes('quota') ||
                                   error.message?.includes('rate limit');
                
                const isTemporaryError = error.message?.includes('500') || 
                                       error.message?.includes('503') ||
                                       error.message?.includes('backend error');
                
                const isModelNotFound = error.message?.includes('404') ||
                                       error.message?.includes('not found');
                
                if (isRateLimit || isTemporaryError) {
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
                    break; // İçteki retry döngüsünden çık, sonraki modeli dene
                }
                
                throw error;
            }
        }
    }

    throw lastError || new Error('Tüm Gemini modelleri başarısız oldu');
}

// Chat için (history ile)
export async function callGeminiChatWithFallback(messages, systemPrompt = "", options = {}) {
    const {
        model = GEMINI_MODELS[0],
        maxRetries = 3,
        temperature = 0.7,
        maxOutputTokens = 4000
    } = options;

    let lastError;
    
    // Modelleri sırayla dene (Yedek zincir)
    for (const modelName of GEMINI_MODELS) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const genAI = multiKeyManager.getCurrentGenAI();
            
            if (!genAI) {
                throw new Error('Gemini API yapılandırılmamış');
            }

            try {
                console.log(`[Multi-API Chat] Deneniyor: ${modelName} (Key ${multiKeyManager.getCurrentKeyIndex() + 1})`);
                
                const modelConfig = {
                    model: modelName,
                    generationConfig: {
                        temperature: temperature,
                        maxOutputTokens: maxOutputTokens
                    }
                };

                if (systemPrompt) {
                    modelConfig.systemInstruction = systemPrompt;
                }

                const geminiModel = genAI.getGenerativeModel(modelConfig);
                
                // History'yi Gemini formatına çevir
                const chatHistory = messages.slice(0, -1).map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                }));

                const lastMessage = messages[messages.length - 1];
                
                const chat = geminiModel.startChat({
                    history: chatHistory,
                    generationConfig: {
                        temperature: temperature,
                        maxOutputTokens: maxOutputTokens
                    }
                });

                const result = await chat.sendMessage(lastMessage.content);
                
                // Başarılı!
                multiKeyManager.markKeySuccess();
                console.log(`[Multi-API Chat] ${modelName} başarılı`);
                return result.response.text();
                
            } catch (error) {
                lastError = error;
                console.warn(`[Multi-API Chat] ${modelName} hata: ${error.message}`);
                
                const isRateLimit = error.message?.includes('429') || 
                                   error.message?.includes('RESOURCE_EXHAUSTED') ||
                                   error.message?.includes('quota') ||
                                   error.message?.includes('rate limit');
                
                const isModelNotFound = error.message?.includes('404') ||
                                       error.message?.includes('not found');
                
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

    throw lastError || new Error('Tüm Gemini Chat modelleri başarısız oldu');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default multiKeyManager;
