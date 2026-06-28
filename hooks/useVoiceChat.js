"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getVoiceService, VoiceService } from "@/lib/voice/voice-service";
import { detectEmotionFromUserInput } from "@/lib/voice/sifu-emotion";

export function useVoiceChat({ onTranscript, onEmotionChange, isMobile = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [interimText, setInterimText] = useState("");
  const voiceRef = useRef(null);

  useEffect(() => {
    voiceRef.current = getVoiceService({ lang: "tr-TR" });
    return () => voiceRef.current?.stopSpeaking();
  }, []);

  const startRecording = useCallback(() => {
    const voice = voiceRef.current;
    if (!voice) return;

    // Stop any ongoing TTS so the mic doesn't capture Sifu's own voice.
    voice.stopSpeaking();
    setIsSpeaking(false);

    setInterimText("");
    setIsRecording(true);
    onEmotionChange?.("thoughtful");
    if (isMobile) setVoiceOverlayOpen(true);

    voice.startListening({
      onStart: () => setIsRecording(true),
      onEnd: () => {
        setIsRecording(false);
        if (!isSpeaking) onEmotionChange?.("idle");
      },
      onResult: ({ interim, final, combined }) => {
        setInterimText(combined);
        if (final) {
          onEmotionChange?.(detectEmotionFromUserInput(final));
          onTranscript?.(final.trim());
          setInterimText("");
        }
      },
      onError: () => {
        setIsRecording(false);
        setVoiceOverlayOpen(false);
        onEmotionChange?.("idle");
      },
    });
  }, [onTranscript, onEmotionChange, isMobile, isSpeaking]);

  const stopRecording = useCallback(() => {
    voiceRef.current?.stopListening();
    setIsRecording(false);
    setVoiceOverlayOpen(false);
    if (!isSpeaking) onEmotionChange?.("idle");
  }, [onEmotionChange, isSpeaking]);

  const speakResponse = useCallback(
    (text, { autoPlay = true } = {}) => {
      if (!autoPlay || !voiceEnabled) return;
      const voice = voiceRef.current;
      if (!voice) return;

      const clean = text.replace(/```[\s\S]*?```/g, "").replace(/\[.*?\]/g, "").slice(0, 500);
      if (!clean.trim()) return;

      voice.speak(clean, {
        onStart: () => {
          setIsSpeaking(true);
          onEmotionChange?.("speaking");
        },
        onEnd: () => {
          setIsSpeaking(false);
          onEmotionChange?.("idle");
        },
        onError: () => {
          setIsSpeaking(false);
          onEmotionChange?.("idle");
        },
      });
    },
    [voiceEnabled, onEmotionChange]
  );

  const stopSpeaking = useCallback(() => {
    voiceRef.current?.stopSpeaking();
    setIsSpeaking(false);
    onEmotionChange?.("idle");
  }, [onEmotionChange]);

  const toggleVoiceMode = useCallback(() => {
    setVoiceEnabled((v) => !v);
  }, []);

  return {
    isRecording,
    isSpeaking,
    voiceOverlayOpen,
    voiceEnabled,
    interimText,
    startRecording,
    stopRecording,
    speakResponse,
    stopSpeaking,
    toggleVoiceMode,
    setVoiceOverlayOpen,
    isVoiceSupported: typeof window !== "undefined" && VoiceService.isSupported(),
  };
}
