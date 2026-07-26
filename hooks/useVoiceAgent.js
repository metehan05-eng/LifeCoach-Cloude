"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Deepgram Voice Agent WebSocket hook
 * Tek dokunuşla aç/kapat, barge-in, gerçek zamanlı konuşma
 */
export function useVoiceAgent({ onEmotionChange } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState([]);

  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const gainRef = useRef(null);
  const isActiveRef = useRef(false);

  const addMessage = useCallback((role, text) => {
    setMessages(prev => [...prev, { role, text, id: Date.now() }]);
  }, []);

  const stopAudio = useCallback(() => {
    if (gainRef.current) {
      try {
        gainRef.current.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.05);
      } catch {}
      setTimeout(() => {
        try { audioCtxRef.current?.close(); } catch {}
        audioCtxRef.current = null;
        gainRef.current = null;
        sourceRef.current = null;
      }, 100);
    }
  }, []);

  const disconnect = useCallback(() => {
    isActiveRef.current = false;
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    setTranscript("");
    onEmotionChange?.("idle");

    if (processorRef.current) { try { processorRef.current.disconnect(); } catch {} processorRef.current = null; }
    if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch {} sourceRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.close();
    wsRef.current = null;
    stopAudio();
  }, [stopAudio, onEmotionChange]);

  const startMicStream = useCallback((ws) => {
    navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true } })
      .then(stream => {
        if (!isActiveRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        setIsListening(true);

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;

        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN || !isActiveRef.current) return;
          const input = e.inputBuffer.getChannelData(0);
          const pcm = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            pcm[i] = Math.max(-1, Math.min(1, input[i])) * 0x7FFF;
          }
          ws.send(pcm.buffer);
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
      })
      .catch(err => {
        console.warn("[VoiceAgent Mic] Error:", err.message);
        if (isActiveRef.current) disconnect();
      });
  }, [disconnect]);

  const playAudioBuffer = useCallback((buffer) => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      audioCtxRef.current = ctx;

      const pcm = new Int16Array(buffer);
      const float32 = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) float32[i] = pcm[i] / 0x7FFF;

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gain = ctx.createGain();
      gain.gain.value = 1;
      gainRef.current = gain;

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch (err) {
      console.warn("[VoiceAgent Audio] Error:", err.message);
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      onEmotionChange?.("listening");
      setTranscript("");

      const configRes = await fetch("/api/sifu-panda/start-agent", { method: "POST" });
      if (!configRes.ok) throw new Error("Agent config failed");
      const { wsUrl, settings, token } = await configRes.json();

      const ws = new WebSocket(wsUrl, ["token", token]);
      wsRef.current = ws;
      isActiveRef.current = true;

      ws.onopen = () => {
        if (!isActiveRef.current) { ws.close(); return; }
        setIsConnected(true);
        ws.send(JSON.stringify({ type: "Settings", ...settings }));
      };

      ws.onmessage = (event) => {
        if (!isActiveRef.current) return;

        if (typeof event.data === "string") {
          try {
            const msg = JSON.parse(event.data);
            switch (msg.type) {
              case "SettingsApplied":
                startMicStream(ws);
                break;
              case "ConversationText":
                if (msg.role === "user") setTranscript(msg.text);
                else if (msg.role === "assistant") {
                  addMessage("assistant", msg.text);
                  setTranscript("");
                }
                break;
              case "UserStartedSpeaking":
                setIsSpeaking(false);
                setIsListening(true);
                onEmotionChange?.("listening");
                stopAudio();
                break;
              case "AgentStartedSpeaking":
                setIsSpeaking(true);
                setIsListening(false);
                setTranscript("");
                onEmotionChange?.("speaking");
                break;
              case "AgentFinishedSpeaking":
                setIsSpeaking(false);
                setIsListening(true);
                onEmotionChange?.("idle");
                break;
            }
          } catch {}
        } else if (event.data instanceof Blob) {
          event.data.arrayBuffer().then(buf => {
            if (isActiveRef.current) playAudioBuffer(buf);
          });
        }
      };

      ws.onerror = (ev) => {
        if (!isActiveRef.current) return;
        console.error("[VoiceAgent] WebSocket error:", ev);
        onEmotionChange?.("idle");
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        setTranscript("");
        onEmotionChange?.("idle");
        stopAudio();
      };

    } catch (err) {
      console.error("[VoiceAgent] Error:", err);
      onEmotionChange?.("idle");
    }
  }, [startMicStream, stopAudio, playAudioBuffer, addMessage, onEmotionChange]);

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
    isSpeaking,
    transcript,
    messages,
    toggleConnection,
    disconnect,
  };
}
