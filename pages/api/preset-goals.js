import { SUBJECT_CATEGORIES, PRESET_GOALS, getPresetGoalsByCategory, getAllPresetGoals, suggestTimeline, searchPresetGoals } from '@/lib/preset-goals';
import { callGeminiWithFallback } from '@/lib/gemini-multi-api';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, category, subject, targetDate, level, search, goalTitle } = req.query;

    if (action === 'categories') {
      const categories = Object.entries(SUBJECT_CATEGORIES).map(([key, value]) => ({
        id: key,
        ...value
      }));
      return res.status(200).json({ success: true, categories });
    }

    if (action === 'byCategory') {
      if (!category) {
        return res.status(400).json({ error: 'Category parameter required' });
      }
      const goals = getPresetGoalsByCategory(category);
      return res.status(200).json({ success: true, goals, category });
    }

    if (action === 'all') {
      const goals = getAllPresetGoals();
      return res.status(200).json({ success: true, goals, count: goals.length });
    }

    if (action === 'search') {
      if (!search) {
        return res.status(400).json({ error: 'Search parameter required' });
      }
      const goals = searchPresetGoals(search);
      return res.status(200).json({ success: true, goals, count: goals.length });
    }

    if (action === 'suggestTimeline') {
      const suggestion = suggestTimeline(subject, targetDate, category, level);
      return res.status(200).json({ success: true, ...suggestion });
    }

    if (action === 'generateFromGoal') {
      const goalTitle = req.body.goalTitle || req.query.goalTitle;
      const targetDate = req.body.targetDate || req.query.targetDate;
      
      if (!goalTitle) {
        return res.status(400).json({ error: 'goalTitle parameter required' });
      }

      const detectedCategory = detectGoalCategory(goalTitle);
      const timelineSuggestion = suggestTimeline(goalTitle, targetDate, detectedCategory, 'intermediate');

      const breakdown = await generateSmartBreakdown(goalTitle, detectedCategory, timelineSuggestion);

      return res.status(200).json({
        success: true,
        category: detectedCategory,
        timeline: timelineSuggestion,
        breakdown
      });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error("Preset goals API error:", error);
    return res.status(500).json({ error: error.message });
  }
}

function detectGoalCategory(goalTitle) {
  const title = goalTitle.toLowerCase();
  
  if (title.includes('c++') || title.includes('python') || title.includes('java') || 
      title.includes('javascript') || title.includes('program') || title.includes('kod') ||
      title.includes('yazılım') || title.includes('web') || title.includes('react') ||
      title.includes('flutter') || title.includes('mobile')) {
    return 'programming';
  }
  
  if (title.includes('matematik') || title.includes('calculus') || title.includes('kalkülüs') ||
      title.includes('cebir') || title.includes('geometri') || title.includes('trigonometri') ||
      title.includes('istatistik') || title.includes('olasılık')) {
    return 'mathematics';
  }
  
  if (title.includes('fizik') || title.includes('mekanik') || title.includes('termodinamik') ||
      title.includes('elektro') || title.includes('kuantum')) {
    return 'physics';
  }
  
  if (title.includes('ingilizce') || title.includes('almanca') || title.includes('fransızca') ||
      title.includes('japonca') || title.includes('ispanyolca') || title.includes('dil') ||
      title.includes('language')) {
    return 'languages';
  }
  
  if (title.includes('koş') || title.includes('spor') || title.includes('fitness') || 
      title.includes('gym') || title.includes('yüzme') || title.includes('yoga') ||
      title.includes('basket') || title.includes('futbol')) {
    return 'sports';
  }
  
  if (title.includes('yks') || title.includes('ales') || title.includes('dgs') || 
      title.includes('kpss') || title.includes('toefl') || title.includes('ielts') ||
      title.includes('sınav') || title.includes('sınava hazırlık')) {
    return 'test_prep';
  }
  
  if (title.includes('gitar') || title.includes('piyano') || title.includes('müzik') ||
      title.includes('davul') || title.includes('şan') || title.includes('muzik')) {
    return 'music';
  }
  
  if (title.includes('çizim') || title.includes('sanat') || title.includes('tasarım') ||
      title.includes('fotoğraf') || title.includes('grafik') || title.includes('ui') ||
      title.includes('ux')) {
    return 'art';
  }
  
  if (title.includes('kimya') || title.includes('biyoloji') || title.includes('astronomi') ||
      title.includes('fen') || title.includes('bilim')) {
    return 'science';
  }
  
  if (title.includes('pazarlama') || title.includes('iş') || title.includes('girişim') ||
      title.includes('startup') || title.includes('yönetim') || title.includes('business')) {
    return 'business';
  }
  
  if (title.includes('meditasyon') || title.includes('uyku') || title.includes('beslenme') ||
      title.includes('sağlık') || title.includes('wellness') || title.includes('diyet')) {
    return 'health';
  }
  
  return 'other';
}

async function generateSmartBreakdown(goalTitle, category, timelineSuggestion) {
  try {
    const categoryData = SUBJECT_CATEGORIES[category] || SUBJECT_CATEGORIES.other;
    const timelineWeeks = timelineSuggestion.days ? Math.ceil(timelineSuggestion.days / 7) : 8;

    const prompt = `Kullanıcı "${goalTitle}" hedefini belirledi. 
Kategori: ${categoryData.name}
Önerilen zaman çizelgesi: ${timelineSuggestion.timeline}

Bu bilgilere göre detaylı bir hedef planı oluştur. Sadece geçerli JSON döndür:

{
  "mainGoal": "${goalTitle}",
  "category": "${category}",
  "goalSummary": "Başarı neye benzer",
  "timelineWeeks": ${timelineWeeks},
  "difficulty": "beginner|intermediate|advanced",
  "priority": "low|medium|high",
  "subgoals": [
    {"id": 1, "title": "Alt hedef 1", "description": "Açıklama", "weekTarget": 2, "xpReward": 50, "difficulty": "easy"}
  ],
  "milestones": [
    {"week": ${Math.ceil(timelineWeeks * 0.25)}, "target": "İlk milestone", "xpReward": 100, "celebration": "🎉", "checkpoints": ["cp1", "cp2"]}
  ],
  "dailyHabits": [
    {"habit": "Günlük aktivite", "frequency": "daily", "duration": "15 min", "impact": "Etkisi"}
  ],
  "riskAnalysis": [
    {"risk": "Risk", "likelihood": "medium", "impact": "Etki", "mitigation": "Çözüm"}
  ],
  "successMetrics": ["Metrik 1", "Metrik 2"],
  "motivationReminders": ["Motivasyon 1", "Motivasyon 2"],
  "potentialObstacles": [
    {"obstacle": "Engel", "preventionStrategy": "Önleme"}
  ],
  "celebrationPlan": "Kutlama planı",
  "confidenceScore": 0.8
}

Haftalık milestone'ları %25, %50, %75 ve %100 noktalarına yerleştir.
XP puanlamasını dengeli tut.
JSON formatında sadece yanıt ver, markdown kullanma.`;

    const response = await callGeminiWithFallback(prompt, "", {
      model: "gemini-2.0-flash",
      maxOutputTokens: 3000
    });

    if (!response) {
      return generateFallbackBreakdown(goalTitle, category, timelineWeeks);
    }

    const jsonText = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      return JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return generateFallbackBreakdown(goalTitle, category, timelineWeeks);
    }

  } catch (error) {
    console.error("Generate breakdown error:", error);
    return generateFallbackBreakdown(goalTitle, category, 8);
  }
}

function generateFallbackBreakdown(goalTitle, category, timelineWeeks) {
  const categoryData = SUBJECT_CATEGORIES[category] || SUBJECT_CATEGORIES.other;
  
  return {
    mainGoal: goalTitle,
    category: category,
    goalSummary: `${goalTitle} hedefine ulaşmak için çalışmaya devam edin.`,
    timelineWeeks: timelineWeeks,
    difficulty: "medium",
    priority: "medium",
    subgoals: [
      { id: 1, title: "Hedefi planla", description: "Adımlarını belirle", weekTarget: Math.ceil(timelineWeeks * 0.15), xpReward: 50, difficulty: "easy" },
      { id: 2, title: "Temel bilgileri öğren", description: "Başlangıç seviyesi bilgiler", weekTarget: Math.ceil(timelineWeeks * 0.3), xpReward: 75, difficulty: "easy" },
      { id: 3, title: "Pratik yap", description: "Öğrendiklerini uygula", weekTarget: Math.ceil(timelineWeeks * 0.6), xpReward: 100, difficulty: "medium" },
      { id: 4, title: "İleri seviye", description: "Konuyu derinleştir", weekTarget: Math.ceil(timelineWeeks * 0.85), xpReward: 150, difficulty: "hard" },
      { id: 5, title: "Hedefe ulaş", description: "Son düzeltmeler ve tamamlama", weekTarget: timelineWeeks, xpReward: 200, difficulty: "medium" }
    ],
    milestones: [
      { week: Math.ceil(timelineWeeks * 0.25), target: "İlk ilerleme", xpReward: 75, celebration: "İyi gidiyorsun! 🎉", checkpoints: ["Plan yapıldı", "İlk adım atıldı"] },
      { week: Math.ceil(timelineWeeks * 0.5), target: "Yarı yol", xpReward: 150, celebration: "Yarısını bitirdin! 🔥", checkpoints: ["İlerleme kaydedildi"] },
      { week: Math.ceil(timelineWeeks * 0.75), target: "Son koşuş", xpReward: 200, celebration: "Neredeyse bitti! 💪", checkpoints: ["Son düz"] },
      { week: timelineWeeks, target: "Hedefe ulaşıldı!", xpReward: 300, celebration: "Başardın! 🏆", checkpoints: ["Hedef tamamlandı"] }
    ],
    dailyHabits: [
      { habit: "Günde 30 dk ayır", frequency: "daily", duration: "30 dk", impact: "İlerleme için gerekli" },
      { habit: "Haftada 1 tekrar", frequency: "weekly", duration: "1 saat", impact: "Bilgileri pekiştir" }
    ],
    riskAnalysis: [
      { risk: "Motivasyon kaybı", likelihood: "medium", impact: "İlerleme yavaşlar", mitigation: "Küçük başarıları kutla" },
      { risk: "Zaman yetersizliği", likelihood: "low", impact: "Plan geri kalabilir", mitigation: "Her gün küçük adımlar at" }
    ],
    successMetrics: ["Hedefe ulaşıldı", "İlerleme kaydedildi", "Beceri kazanıldı"],
    motivationReminders: ["Başarı seninle!", "Devam et, değerlisin!", "Her adım önemli"],
    potentialObstacles: [
      { obstacle: "Zaman yetersizliği", preventionStrategy: "Her gün küçük adımlar at" },
      { obstacle: "Motivasyon düşüşü", preventionStrategy: "Milestone'ları kutla" }
    ],
    dependencyGoals: [],
    celebrationPlan: "Hedefini tamamladığında kendini ödüllendir!",
    confidenceScore: 0.75,
    isFallback: true
  };
}