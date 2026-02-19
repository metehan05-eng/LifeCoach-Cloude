const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODELS = [
    "openai/gpt-3.5-turbo", // Hızlı planlama için
    "google/gemma-3-27b-it:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "openrouter/free"
];

export const callOpenRouter = async (messages, model = null) => {
    // Eğer model belirtilmediyse listeden dene
    const modelsToTry = model ? [model] : OPENROUTER_MODELS;

    for (const currentModel of modelsToTry) {
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://lifecoach-ai.vercel.app",
                    "X-Title": "LifeCoach AI"
                },
                body: JSON.stringify({ model: currentModel, messages })
            });

            if (response.ok) {
                const data = await response.json();
                return data.choices[0].message.content;
            }
        } catch (e) {
            console.warn(`Model ${currentModel} error:`, e);
        }
    }
    throw new Error("AI servisi şu an yanıt veremiyor.");
};

export const generateStudyPlan = async (subject, hours, userLevel) => {
    const prompt = `
        Act as an expert study coach. 
        User Level: ${userLevel}
        Subject: ${subject}
        Available Time: ${hours} hours.
        
        Create a structured study plan broken down into 25-minute tasks.
        Output ONLY valid JSON array format like: 
        [{"task": "Review basic concepts", "duration": 25}, {"task": "Solve practice questions", "duration": 25}]
    `;

    const content = await callOpenRouter([{ role: "user", content: prompt }], "openai/gpt-3.5-turbo");
    const jsonStart = content.indexOf('[');
    const jsonEnd = content.lastIndexOf(']') + 1;
    return JSON.parse(content.substring(jsonStart, jsonEnd));
};

export const analyzeGoalInput = async (text) => {
    const prompt = `
        Act as a goal-setting expert. Analyze this user input: "${text}".
        Current Date: ${new Date().toISOString().split('T')[0]}.
        
        1. Extract the subject, current level, target level, and deadline.
        2. Assess feasibility (0-100). If < 50, explain why in feedback.
        3. Create a weekly milestone breakdown.
        4. Suggest daily study time (minutes).
        
        Output ONLY valid JSON:
        {
            "title": "Refined Goal Title",
            "subject": "Math/Physics/etc",
            "current_value": 15,
            "target_value": 30,
            "deadline": "YYYY-MM-DD",
            "feasibility_score": 85,
            "feedback": "Realistic goal...",
            "daily_effort_minutes": 45,
            "breakdown": [{"week": 1, "target": 17, "focus": "Foundations"}]
        }
    `;
    
    const content = await callOpenRouter([{ role: "user", content: prompt }], "openai/gpt-3.5-turbo");
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}') + 1;
    return JSON.parse(content.substring(jsonStart, jsonEnd));
};