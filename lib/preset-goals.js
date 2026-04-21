export const SUBJECT_CATEGORIES = {
  programming: {
    name: "Programlama",
    icon: "💻",
    examples: ["C++", "Python", "JavaScript", "Java", "React", "Flutter"],
    defaultTimeline: {
      beginner: "4 hafta",
      intermediate: "8 hafta",
      advanced: "12 hafta"
    }
  },
  mathematics: {
    name: "Matematik",
    icon: "📐",
    examples: ["Kalkülüs", "Lineer Cebir", "İstatistik", "Olasılık", "Sayılar Teorisi"],
    defaultTimeline: {
      beginner: "6 hafta",
      intermediate: "10 hafta",
      advanced: "16 hafta"
    }
  },
  physics: {
    name: "Fizik",
    icon: "⚡",
    examples: ["Mekanik", "Termodinamik", "Elektromanyetizma", "Kuantum Fiziği"],
    defaultTimeline: {
      beginner: "6 hafta",
      intermediate: "10 hafta",
      advanced: "14 hafta"
    }
  },
  science: {
    name: "Fen Bilimleri",
    icon: "🔬",
    examples: ["Kimya", "Biyoloji", "Astronomi", "Çevre Bilimi"],
    defaultTimeline: {
      beginner: "8 hafta",
      intermediate: "12 hafta",
      advanced: "20 hafta"
    }
  },
  languages: {
    name: "Dil Öğrenimi",
    icon: "🌍",
    examples: ["İngilizce", "Almanca", "Fransızca", "İspanyolca", "Japonca", "Çince"],
    defaultTimeline: {
      beginner: "12 hafta",
      intermediate: "24 hafta",
      advanced: "48 hafta"
    }
  },
  sports: {
    name: "Spor & Fitness",
    icon: "🏋️",
    examples: ["Koşu", "Yüzme", "Ağırlık", "Yoga", "Pilates", "Basketbol", "Futbol"],
    defaultTimeline: {
      beginner: "4 hafta",
      intermediate: "8 hafta",
      advanced: "12 hafta"
    }
  },
  music: {
    name: "Müzik",
    icon: "🎵",
    examples: ["Piyano", "Gitar", "Keman", "Davul", "Şan", "Beste"],
    defaultTimeline: {
      beginner: "8 hafta",
      intermediate: "16 hafta",
      advanced: "24 hafta"
    }
  },
  art: {
    name: "Sanat & Tasarım",
    icon: "🎨",
    examples: ["Çizim", "Nefes", "Fotoğrafçılık", "Grafik Tasarım", "UI/UX"],
    defaultTimeline: {
      beginner: "6 hafta",
      intermediate: "12 hafta",
      advanced: "20 hafta"
    }
  },
  business: {
    name: "İş & Girişimcilik",
    icon: "💼",
    examples: ["Startup", "Pazarlama", "Muhasebe", "Yatırım", "SEO"],
    defaultTimeline: {
      beginner: "4 hafta",
      intermediate: "8 hafta",
      advanced: "12 hafta"
    }
  },
  test_prep: {
    name: "Sınav Hazırlığı",
    icon: "📚",
    examples: ["YKS", "ALES", "DGS", "KPSS", "GRE", "GMAT", "TOEFL", "IELTS"],
    defaultTimeline: {
      beginner: "12 hafta",
      intermediate: "20 hafta",
      advanced: "32 hafta"
    }
  },
  health: {
    name: "Sağlık & Wellness",
    icon: "🧘",
    examples: ["Meditasyon", "Uyku Düzeni", "Beslenme", "Depresyon Yönetimi"],
    defaultTimeline: {
      beginner: "4 hafta",
      intermediate: "8 hafta",
      advanced: "12 hafta"
    }
  },
  other: {
    name: "Diğer",
    icon: "📌",
    examples: ["Genel", "Kişisel Gelişim", "Hobi"],
    defaultTimeline: {
      beginner: "4 hafta",
      intermediate: "8 hafta",
      advanced: "12 hafta"
    }
  }
};

export const PRESET_TIMELINES = [
  { label: "1 Hafta", value: 7, days: 7 },
  { label: "2 Hafta", value: 14, days: 14 },
  { label: "3 Hafta", value: 21, days: 21 },
  { label: "1 Ay", value: 30, days: 30 },
  { label: "6 Hafta", value: 42, days: 42 },
  { label: "2 Ay", value: 60, days: 60 },
  { label: "3 Ay", value: 90, days: 90 },
  { label: "6 Ay", value: 180, days: 180 },
  { label: "1 Yıl", value: 365, days: 365 }
];

export const PRESET_GOALS = {
  programming: [
    {
      title: "C++ Temelleri",
      description: "C++ programlama dilinin temel kavramlarını öğren: değişkenler, döngüler, fonksiyonlar",
      category: "programming",
      level: "beginner",
      suggestedTimeline: "4 hafta",
      milestones: ["Değişkenler ve veri tipleri", "Koşullu ifadeler ve döngüler", "Fonksiyonlar ve diziler"]
    },
    {
      title: "Python ile Nesne Yönelimli Programlama",
      description: "Python'da OOP prensiplerini uygulamayı öğren",
      category: "programming",
      level: "intermediate",
      suggestedTimeline: "6 hafta",
      milestones: ["Class ve object kavramları", "Inheritance ve polymorphism", "Encapsulation ve abstraction"]
    },
    {
      title: "JavaScript Web Geliştirme",
      description: "Modern JavaScript ve web teknolojileri ile dinamik web uygulamaları geliştir",
      category: "programming",
      level: "advanced",
      suggestedTimeline: "12 hafta",
      milestones: ["ES6+ özellikleri", "React/Vue temelleri", "API entegrasyonu", "Deployment"]
    },
    {
      title: "Veri Yapıları ve Algoritmalar",
      description: "Temel veri yapıları ve algoritmaları öğrenip uygula",
      category: "programming",
      level: "intermediate",
      suggestedTimeline: "8 hafta",
      milestones: ["Array ve Linked List", "Stack ve Queue", "Tree ve Graph", "Sorting algoritmaları"]
    }
  ],
  mathematics: [
    {
      title: "Kalkülüs I",
      description: "Diferansiyel kalkülüs temellerini öğren",
      category: "mathematics",
      level: "beginner",
      suggestedTimeline: "6 hafta",
      milestones: ["Limit kavramı", "Türev kuralları", "Zincir kuralı", "Uygulamalar"]
    },
    {
      title: "Lineer Cebir",
      description: "Matrisler, vektörler ve lineer denklem sistemleri",
      category: "mathematics",
      level: "intermediate",
      suggestedTimeline: "8 hafta",
      milestones: ["Vektör uzayları", "Matris işlemleri", "Özdeğerler ve özvektörler"]
    },
    {
      title: "İstatistik ve Olasılık",
      description: "Temel istatistik kavramları ve olasılık teorisi",
      category: "mathematics",
      level: "beginner",
      suggestedTimeline: "6 hafta",
      milestones: ["Tanımlayıcı istatistik", "Olasılık dağılımları", "Hipotez testleri"]
    }
  ],
  physics: [
    {
      title: "Fizik I - Mekanik",
      description: "Klasik mekanik temellerini öğren",
      category: "physics",
      level: "beginner",
      suggestedTimeline: "8 hafta",
      milestones: ["Newton yasaları", "Enerji ve iş", "Momentum", "Dönme hareketi"]
    },
    {
      title: "Termodinamik",
      description: "Isı, enerji ve entropi kavramlarını anla",
      category: "physics",
      level: "intermediate",
      suggestedTimeline: "6 hafta",
      milestones: ["Isı ve sıcaklık", "Termodinamik yasalar", "Entropi", "Carnot çevrimi"]
    },
    {
      title: "Elektromanyetizma",
      description: "Elektrik ve manyetik alanların temellerini öğren",
      category: "physics",
      level: "intermediate",
      suggestedTimeline: "10 hafta",
      milestones: ["Coulomb yasası", "Elektrik alanları", "Manyetik alanlar", "Elektromanyetik indüksiyon"]
    }
  ],
  languages: [
    {
      title: "İngilizce B1 Seviyesi",
      description: "Orta düzey İngilizce dil becerilerini geliştir",
      category: "languages",
      level: "intermediate",
      suggestedTimeline: "12 hafta",
      milestones: ["Gramer temelleri", "Günlük konuşma", "Okuma ve yazma", "İş İngilizcesi"]
    },
    {
      title: "Japonca Başlangıç",
      description: "Japonca dilinin temel yapısını ve Hiragana/Katakana'yı öğren",
      category: "languages",
      level: "beginner",
      suggestedTimeline: "8 hafta",
      milestones: ["Hiragana okuma yazma", "Katakana okuma yazma", "Temel Kanji", "Temel konuşma kalıpları"]
    },
    {
      title: "Almanca A1-A2",
      description: "Başlangıç seviyesi Almanca öğren",
      category: "languages",
      level: "beginner",
      suggestedTimeline: "16 hafta",
      milestones: ["Alfabe ve telaffuz", "Temel gramer", "Günlük diyaloglar", "Basit metinler"]
    }
  ],
  sports: [
    {
      title: "Sabah Koşusu Rutini",
      description: "Her gün düzenli sabah koşusu yaparak kondisyonunu geliştir",
      category: "sports",
      level: "beginner",
      suggestedTimeline: "4 hafta",
      milestones: ["Hafif tempolu koşu", "Orta tempolu koşu", "Mesafe artırma", "5K koşusu"]
    },
    {
      title: "Haftada 3 Gün Fitness",
      description: "Haftada 3 gün düzenli antrenman yaparak güç kazan",
      category: "sports",
      level: "intermediate",
      suggestedTimeline: "8 hafta",
      milestones: ["Temel egzersizler", "Ağırlık artırma", "Program çeşitlendirme", "Vücut geliştirme"]
    },
    {
      title: "Yoga ve Esneme",
      description: "Günlük yoga ve esneme rutinleri ile esnekliği artır",
      category: "sports",
      level: "beginner",
      suggestedTimeline: "4 hafta",
      milestones: ["Temel pozlAR", "Esneme rutinleri", "Orta seviye yoga", "İleri yoga"]
    }
  ],
  test_prep: [
    {
      title: "YKS Matematik Hazırlığı",
      description: "YKS sınavı için matematik konularını tamamla",
      category: "test_prep",
      level: "intermediate",
      suggestedTimeline: "24 hafta",
      milestones: ["Temel matematik", "Orta matematik", "İleri matematik", "Deneme sınavları"]
    },
    {
      title: "TOEFL Hazırlığı",
      description: "TOEFL İBT sınavı için kapsamlı hazırlık",
      category: "test_prep",
      level: "advanced",
      suggestedTimeline: "12 hafta",
      milestones: ["Reading", "Listening", "Speaking", "Writing", "Tam deneme"]
    },
    {
      title: "ALES Sayısal Hazırlık",
      description: "ALES sınavı için sayısal alan hazırlığı",
      category: "test_prep",
      level: "intermediate",
      suggestedTimeline: "8 hafta",
      milestones: ["Temel kavramlar", "Problem çözme", "Veri yorumlama", "Deneme"]
    }
  ],
  music: [
    {
      title: "Gitar Temelleri",
      description: "Akustik veya elektro gitar çalmayı öğren",
      category: "music",
      level: "beginner",
      suggestedTimeline: "8 hafta",
      milestones: ["Temel akorlar", "Parmak egzersizleri", "Basit parçalar", "Şarkı çalma"]
    },
    {
      title: "Piyano Başlangıç",
      description: "Piyano çalmaya sıfırdan başla",
      category: "music",
      level: "beginner",
      suggestedTimeline: "6 hafta",
      milestones: ["Parmak pozisyonu", "Notalar", "Basit parçalar", "İki el koordinasyonu"]
    }
  ],
  art: [
    {
      title: "Temel Çizim Teknikleri",
      description: "Profesyonel çizim tekniklerini öğren",
      category: "art",
      level: "beginner",
      suggestedTimeline: "6 hafta",
      milestones: ["Perspektif", "Gölgelendirme", "Kompozisyon", "Anatomi"]
    },
    {
      title: "Fotoğrafçılık Temelleri",
      description: "Kompozisyon, ışık ve editing tekniklerini öğren",
      category: "art",
      level: "beginner",
      suggestedTimeline: "4 hafta",
      milestones: ["Kompozisyon kuralları", "Işık kullanımı", "Enstantane ve diyafram", "Editing"]
    }
  ],
  health: [
    {
      title: "Günlük Meditasyon",
      description: "Her gün 15 dakika meditasyon yaparak zihinsel berraklığı artır",
      category: "health",
      level: "beginner",
      suggestedTimeline: "4 hafta",
      milestones: ["5 dakika meditasyon", "10 dakika meditasyon", "15 dakika meditasyon", "Farkındalık"]
    },
    {
      title: "Uyku Düzeni Optimizasyonu",
      description: "Düzenli uyku saatleri ile uyku kalitesini artır",
      category: "health",
      level: "beginner",
      suggestedTimeline: "2 hafta",
      milestones: ["Sabit uyku saati", "Ekran saati düşürme", "Uyku ortamı", "Kaliteli uyku"]
    },
    {
      title: "Sağlıklı Beslenme Rutini",
      description: "Dengeli ve sağlıklı beslenme alışkanlığı kazan",
      category: "health",
      level: "beginner",
      suggestedTimeline: "4 hafta",
      milestones: ["Kahvaltı düzeni", "Su tüketimi", "Öğün planlaması", "Abur cubur kontrolü"]
    }
  ],
  science: [
    {
      title: "Genel Kimya",
      description: "Kimyanın temel kavramlarını öğren",
      category: "science",
      level: "beginner",
      suggestedTimeline: "8 hafta",
      milestones: ["Atom yapısı", "Periyodik tablo", "Kimyasal bağlar", "Reaksiyonlar"]
    },
    {
      title: "Genel Biyoloji",
      description: "Canlıların temel yapısı ve işlevleri",
      category: "science",
      level: "beginner",
      suggestedTimeline: "10 hafta",
      milestones: ["Hücre yapısı", "Genetik", "Evolüsyon", "Ekoloji"]
    }
  ],
  business: [
    {
      title: "Dijital Pazarlama Temelleri",
      description: "Dijital pazarlama stratejilerini öğren ve uygula",
      category: "business",
      level: "beginner",
      suggestedTimeline: "4 hafta",
      milestones: ["Sosyal medya pazarlaması", "İçerik pazarlaması", "E-posta pazarlaması", "Analitik"]
    },
    {
      title: "Startup Temelleri",
      description: "Bir startup kurma sürecini öğren",
      category: "business",
      level: "intermediate",
      suggestedTimeline: "8 hafta",
      milestones: ["Fikir geliştirme", "MVP oluşturma", "Müşteri bulma", "Pitch hazırlama"]
    }
  ],
  other: [
    {
      title: "Okuma Rutini",
      description: "Haftada bir kitap okuyarak okuma alışkanlığı kazan",
      category: "other",
      level: "beginner",
      suggestedTimeline: "4 hafta",
      milestones: ["Günlük 20 sayfa", "Günlük 30 sayfa", "Haftada bir kitap", "Notlar alma"]
    },
    {
      title: "Yeni Bir Hobi Öğren",
      description: "Yeni bir beceri veya hobi öğrenmeye başla",
      category: "other",
      level: "beginner",
      suggestedTimeline: "4 hafta",
      milestones: ["Araştırma yap", "Temel bilgiler", "İlk uygulama", "Gelişme"]
    }
  ]
};

export function getPresetGoalsByCategory(category) {
  return PRESET_GOALS[category] || PRESET_GOALS.other;
}

export function getAllPresetGoals() {
  const allGoals = [];
  Object.values(PRESET_GOALS).forEach(categoryGoals => {
    allGoals.push(...categoryGoals);
  });
  return allGoals;
}

export function suggestTimeline(subject, targetDate, category, level = "intermediate") {
  if (targetDate) {
    const today = new Date();
    const target = new Date(targetDate);
    const daysDiff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 0) {
      if (daysDiff <= 7) return { timeline: "1 hafta", days: daysDiff };
      if (daysDiff <= 14) return { timeline: "2 hafta", days: daysDiff };
      if (daysDiff <= 21) return { timeline: "3 hafta", days: daysDiff };
      if (daysDiff <= 30) return { timeline: "1 ay", days: daysDiff };
      if (daysDiff <= 42) return { timeline: "6 hafta", days: daysDiff };
      if (daysDiff <= 60) return { timeline: "2 ay", days: daysDiff };
      if (daysDiff <= 90) return { timeline: "3 ay", days: daysDiff };
      if (daysDiff <= 180) return { timeline: "6 ay", days: daysDiff };
      return { timeline: "6+ ay", days: daysDiff };
    }
  }
  
  const categoryData = SUBJECT_CATEGORIES[category] || SUBJECT_CATEGORIES.other;
  const timelineMap = categoryData.defaultTimeline;
  return { 
    timeline: timelineMap[level] || timelineMap.intermediate, 
    days: null,
    suggested: true 
  };
}

export function searchPresetGoals(query) {
  const allGoals = getAllPresetGoals();
  const queryLower = query.toLowerCase();
  
  return allGoals.filter(goal => 
    goal.title.toLowerCase().includes(queryLower) ||
    goal.description.toLowerCase().includes(queryLower) ||
    goal.category.toLowerCase().includes(queryLower)
  );
}