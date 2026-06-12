import { getKVData, setKVData } from './db.js';

const GOAL_TEMPLATES = {
  startup: {
    keywords: ['startup', 'girişim', 'şirket', 'firma', 'kurmak', 'iş', 'e-ticaret', 'yazılım şirketi'],
    tasks: [
      { title: 'Şirket Türünü Belirle', description: 'Limited, Anonim, Şahıs şirketi gibi türler araştır', duration: '1-2 gün' },
      { title: 'Domain & İsim Araştırması', description: 'Uygun alan adı ve marka adı belirle', duration: '1 gün' },
      { title: 'İş Planı Hazırla', description: 'İş modeli kanvası ve fizibilite raporu oluştur', duration: '3-5 gün' },
      { title: 'Landing Page Oluştur', description: 'Ürün/hizmet için açılış sayfası hazırla', duration: '2-3 gün' },
      { title: 'Hedef Müşteri Profili', description: 'İdeal müşteri avatarı oluştur ve pazar araştırması yap', duration: '2-3 gün' },
      { title: 'MVP Geliştirme', description: 'Minimum çalışabilir ürünü geliştir', duration: '2-4 hafta' },
      { title: 'İlk Müşteri Kazanımı', description: 'MVP için ilk gerçek kullanıcıları bul', duration: '1-2 hafta' },
      { title: 'Geri Bildirim Topla ve İterasyon', description: 'İlk kullanıcılardan feedback al ve ürünü iyileştir', duration: '1-2 hafta' },
    ],
  },
  education: {
    keywords: ['ders', 'öğrenmek', 'eğitim', 'kurs', 'üniversite', 'sertifika', 'yabancı dil', 'ingilizce'],
    tasks: [
      { title: 'Hedef Belirle', description: 'Hangi alanda/konuda eğitim almak istediğini netleştir', duration: '1 gün' },
      { title: 'Kaynak Araştırması', description: 'En iyi kurs, kitap ve materyalleri belirle', duration: '2-3 gün' },
      { title: 'Çalışma Programı Oluştur', description: 'Haftalık düzenli çalışma takvimi hazırla', duration: '1 gün' },
      { title: 'Temel Bilgileri Öğren', description: 'Konunun temel kavramlarını ve prensiplerini öğren', duration: '1-2 hafta' },
      { title: 'Pratik Yap', description: 'Öğrendiklerini uygulamalı projelerle pekiştir', duration: 'sürekli' },
      { title: 'İlerlemeyi Değerlendir', description: 'Haftalık quiz veya testlerle bilgini ölç', duration: 'her hafta' },
      { title: 'Sertifika/Proje Tamamla', description: 'Öğrenimini belgeleyen bir proje veya sınav tamamla', duration: 'değişken' },
    ],
  },
  career: {
    keywords: ['kariyer', 'iş bulmak', 'cv', 'mülakat', 'iş görüşmesi', 'yeni iş'],
    tasks: [
      { title: 'Hedef Pozisyonu Belirle', description: 'Hangi rollerde çalışmak istediğine karar ver', duration: '1-2 gün' },
      { title: 'CV ve Ön Yazı Hazırla', description: 'Hedef pozisyona uygun CV ve ön yazı hazırla', duration: '2-3 gün' },
      { title: 'LinkedIn Profilini Güncelle', description: 'Profesyonel profilini optimize et', duration: '1 gün' },
      { title: 'İş İlanlarını Tara', description: 'Hedef pozisyonlar için günlük iş ilanı takibi başlat', duration: 'sürekli' },
      { title: 'Başvuru Yap', description: 'Hedeflenen şirketlere başvuru gönder', duration: 'her gün' },
      { title: 'Mülakat Hazırlığı', description: 'Yaygın mülakat sorularına hazırlan ve şirket araştırması yap', duration: '1 hafta' },
      { title: 'Takip ve Geri Bildirim', description: 'Başvuruları takip et, geri bildirimleri değerlendir', duration: 'sürekli' },
    ],
  },
  finance: {
    keywords: ['para', 'yatırım', 'bütçe', 'tasarruf', 'birikim', 'borç', 'finansal özgürlük'],
    tasks: [
      { title: 'Mevcut Durumu Analiz Et', description: 'Gelir-gider tablosu ve net değer hesabı çıkar', duration: '1-2 gün' },
      { title: 'Bütçe Oluştur', description: 'Aylık harcama kategorileri ile bütçe planı hazırla', duration: '1 gün' },
      { title: 'Acil Durum Fonu', description: '3-6 aylık giderleri karşılayacak acil durum fonu oluştur', duration: '3-6 ay' },
      { title: 'Borç Yönetim Stratejisi', description: 'Varsa borçları önceliklendir ve ödeme planı yap', duration: 'değişken' },
      { title: 'Yatırım Araştırması', description: 'Risk profiline uygun yatırım araçlarını araştır', duration: '1-2 hafta' },
      { title: 'Düzenli Yatırıma Başla', description: 'Aylık düzenli yatırım/ birikim alışkanlığı edin', duration: 'sürekli' },
      { title: 'Finansal Hedefler Koy', description: 'Kısa/orta/uzun vadeli finansal hedefler belirle', duration: '1 gün' },
    ],
  },
  health: {
    keywords: ['sağlık', 'kilo', 'spor', 'diyet', 'egzersiz', 'fit', 'form'],
    tasks: [
      { title: 'Sağlık Kontrolü', description: 'Check-up ve temel sağlık testleri yaptır', duration: '1 gün' },
      { title: 'Hedef Belirle ve Ölç', description: 'Mevcut durumu kaydet ve hedef belirle (kilo, vücut ölçüleri)', duration: '1 gün' },
      { title: 'Beslenme Planı', description: 'Sağlıklı ve sürdürülebilir beslenme programı oluştur', duration: '2-3 gün' },
      { title: 'Egzersiz Rutini', description: 'Haftalık egzersiz programı belirle (kardiyo + ağırlık)', duration: '1 hafta' },
      { title: 'Alışkanlık Takibi', description: 'Günlük su, uyku, adım sayısı gibi metrikleri takip et', duration: 'sürekli' },
      { title: 'İlerleme Değerlendirmesi', description: 'Haftalık/aylık ölçüm ve fotoğraf ile ilerlemeyi kaydet', duration: 'her hafta' },
      { title: 'Sürdürülebilir Yaşam Tarzı', description: 'Kısa vadeli diyet yerine uzun vadeli sağlıklı yaşam alışkanlıkları geliştir', duration: 'sürekli' },
    ],
  },
};

export function detectGoalType(text) {
  const lower = text.toLowerCase();
  let bestMatch = 'custom';
  let bestScore = 0;

  for (const [type, template] of Object.entries(GOAL_TEMPLATES)) {
    const score = template.keywords.reduce((acc, kw) => {
      return acc + (lower.includes(kw) ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = type;
    }
  }
  return bestMatch;
}

export function generateTaskChain(text) {
  const goalType = detectGoalType(text);
  const template = GOAL_TEMPLATES[goalType];

  if (goalType === 'custom') {
    return {
      goalType: 'custom',
      tasks: [
        { id: 't1', title: 'Hedefi Netleştir', description: 'Ne istediğini ve neden istediğini tanımla', order: 1, duration: '1 gün', dependsOn: [], status: 'pending' },
        { id: 't2', title: 'Araştırma Yap', description: 'Hedefinle ilgili kaynakları ve yöntemleri araştır', order: 2, duration: '2-3 gün', dependsOn: ['t1'], status: 'pending' },
        { id: 't3', title: 'Plan Oluştur', description: 'Adım adım uygulama planı hazırla', order: 3, duration: '1-2 gün', dependsOn: ['t2'], status: 'pending' },
        { id: 't4', title: 'Uygulamaya Başla', description: 'İlk adımı at ve düzenli devam et', order: 4, duration: 'sürekli', dependsOn: ['t3'], status: 'pending' },
        { id: 't5', title: 'Değerlendir ve Güncelle', description: 'İlerlemeyi düzenli kontrol et ve planı güncelle', order: 5, duration: 'sürekli', dependsOn: ['t4'], status: 'pending' },
      ],
    };
  }

  const tasks = template.tasks.map((t, i) => ({
    id: `t${i + 1}`,
    title: t.title,
    description: t.description,
    order: i + 1,
    duration: t.duration,
    dependsOn: i > 0 ? [`t${i}`] : [],
    status: i === 0 ? 'active' : 'pending',
  }));

  return { goalType, tasks };
}

export async function saveTaskChain(userId, text, goalTitle) {
  const chain = generateTaskChain(text);
  const key = `task_chains:${userId}`;
  const stored = await getKVData(key);
  if (!Array.isArray(stored)) stored.data = [];

  const newChain = {
    id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    goalTitle: goalTitle || text,
    goalType: chain.goalType,
    tasks: chain.tasks,
    status: 'active',
    progress: 0,
    totalTasks: chain.tasks.length,
    completedTasks: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  stored.data.push(newChain);
  await setKVData(key, stored);

  return newChain;
}

export async function getTaskChains(userId, status = null) {
  const key = `task_chains:${userId}`;
  const stored = await getKVData(key);
  let chains = stored?.data || [];

  if (status) {
    chains = chains.filter(c => c.status === status);
  }

  return chains.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function updateTaskStatus(userId, chainId, taskId, newStatus) {
  const key = `task_chains:${userId}`;
  const stored = await getKVData(key);
  const chains = stored?.data || [];
  const chain = chains.find(c => c.id === chainId);
  if (!chain) return null;

  const task = chain.tasks.find(t => t.id === taskId);
  if (!task) return null;

  task.status = newStatus;
  chain.completedTasks = chain.tasks.filter(t => t.status === 'completed').length;
  chain.progress = Math.round((chain.completedTasks / chain.totalTasks) * 100);
  chain.updatedAt = new Date().toISOString();

  if (chain.completedTasks === chain.totalTasks) {
    chain.status = 'completed';
  }

  await setKVData(key, stored);
  return chain;
}
