"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export function useVoiceAgent({ onEmotionChange } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const isActiveRef = useRef(false);
  const isThinkingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const messagesRef = useRef([]);

  messagesRef.current = messages;

  const addMessage = useCallback((role, text) => {
    setMessages(prev => [...prev, { role, text, id: Date.now() }]);
  }, []);

  const stopAudio = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback((text, onEndCallback) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      onEndCallback?.();
      return;
    }

    stopAudio();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 0.85;

    // Pick a natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const googleVoice = voices.find(v => (v.name.includes("Google") || v.name.includes("Natural")) && v.lang.startsWith("en"))
      || voices.find(v => v.lang.startsWith("en"))
      || voices[0];
    if (googleVoice) utterance.voice = googleVoice;

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setIsSpeaking(true);
      setIsListening(false);
      onEmotionChange?.("speaking");
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      onEmotionChange?.("idle");
      onEndCallback?.();
    };

    utterance.onerror = (e) => {
      console.warn("[VoiceAgent TTS] Error:", e);
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      onEmotionChange?.("idle");
      onEndCallback?.();
    };

    window.speechSynthesis.speak(utterance);
  }, [stopAudio, onEmotionChange]);

  const processUserSpeech = useCallback(async (userText) => {
    if (!userText || !userText.trim() || !isActiveRef.current) return;
    const cleanText = userText.trim();

    addMessage("user", cleanText);
    setTranscript("");

    isThinkingRef.current = true;
    setIsThinking(true);
    setIsListening(false);
    onEmotionChange?.("thoughtful");

    try {
      const res = await fetch("/api/sifu-panda/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: cleanText,
          history: messagesRef.current,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Yapay zeka yanıt veremedi (${res.status})`);
      }

      const { reply } = await res.json();
      if (!isActiveRef.current) return;

      addMessage("assistant", reply);
      setIsThinking(false);
      isThinkingRef.current = false;

      // Speak response with Google Speech Synthesis and resume listening after
      speakText(reply, () => {
        if (isActiveRef.current && recognitionRef.current) {
          try {
            setIsListening(true);
            onEmotionChange?.("listening");
            recognitionRef.current.start();
          } catch {}
        }
      });
    } catch (err) {
      console.error("[VoiceAgent AI Error]:", err.message);
      setError(err.message);
      setIsThinking(false);
      isThinkingRef.current = false;
      onEmotionChange?.("idle");
    }
  }, [addMessage, speakText, onEmotionChange]);

  const disconnect = useCallback(() => {
    isActiveRef.current = false;
    stopAudio();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setIsConnected(false);
    setIsListening(false);
    setIsThinking(false);
    setIsSpeaking(false);
    setTranscript("");
    onEmotionChange?.("idle");
  }, [stopAudio, onEmotionChange]);

  const connect = useCallback(() => {
    setError(null);
    if (typeof window === "undefined") return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("Tarayıcınız sesli tanıma özelliğini desteklemiyor (Chrome/Edge önerilir).");
      return;
    }

    try {
      stopAudio();
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        if (!isActiveRef.current) return;
        setIsConnected(true);
        setIsListening(true);
        onEmotionChange?.("listening");
      };

      recognition.onresult = (event) => {
        if (!isActiveRef.current) return;
        let currentText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);

        if (event.results[0]?.isFinal) {
          processUserSpeech(currentText);
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
          // Restart recognition silently if no speech detected
          if (isActiveRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
            try { recognition.start(); } catch {}
          }
          return;
        }
        console.warn("[VoiceAgent STT Error]:", event.error);
        if (isActiveRef.current && event.error !== 'aborted') {
          setError(`Ses tanıma hatası: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // Auto restart listening if still active and not speaking/thinking
        if (isActiveRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
          try { recognition.start(); } catch {}
        }
      };

      recognitionRef.current = recognition;
      isActiveRef.current = true;
      recognition.start();
    } catch (err) {
      console.error("[VoiceAgent Connect Error]:", err);
      setError("Mikrofon başlatılamadı.");
      disconnect();
    }
  }, [stopAudio, processUserSpeech, disconnect, onEmotionChange]);

  const toggleConnection = useCallback(() => {
    if (isConnected) disconnect();
    else connect();
  }, [isConnected, connect, disconnect]);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isListening,
    isThinking,
    isSpeaking,
    transcript,
    messages,
    error,
    toggleConnection,
    disconnect,
  };
}
