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