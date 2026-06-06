/** Sifu Panda duygu durumu — metin/heuristik analizi */

const HAPPY_PATTERNS =
  /tebrik|harika|mükemmel|başard|kutla|süper|bravo|aferin|helal|zafer|level|seviye|🎉|👏|✨/i;

const THOUGHTFUL_PATTERNS =
  /düşün|analiz|karar|strateji|planla|hedef|neden|nasıl|değerlendir|öner/i;

export const SIFU_EMOTIONS = ["idle", "speaking", "happy", "thoughtful"];

export function detectEmotionFromText(text, context = {}) {
  const { isSpeaking, isListening, isTyping, isLoading } = context;

  if (isSpeaking) return "speaking";
  if (isListening || isLoading || isTyping) return "thoughtful";
  if (!text || typeof text !== "string") return "idle";

  if (HAPPY_PATTERNS.test(text)) return "happy";
  if (THOUGHTFUL_PATTERNS.test(text)) return "thoughtful";
  return "idle";
}

export function detectEmotionFromUserInput(text) {
  if (!text) return "thoughtful";
  if (HAPPY_PATTERNS.test(text)) return "happy";
  return "thoughtful";
}
