"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import SifuPanda from "@/components/mascot/SifuPanda";

export default function SifuPandaPage() {
  const [emotion, setEmotion] = useState("idle");
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [transcript, setTranscript] = useState("");

  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const gainRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isActiveRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (role, text) => {
    setMessages(prev => [...prev, { role, text, id: Date.now() }]);
  };

  const stopAudio = useCallback(() => {
    if (gainRef.current) {
      gainRef.current.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.05);
      setTimeout(() => {
        if (audioCtxRef.current?.state !== 'closed') {
          audioCtxRef.current.close();
        }
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
    setEmotion("idle");

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    stopAudio();
  }, [stopAudio]);

  const startAgent = useCallback(async () => {
    try {
      setEmotion("listening");
      setTranscript("");

      const configRes = await fetch("/api/sifu-panda/start-agent", { method: "POST" });
      if (!configRes.ok) throw new Error("Agent config failed");
      const { wsUrl, settings } = await configRes.json();

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      isActiveRef.current = true;

      ws.onopen = () => {
        if (!isActiveRef.current) { ws.close(); return; }
        setIsConnected(true);
        ws.send(JSON.stringify({ type: "Settings", ...settings }));
      };

      ws.onmessage = async (event) => {
        if (!isActiveRef.current) return;

        if (typeof event.data === "string") {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case "SettingsApplied":
              setIsConnected(true);
              startMicStream(ws);
              break;

            case "ConversationText":
              if (msg.role === "user") {
                setTranscript(msg.text);
              } else if (msg.role === "assistant") {
                addMessage("assistant", msg.text);
                setTranscript("");
              }
              break;

            case "UserStartedSpeaking":
              setIsSpeaking(false);
              setEmotion("listening");
              stopAudio();
              break;

            case "AgentStartedSpeaking":
              setIsSpeaking(true);
              setEmotion("speaking");
              break;

            case "AgentFinishedSpeaking":
              setIsSpeaking(false);
              setEmotion("idle");
              break;
          }
        }
      };

      ws.onerror = () => {
        if (!isActiveRef.current) return;
        setEmotion("idle");
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        setEmotion("idle");
        stopAudio();
      };

    } catch (err) {
      console.error("[Voice Agent] Error:", err);
      setEmotion("idle");
      setIsConnected(false);
    }
  }, [stopAudio]);

  function startMicStream(ws) {
    navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true } })
      .then(stream => {
        if (!isActiveRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        setIsListening(true);

        const audioCtx = new AudioContext({ sampleRate: 16000 });
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

        // Listen for audio output
        ws.addEventListener('message', (event) => {
          if (event.data instanceof Blob) {
            event.data.arrayBuffer().then(buffer => {
              if (!isActiveRef.current) return;
              playAudioBuffer(buffer);
            });
          }
        });

      })
      .catch(err => {
        console.error("[Mic] Error:", err);
        if (isActiveRef.current) disconnect();
      });
  }

  function playAudioBuffer(buffer) {
    try {
      const ctx = audioCtxRef.current || new AudioContext({ sampleRate: 24000 });
      audioCtxRef.current = ctx;

      const pcm = new Int16Array(buffer);
      const float32 = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) {
        float32[i] = pcm[i] / 0x7FFF;
      }

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
      sourceRef.current = source;
    } catch (err) {
      console.warn("[Playback] Error:", err);
    }
  }

  const toggleConversation = useCallback(() => {
    if (isConnected) {
      disconnect();
    } else {
      startAgent();
    }
  }, [isConnected, startAgent, disconnect]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#0a0a14] via-[#0f0f1e] to-[#0a0a14] text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(120,80,255,0.06)_0%,_transparent_70%)]" />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-lg px-4">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-lg font-bold tracking-widest text-violet-400/70 uppercase">
            Sifu Panda
          </h1>
          <p className="text-xs text-white/30 mt-1">Your wise voice companion</p>
        </div>

        {/* Panda Avatar */}
        <div className="relative">
          <div className={`absolute inset-0 rounded-full transition-all duration-700 ${
            isListening ? "bg-red-500/10 scale-150 blur-2xl animate-pulse" :
            isSpeaking ? "bg-violet-500/10 scale-125 blur-2xl" :
            "bg-transparent"
          }`} />
          <div className={`transition-all duration-300 ${
            isListening ? "scale-105" : "scale-100"
          }`}>
            <SifuPanda
              emotion={emotion}
              size={180}
              isSpeaking={isSpeaking}
              isListening={isListening}
            />
          </div>
        </div>

        {/* Status */}
        <p className={`text-sm transition-all duration-300 ${
          isListening ? "text-red-300" :
          isSpeaking ? "text-violet-300" :
          "text-white/40"
        }`}>
          {isListening ? (transcript || "Listening...") :
           isSpeaking ? "Sifu Panda is speaking..." :
           isConnected ? "Connected" :
           "Tap the mic to start"}
        </p>

        {/* Mic Button */}
        <button
          onClick={toggleConversation}
          className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 ${
            isConnected
              ? "bg-red-500/20 border-red-400/40 scale-110 shadow-[0_0_40px_rgba(239,68,68,0.25)]"
              : "bg-violet-500/10 border-violet-400/20 hover:bg-violet-500/20 hover:border-violet-400/40"
          } border`}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-colors ${
              isConnected ? "text-red-300" : "text-violet-300"
            }`}
          >
            {isConnected ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </>
            )}
          </svg>
        </button>

        {/* Conversation */}
        {messages.length > 0 && (
          <div className="w-full mt-4 max-h-60 overflow-y-auto space-y-3 px-2 scrollbar-thin scrollbar-thumb-white/10">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-violet-500/15 text-violet-200 border border-violet-400/10"
                      : "bg-white/5 text-white/80 border border-white/10"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Reset button */}
        {messages.length > 0 && !isConnected && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-white/20 hover:text-white/50 transition-colors mt-2"
          >
            Clear conversation
          </button>
        )}
      </div>
    </main>
  );
}
