/**
 * Hızlı işlem kartları — her kart tıklandığında chat'e gönderilecek prompt ve API modları.
 */

export const QUICK_ACTIONS = [
  {
    id: "goal_plan",
    label: "Hedef Planla",
    prompt: `Benim için SMART hedef çerçevesinde detaylı bir hedef planı oluştur.`,
    modes: { quick_action: "goal_plan", goal_planning_mode: true },
  },
  {
    id: "productivity",
    label: "Üretkenlik Sistemi Kur",
    prompt: `Kişiselleştirilmiş bir üretkenlik sistemi kurmak istiyorum.`,
    modes: { quick_action: "productivity" },
  },
  {
    id: "plugin_store",
    label: "🧩 Plugin Store",
    prompt: "",
    modes: { view: "plugins" },
  },
  {
    id: "startup",
    label: "Startup Yol Haritası",
    prompt: `Bir startup fikri için uçtan uca yol haritası çıkarmak istiyorum.`,
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
