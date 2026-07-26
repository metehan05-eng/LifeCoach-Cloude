"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export function useVoiceAgent({ onEmotionChange } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState([]);

  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const micCtxRef = useRef(null);
  const processorRef = useRef(null);
  const micSourceRef = useRef(null);
  const isActiveRef = useRef(false);
  const nextAudioTimeRef = useRef(0);
  const stopAudioRef = useRef(false);

  const addMessage = useCallback((role, text) => {
    setMessages(prev => [...prev, { role, text, id: Date.now() }]);
  }, []);

  const stopAudio = useCallback(() => {
    stopAudioRef.current = true;
  }, []);

  const resumePlayback = useCallback(() => {
    stopAudioRef.current = false;
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
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
    if (micSourceRef.current) { try { micSourceRef.current.disconnect(); } catch {} micSourceRef.current = null; }
    if (micCtxRef.current) { try { micCtxRef.current.close(); } catch {} micCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.close();
    wsRef.current = null;
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    nextAudioTimeRef.current = 0;
    stopAudioRef.current = true;
  }, [onEmotionChange]);

  const getPlaybackCtx = useCallback(() => {
    let ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'closed') {
      ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      audioCtxRef.current = ctx;
      nextAudioTimeRef.current = 0;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }, []);

  const playAudioBuffer = useCallback(async (buffer) => {
    try {
      // Ensure audio playback is unblocked when receiving audio chunks
      stopAudioRef.current = false;
      const ctx = getPlaybackCtx();
      if (ctx.state === 'suspended') await ctx.resume();

      // Ensure byte length is even to prevent Int16Array RangeError
      const byteLen = buffer.byteLength;
      const alignedLen = byteLen - (byteLen % 2);
      if (alignedLen === 0) return;

      const pcm = new Int16Array(buffer, 0, alignedLen / 2);
      if (pcm.length === 0) return;
      const float32 = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) float32[i] = pcm[i] / 0x7FFF;

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextAudioTimeRef.current);
      source.start(startTime);
      nextAudioTimeRef.current = startTime + audioBuffer.duration;
    } catch (err) {
      console.warn("[VoiceAgent Audio] Error:", err.message);
    }
  }, [getPlaybackCtx]);

  const startMicStream = useCallback((ws) => {
    navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true } })
      .then(stream => {
        if (!isActiveRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        setIsListening(true);

        const micCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        micCtxRef.current = micCtx;

        const source = micCtx.createMediaStreamSource(stream);
        micSourceRef.current = source;

        const processor = micCtx.createScriptProcessor(4096, 1, 1);
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
      })
      .catch(err => {
        console.warn("[VoiceAgent Mic] Error:", err.message);
        if (isActiveRef.current) disconnect();
      });
  }, [disconnect]);

  const connect = useCallback(async () => {
    try {
      onEmotionChange?.("listening");
      setTranscript("");
      const ctx = getPlaybackCtx();
      console.log("[VoiceAgent] AudioCtx state:", ctx.state, "sampleRate:", ctx.sampleRate);
      // Test beep
      try {
        const osc = ctx.createOscillator();
        const testGain = ctx.createGain();
        testGain.gain.value = 0.3;
        osc.frequency.value = 800;
        osc.connect(testGain);
        testGain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } catch (e) {
        console.warn("[VoiceAgent] Beep error:", e);
      }

      const configRes = await fetch("/api/sifu-panda/start-agent", { method: "POST" });
      if (!configRes.ok) throw new Error("Agent config failed");
      const { wsUrl, settings, token } = await configRes.json();

      const ws = new WebSocket(wsUrl, ["token", token]);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;
      isActiveRef.current = true;
      stopAudioRef.current = false;

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
              case "ConversationText": {
                const ct = msg.content ?? msg.text ?? '';
                if (msg.role === "user") setTranscript(ct);
                else if (msg.role === "assistant") {
                  addMessage("assistant", ct);
                  setTranscript("");
                }
                break;
              }
              case "UserStartedSpeaking":
                setIsSpeaking(false);
                setIsListening(true);
                onEmotionChange?.("listening");
                stopAudio();
                break;
              case "AgentStartedSpeaking":
                stopAudioRef.current = false;
                nextAudioTimeRef.current = 0;
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
        } else if (event.data instanceof ArrayBuffer) {
          if (event.data.byteLength > 0) {
            playAudioBuffer(event.data);
          }
        } else if (event.data instanceof Blob) {
          if (event.data.size > 0) {
            event.data.arrayBuffer().then(buf => {
              if (isActiveRef.current) {
                playAudioBuffer(buf);
              }
            });
          }
        } else {
          console.warn("[VoiceAgent] Unknown data type:", typeof event.data, event.data?.constructor?.name);
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
        if (audioCtxRef.current) {
          try { audioCtxRef.current.close(); } catch {}
          audioCtxRef.current = null;
        }
        if (micCtxRef.current) {
          try { micCtxRef.current.close(); } catch {}
          micCtxRef.current = null;
        }
        nextAudioTimeRef.current = 0;
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
