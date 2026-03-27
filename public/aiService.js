// Not: Bu dosya client-side kullanım içindir.
// Gerçek API çağrıları /api/chat endpoint'ine yapılmalıdır.
// Bu fonksiyonlar sadece referans olarak tutulmaktadır.

export const generateStudyPlan = async (subject, hours, userLevel) => {
    // API endpoint üzerinden çağrı yap
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: `Create a study plan for ${subject}, ${hours} hours, level: ${userLevel}. Output JSON format with tasks and durations.`}
        )
    });
    const data = await response.json();
    
    // JSON yanıtı parse et
    const content = data.response || '';
    const jsonStart = content.indexOf('[');
    const jsonEnd = content.lastIndexOf(']') + 1;
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
        return JSON.parse(content.substring(jsonStart, jsonEnd));
    }
    throw new Error("Study plan generation failed");
};

export const analyzeGoalInput = async (text) => {
    // API endpoint üzerinden çağrı yap
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: `Analyze this goal: "${text}". Output JSON with title, subject, current_value, target_value, deadline, feasibility_score, feedback, daily_effort_minutes, and breakdown.`}
        )
    });
    const data = await response.json();
    
    // JSON yanıtı parse et
    const content = data.response || '';
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}') + 1;
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
        return JSON.parse(content.substring(jsonStart, jsonEnd));
    }
    throw new Error("Goal analysis failed");
};