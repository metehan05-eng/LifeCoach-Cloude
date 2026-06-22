"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getVoiceService, VoiceService } from "@/lib/voice/voice-service";

/**
 * Chat input için yalnızca konuşmayı metne çevirir (STT).
 * Sifu Panda'nın tam sesli sohbet akışından ayrıdır.
 */
export function useSpeechToText({ onTranscript } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const voiceRef = useRef(null);

  useEffect(() => {
    voiceRef.current = getVoiceService({ lang: "tr-TR" });
  }, []);

  const startListening = useCallback(() => {
    const voice = voiceRef.current;
    if (!voice) return;

    setInterimText("");
    setIsListening(true);

    voice.startListening({
      onStart: () => setIsListening(true),
      onEnd: () => {
        setIsListening(false);
        setInterimText("");
      },
      onResult: ({ interim, final, combined }) => {
        setInterimText(combined);
        if (final?.trim()) {
          onTranscript?.(final.trim());
          setInterimText("");
        }
      },
      onError: () => {
        setIsListening(false);
        setInterimText("");
      },
    });
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    voiceRef.current?.stopListening();
    setIsListening(false);
    setInterimText("");
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    interimText,
    startListening,
    stopListening,
    toggleListening,
    isSupported:
      typeof window !== "undefined" && VoiceService.isSupported(),
  };
}
