/**
 * Hızlı işlem kartları — her kart tıklandığında chat'e gönderilecek prompt ve API modları.
 */

export const QUICK_ACTIONS = [
  {
    id: "goal_plan",
    label: "Hedef Planla",
    prompt: `Benim için SMART hedef çerçevesinde detaylı bir hedef planı oluştur.

Lütfen şunları yap:
1. Hedefimi netleştirmek için 2-3 kısa soru sor (spesifik, ölçülebilir, ulaşılabilir, ilgili, zamanlı).
2. Ardından haftalık milestone'lar ve günlük micro-görevler öner.
3. Uygun görürsen Google Takvim'e 7 günlük plan etkinlikleri eklemek için add_calendar_event aracını kullan.

Türkçe yanıt ver. Kod veya tablo gerekiyorsa markdown kod blokları kullan.`,
    modes: { quick_action: "goal_plan", goal_planning_mode: true },
  },
  {
    id: "productivity",
    label: "Üretkenlik Sistemi Kur",
    prompt: `Kişiselleştirilmiş bir üretkenlik sistemi kurmak istiyorum.

Sohbet tarzında ilerle:
1. Önce kısa sorular sor — uyku düzeni, en verimli saatler, günlük odak süresi, dikkat dağınıklığı kaynakları.
2. Cevaplarıma göre Pomodoro, zaman bloklama veya Eisenhower gibi uygun teknikleri öner.
3. Sonunda haftalık programımı anlaşılır bir tablo ve günlük rutinlerle özetle.
4. Planı adım adım açıkla; form doldurmak yerine sohbet ederek ilerle.

Türkçe yanıt ver. Tabloları markdown ile göster.`,
    modes: { quick_action: "productivity" },
  },
  {
    id: "startup",
    label: "Startup Yol Haritası",
    prompt: `Bir startup fikri için uçtan uca yol haritası çıkarmak istiyorum.

Lütfen şunları yap:
1. Fikir, hedef kitle ve problem tanımını netleştirmek için sorular sor.
2. MVP, pazarlama, gelir modeli ve 90 günlük aksiyon planı sun.
3. Sunum gerekiyorsa create_presentation aracıyla slayt başlıkları ve içerik taslağı oluştur.

Türkçe yanıt ver. Teknik mimari önerilerinde kod blokları kullan.`,
    modes: { quick_action: "startup" },
  },
  {
    id: "decision",
    label: "Karar Analizi",
    prompt: `Önemli bir karar vermem gerekiyor ve objektif bir analiz istiyorum.

Lütfen şunları yap:
1. Kararı netleştirmek için bağlam soruları sor (seçenekler, kısıtlar, zaman çerçevesi).
2. Artı/eksi matrisi, risk analizi ve önerilen karar çerçevesi sun.
3. Karar sonrası aksiyon adımları ve takvim hatırlatıcısı gerekiyorsa add_calendar_event kullan.

Türkçe yanıt ver. Analiz tablolarını markdown ile düzenle.`,
    modes: { quick_action: "decision" },
  },
];

export function getQuickAction(idOrLabel) {
  return (
    QUICK_ACTIONS.find(
      (a) => a.id === idOrLabel || a.label === idOrLabel || a.prompt === idOrLabel
    ) || null
  );
}

export function getQuickActionByLabel(label) {
  return QUICK_ACTIONS.find((a) => a.label === label) || null;
}
