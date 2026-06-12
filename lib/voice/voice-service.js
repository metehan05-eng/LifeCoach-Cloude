/**
 * Voice Service — STT/TTS abstraction
 * Varsayılan: Web Speech API (tarayıcı native)
 */

const DEFAULT_LANG = "tr-TR";

export class VoiceService {
  constructor(options = {}) {
    this.lang = options.lang || DEFAULT_LANG;
    this.rate = options.rate ?? 1.05;
    this.pitch = options.pitch ?? 0.75;
    this.provider = options.provider || "web-speech";
    this._recognition = null;
    this._utterance = null;
    this._voicesLoaded = false;
    this._pendingVoices = [];
    this._callbacks = {};
    this._initVoices();
  }

  _initVoices() {
    if (typeof window === "undefined") return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      this._voicesLoaded = true;
      this._pendingVoices.forEach(fn => fn(voices));
      this._pendingVoices = [];
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        this._voicesLoaded = true;
        const v = window.speechSynthesis.getVoices();
        this._pendingVoices.forEach(fn => fn(v));
        this._pendingVoices = [];
      };
    }
  }

  _getVoices() {
    return new Promise((resolve) => {
      const voices = typeof window !== "undefined" ? window.speechSynthesis.getVoices() : [];
      if (voices.length > 0) {
        resolve(voices);
      } else {
        this._pendingVoices.push(resolve);
        if (!this._voicesLoaded) {
          window.speechSynthesis.onvoiceschanged = () => {
            this._voicesLoaded = true;
            const v = window.speechSynthesis.getVoices();
            this._pendingVoices.forEach(fn => fn(v));
            this._pendingVoices = [];
          };
        }
      }
    });
  }

  static isSupported() {
    if (typeof window === "undefined") return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  static isTTSSupported() {
    if (typeof window === "undefined") return false;
    return !!window.speechSynthesis;
  }

  _getRecognition() {
    if (typeof window === "undefined") return null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    if (!this._recognition) {
      this._recognition = new SR();
      this._recognition.lang = this.lang;
      this._recognition.interimResults = true;
      this._recognition.continuous = false;
      this._recognition.maxAlternatives = 1;
    }
    return this._recognition;
  }

  startListening({ onResult, onError, onStart, onEnd } = {}) {
    const recognition = this._getRecognition();
    if (!recognition) {
      onError?.({ error: "not-supported", message: "Tarayıcı ses tanıma desteklemiyor." });
      return false;
    }

    recognition.onstart = () => onStart?.();
    recognition.onend = () => onEnd?.();
    recognition.onerror = (e) => onError?.(e);

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      onResult?.({ interim, final, combined: final || interim });
    };

    try {
      if (recognition.isRunning) recognition.stop();
      recognition.start();
      recognition.isRunning = true;
      return true;
    } catch (err) {
      onError?.(err);
      return false;
    }
  }

  stopListening() {
    try {
      if (this._recognition) {
        this._recognition.isRunning = false;
        this._recognition.stop();
      }
    } catch {
      /* already stopped */
    }
  }

  _pickPandaVoice(voices) {
    const langs = ["tr-TR", "tr"];

    const maleVoices = voices.filter(v =>
      langs.some(l => v.lang.startsWith(l)) &&
      /male|erke|david|alex|mark|tom|james|john/i.test(v.name)
    );

    if (maleVoices.length > 0) return maleVoices[0];

    const trVoices = voices.filter(v => langs.some(l => v.lang.startsWith(l)));
    if (trVoices.length > 0) return trVoices[0];

    const enMaleVoices = voices.filter(v =>
      v.lang.startsWith("en") &&
      /male|david|alex|mark|tom|james|john/i.test(v.name)
    );
    if (enMaleVoices.length > 0) return enMaleVoices[0];

    return voices.find(v => v.lang.startsWith("en")) || voices[0] || null;
  }

  async speak(text, { onStart, onEnd, onError, lang } = {}) {
    if (!text?.trim()) return false;

    if (this.provider !== "web-speech") {
      return this._speakExternal(text, { onStart, onEnd, onError, lang });
    }

    if (!VoiceService.isTTSSupported()) {
      onError?.({ error: "not-supported" });
      return false;
    }

    window.speechSynthesis.cancel();

    const voices = await this._getVoices();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = lang || this.lang;
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    const voice = this._pickPandaVoice(voices);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = (e) => onError?.(e);

    this._utterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  stopSpeaking() {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
  }

  async _speakExternal(text, callbacks) {
    try {
      const res = await fetch("/api/voice?action=synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: this.lang }),
      });
      if (!res.ok) throw new Error("TTS API failed");
      callbacks.onStart?.();
      callbacks.onEnd?.();
      return true;
    } catch (err) {
      callbacks.onError?.(err);
      return this.speak(text, { ...callbacks, provider: "web-speech" });
    }
  }
}

let _instance = null;

export function getVoiceService(options) {
  if (typeof window === "undefined") return null;
  if (!_instance) _instance = new VoiceService(options);
  return _instance;
}
