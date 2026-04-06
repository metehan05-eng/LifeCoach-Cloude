import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch'; // For external API calls

/**
 * Multi-Model AI Provider Support
 * Supports: Gemini, OpenAI, Anthropic Claude, Fallbacks
 */

// Initialize Gemini
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

/**
 * Call Google Gemini
 */
async function callGemini(prompt, systemPrompt = '') {
  if (!genAI) throw new Error('Gemini API key not configured');

  try {
    const models = [
      "gemini-3.1-pro-preview",
      "gemini-3.1-flash-lite-preview",
      "gemini-pro-latest"
    ];

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt
        });

        const result = await model.generateContent(prompt);
        return {
          provider: 'google',
          model: modelName,
          text: result.response.text()
        };
      } catch (e) {
        console.warn(`[Gemini] ${modelName} failed, trying next...`);
        continue;
      }
    }

    throw new Error('All Gemini models failed');

  } catch (error) {
    console.error("Gemini call error:", error);
    throw error;
  }
}

/**
 * Call OpenAI GPT models
 */
async function callOpenAI(prompt, systemPrompt = '', model = 'gpt-4-turbo') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();

    return {
      provider: 'openai',
      model: model,
      text: data.choices[0]?.message?.content || ''
    };

  } catch (error) {
    console.error("OpenAI call error:", error);
    throw error;
  }
}

/**
 * Call Anthropic Claude
 */
async function callClaude(prompt, systemPrompt = '', model = 'claude-3-opus-20240229') {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured');
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Anthropic API error');
    }

    const data = await response.json();

    return {
      provider: 'anthropic',
      model: model,
      text: data.content[0]?.text || ''
    };

  } catch (error) {
    console.error("Claude call error:", error);
    throw error;
  }
}

/**
 * Smart model selector - choose best model based on use case
 */
function selectOptimalModel(useCase = 'general', userPreference = null) {
  const modelMap = {
    'fast_response': { provider: 'google', model: 'gemini-3.1-flash-lite-preview' },
    'high_quality': { provider: 'openai', model: 'gpt-4-turbo' },
    'creative': { provider: 'anthropic', model: 'claude-3-opus-20240229' },
    'technical': { provider: 'openai', model: 'gpt-4-turbo' },
    'emotional': { provider: 'anthropic', model: 'claude-3-sonnet-20240229' },
    'balanced': { provider: 'google', model: 'gemini-3.1-pro-preview' },
    'general': { provider: 'google', model: 'gemini-3.1-pro-preview' }
  };

  // User preference overrides
  if (userPreference && userPreference !== 'auto') {
    return userPreference;
  }

  return modelMap[useCase] || modelMap['general'];
}

/**
 * Multi-model call with fallback chain
 */
async function multiModelCall(prompt, systemPrompt = '', preferredModel = null, useCase = 'general') {
  const fallbackChain = [
    preferredModel || selectOptimalModel(useCase),
    { provider: 'google', model: 'gemini-3.1-pro-preview' },
    { provider: 'openai', model: 'gpt-4-turbo' },
    { provider: 'anthropic', model: 'claude-3-sonnet-20240229' },
    { provider: 'google', model: 'gemini-3.1-flash-lite-preview' }
  ];

  const attemptedModels = [];

  for (const modelConfig of fallbackChain) {
    try {
      const key = `${modelConfig.provider}:${modelConfig.model}`;
      
      // Avoid trying same model twice
      if (attemptedModels.includes(key)) continue;
      attemptedModels.push(key);

      let response;
      
      if (modelConfig.provider === 'google') {
        response = await callGemini(prompt, systemPrompt);
      } else if (modelConfig.provider === 'openai') {
        response = await callOpenAI(prompt, systemPrompt, modelConfig.model);
      } else if (modelConfig.provider === 'anthropic') {
        response = await callClaude(prompt, systemPrompt, modelConfig.model);
      } else {
        continue;
      }

      return {
        success: true,
        ...response,
        attemptedModels
      };

    } catch (error) {
      console.warn(`[MultiModel] ${modelConfig.provider}:${modelConfig.model} failed - ${error.message}`);
      continue;
    }
  }

  throw new Error('All AI models failed. Please check API configurations.');
}

/**
 * Get available models info
 */
function getAvailableModels() {
  const models = {
    google: {
      available: !!process.env.GEMINI_API_KEY,
      models: [
        { id: 'gemini-3.1-pro-preview', name: 'Gemini Pro 3.1', performance: 'best', speed: 'medium' },
        { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini Flash 3.1 Lite', performance: 'good', speed: 'fast' },
        { id: 'gemini-pro-latest', name: 'Gemini Pro Latest', performance: 'good', speed: 'medium' }
      ]
    },
    openai: {
      available: !!process.env.OPENAI_API_KEY,
      models: [
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', performance: 'excellent', speed: 'medium' },
        { id: 'gpt-4', name: 'GPT-4', performance: 'excellent', speed: 'slow' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', performance: 'good', speed: 'fast' }
      ]
    },
    anthropic: {
      available: !!process.env.ANTHROPIC_API_KEY,
      models: [
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', performance: 'excellent', speed: 'medium' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', performance: 'good', speed: 'fast' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', performance: 'good', speed: 'fast' }
      ]
    }
  };

  return models;
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
      prompt, 
      systemPrompt, 
      preferredModel,
      useCase,
      provider
    } = req.body;

    if (action === 'query') {
      // Multi-model intelligent query
      if (!prompt) {
        return res.status(400).json({ error: 'prompt parameter required' });
      }

      const response = await multiModelCall(
        prompt,
        systemPrompt || '',
        preferredModel,
        useCase || 'general'
      );

      return res.status(200).json({
        success: true,
        ...response
      });
    }

    if (action === 'querySpecific') {
      // Query specific provider/model
      if (!prompt || !provider) {
        return res.status(400).json({ error: 'prompt and provider parameters required' });
      }

      let response;

      if (provider === 'google') {
        response = await callGemini(prompt, systemPrompt || '');
      } else if (provider === 'openai') {
        response = await callOpenAI(prompt, systemPrompt || '', preferredModel?.model || 'gpt-4-turbo');
      } else if (provider === 'anthropic') {
        response = await callClaude(prompt, systemPrompt || '', preferredModel?.model || 'claude-3-opus-20240229');
      } else {
        return res.status(400).json({ error: 'Unknown provider' });
      }

      return res.status(200).json({
        success: true,
        ...response
      });
    }

    if (action === 'getAvailable') {
      // Get available models
      const available = getAvailableModels();

      return res.status(200).json({
        success: true,
        available
      });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error("Multi-model API error:", error);
    return res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
}
