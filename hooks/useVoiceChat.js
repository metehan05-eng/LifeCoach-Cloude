"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getVoiceService, VoiceService } from "@/lib/voice/voice-service";
import { detectEmotionFromUserInput } from "@/lib/voice/sifu-emotion";

const SILENCE_TIMEOUT = 1800; // ms of silence before auto-stop
const VAD_THRESHOLD = 0.02;  // RMS threshold for silence

export function useVoiceChat({ onTranscript, onEmotionChange, onAudio, isMobile = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [interimText, setInterimText] = useState("");

  const voiceRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingStartRef = useRef(0);
  const vadTimerRef = useRef(null);
  const vadStreamRef = useRef(null);
  const vadContextRef = useRef(null);
  const silenceStartRef = useRef(0);
  const isAutoStoppingRef = useRef(false);

  // Try to use external TTS (Google/Edge/ElevenLabs) if configured
  useEffect(() => {
    const checkTTSProvider = async () => {
      try {
        const res = await fetch('/api/tts', { method: 'HEAD' });
        const provider = res.ok ? 'external' : 'web-speech';
        voiceRef.current = getVoiceService({ lang: "tr-TR", provider });
      } catch {
        voiceRef.current = getVoiceService({ lang: "tr-TR" });
      }
    };
    checkTTSProvider();
    return () => voiceRef.current?.stopSpeaking();
  }, []);

  // VAD: Monitor audio levels via Web Audio API
  const startVAD = (stream) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      vadContextRef.current = audioCtx;
      vadStreamRef.current = analyser;
      silenceStartRef.current = 0;

      const checkLevel = () => {
        if (!vadStreamRef.current || isAutoStoppingRef.current) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(dataArray);

        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const value = (dataArray[i] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        if (rms < VAD_THRESHOLD) {
          if (silenceStartRef.current === 0) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > SILENCE_TIMEOUT) {
            // Auto-stop on sustained silence
            isAutoStoppingRef.current = true;
            stopRecording();
            return;
          }
        } else {
          silenceStartRef.current = 0;
        }

        if (mediaRecorderRef.current?.state === 'recording') {
          requestAnimationFrame(checkLevel);
        }
      };

      requestAnimationFrame(checkLevel);
    } catch (e) {
      console.warn('[VAD] Not available:', e.message);
    }
  };

  const stopVAD = () => {
    if (vadContextRef.current) {
      vadContextRef.current.close();
      vadContextRef.current = null;
    }
    vadStreamRef.current = null;
    silenceStartRef.current = 0;
    isAutoStoppingRef.current = false;
  };

  const startRecording = useCallback(() => {
    const voice = voiceRef.current;
    if (!voice) return;

    voice.stopSpeaking();
    setIsSpeaking(false);
    setInterimText("");
    setIsRecording(true);
    onEmotionChange?.("listening");
    if (isMobile) setVoiceOverlayOpen(true);

    audioChunksRef.current = [];
    recordingStartRef.current = Date.now();

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        const recorder = new MediaRecorder(stream, { mimeType });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          stopVAD();
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            onAudio?.(base64, Math.round((Date.now() - recordingStartRef.current) / 1000));
          };
          reader.readAsDataURL(blob);
          audioChunksRef.current = [];
        };

        recorder.onerror = () => {
          stopVAD();
          stream.getTracks().forEach(t => t.stop());
          setIsRecording(false);
          setVoiceOverlayOpen(false);
          onEmotionChange?.("idle");
        };

        mediaRecorderRef.current = recorder;
        recorder.start();

        // Start VAD for auto-stop on silence
        startVAD(stream);
      })
      .catch(() => {
        setIsRecording(false);
        onEmotionChange?.("idle");
      });
  }, [onTranscript, onEmotionChange, isMobile, onAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    stopVAD();
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
