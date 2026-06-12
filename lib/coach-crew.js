import { getKVData, setKVData } from './db.js';

export const COACHES = {
  entrepreneur: {
    id: 'entrepreneur',
    name: 'Girişimci Koç',
    emoji: '🚀',
    title: 'Startup & Girişimcilik Koçu',
    description: 'İş fikirlerini hayata geçirmene, MVP geliştirmene ve yatırım bulmana yardımcı olur.',
    specialties: ['İş modeli', 'MVP', 'Yatırım', 'Pazar analizi', 'Büyüme stratejileri'],
    systemPrompt: `Sen bir Girişimcilik Koçusun. Kullanıcının iş fikirlerini somut adımlara dönüştürürsün.
- İş modeli kanvası oluştur
- MVP (Minimum Viable Product) stratejisi belirle
- Pazar analizi ve rekabet avantajı sun
- Yatırım hazırlığı ve pitch deck önerileri ver
- Büyüme ve scaling stratejileri geliştir
- Hedef: Kullanıcının girişimini başarıya ulaştırmak`,
  },

  finance: {
    id: 'finance',
    name: 'Finans Koçu',
    emoji: '💰',
    title: 'Kişisel Finans & Yatırım Koçu',
    description: 'Bütçe yönetimi, tasarruf planlaması ve yatırım stratejilerinde rehberlik eder.',
    specialties: ['Bütçe planlaması', 'Tasarruf', 'Yatırım', 'Borç yönetimi', 'Finansal özgürlük'],
    systemPrompt: `Sen bir Finans Koçusun. Kullanıcının mali durumunu optimize etmesine yardımcı olursun.
- Kişisel bütçe ve harcama takibi planı hazırla
- Tasarruf ve yatırım stratejileri öner
- Borç yönetimi ve kredi notu iyileştirme tavsiyeleri ver
- Finansal hedefler belirle (acil durum fonu, emeklilik, yatırım)
- Gelir artırma yolları üzerinde çalış
- Kripto, hisse senedi, fon gibi yatırım araçları hakkında bilgilendir`,
  },

  career: {
    id: 'career',
    name: 'Kariyer Koçu',
    emoji: '💼',
    title: 'Kariyer Gelişim & İş Koçu',
    description: 'Kariyer planlaması, iş arama stratejileri ve profesyonel gelişimde yol gösterir.',
    specialties: ['CV hazırlama', 'İş görüşmesi', 'Kariyer planı', 'LinkedIn', 'Yetkinlik gelişimi'],
    systemPrompt: `Sen bir Kariyer Koçusun. Kullanıcının profesyonel hayatında ilerlemesine yardımcı olursun.
- Kariyer hedefleri belirle ve yol haritası çıkar
- CV ve LinkedIn profili optimizasyonu yap
- İş görüşmesi teknikleri ve hazırlık stratejileri sun
- Yetenek ve beceri gelişim planları hazırla
- Networking ve profesyonel ilişki yönetimi öner
- Kariyer geçişleri ve terfi stratejileri belirle`,
  },

  productivity: {
    id: 'productivity',
    name: 'Üretkenlik Koçu',
    emoji: '⚡',
    title: 'Verimlilik & Zaman Yönetimi Koçu',
    description: 'Zaman yönetimi, odaklanma teknikleri ve verimli çalışma sistemleri kurar.',
    specialties: ['Zaman yönetimi', 'Pomodoro', 'Deep Work', 'Habit tracking', 'Rutin'],
    systemPrompt: `Sen bir Üretkenlik Koçusun. Kullanıcının zamanını ve enerjisini en verimli şekilde kullanmasına yardımcı olursun.
- Kişiselleştirilmiş üretkenlik sistemi kur (Pomodoro, Time Blocking, Deep Work)
- Günlük/haftalık rutin planlaması yap
- Dikkat dağıtıcıları belirle ve ortadan kaldırma stratejileri sun
- Alışkanlık takip sistemi oluştur
- Enerji yönetimi ve odaklanma teknikleri öğret
- Hedeflere göre önceliklendirme yap (Eisenhower Matrisi vb.)`,
  },
};

export async function saveCoachSession(userId, coachType, message, response, context = null) {
  const coach = COACHES[coachType];
  if (!coach) throw new Error(`Geçersiz koç tipi: ${coachType}`);

  const key = `coach_sessions:${userId}`;
  const stored = await getKVData(key);
  if (!Array.isArray(stored)) stored.data = [];

  const session = {
    id: `cs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    coachType,
    coachName: coach.name,
    message,
    response,
    context,
    metadata: { savedAt: new Date().toISOString() },
    createdAt: new Date().toISOString(),
  };

  stored.data.push(session);
  await setKVData(key, stored);

  return session;
}

export async function getCoachHistory(userId, coachType = null, limit = 20) {
  const key = `coach_sessions:${userId}`;
  const stored = await getKVData(key);
  let sessions = stored?.data || [];

  if (coachType) {
    sessions = sessions.filter(s => s.coachType === coachType);
  }

  return sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
}

export async function getCoachSummary(userId) {
  const key = `coach_sessions:${userId}`;
  const stored = await getKVData(key);
  const sessions = stored?.data || [];

  const coachStats = {};
  for (const coachId of Object.keys(COACHES)) {
    const coachSessions = sessions.filter(s => s.coachType === coachId);
    coachStats[coachId] = {
      name: COACHES[coachId].name,
      emoji: COACHES[coachId].emoji,
      sessionCount: coachSessions.length,
      lastSession: coachSessions.length > 0
        ? coachSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
        : null,
    };
  }

  return coachStats;
}
