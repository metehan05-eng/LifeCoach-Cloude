"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import SifuPanda from "@/components/mascot/SifuPanda";

export default function SifuPandaPage() {
  const [emotion, setEmotion] = useState("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [interimText, setInterimText] = useState("");
  const [statusText, setStatusText] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatHistoryRef = useRef([]);
  const audioContextRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (role, text) => {
    setMessages(prev => [...prev, { role, text, id: Date.now() }]);
  };

  const speakText = useCallback(async (text) => {
    try {
      setIsSpeaking(true);
      setEmotion("speaking");
      setStatusText("Sifu Panda speaking...");

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 500) }),
      });

      if (!res.ok) throw new Error("TTS failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      const audio = new Audio(url);
      await audio.play();

      await new Promise(resolve => {
        audio.onended = resolve;
      });

      URL.revokeObjectURL(url);
      setAudioUrl(null);
    } catch (err) {
      console.warn("[TTS] Error:", err.message);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 0.6;
      await new Promise(resolve => {
        utterance.onend = resolve;
        utterance.onerror = resolve;
        window.speechSynthesis.speak(utterance);
      });
    } finally {
      setIsSpeaking(false);
      setEmotion("idle");
      setStatusText("Tap the mic to speak");
    }
  }, []);

  const processVoiceInput = useCallback(async (audioBlob) => {
    setIsThinking(true);
    setEmotion("thoughtful");
    setStatusText("Listening...");

    try {
      const dgRes = await fetch("/api/sifu-panda/transcribe", {
        method: "POST",
        headers: { "Content-Type": audioBlob.type || "audio/webm" },
        body: audioBlob,
      });

      if (!dgRes.ok) {
        const errText = await dgRes.text();
        throw new Error(errText || "Deepgram failed");
      }

      const { text } = await dgRes.json();
      if (!text || !text.trim()) {
        setStatusText("I didn't catch that. Try again?");
        setIsThinking(false);
        setEmotion("idle");
        return;
      }

      addMessage("user", text);
      setStatusText("Sifu Panda is thinking...");
      setEmotion("thoughtful");

      const aiRes = await fetch("/api/sifu-panda/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          history: chatHistoryRef.current,
        }),
      });

      if (!aiRes.ok) throw new Error("AI chat failed");

      const { reply } = await aiRes.json();
      if (!reply || reply === "...") throw new Error("Empty reply");

      chatHistoryRef.current.push(
        { role: "user", text },
        { role: "assistant", text: reply }
      );

      addMessage("assistant", reply);
      setIsThinking(false);

      await speakText(reply);
    } catch (err) {
      console.error("[Sifu Panda] Error:", err.message);
      setStatusText("Something went wrong. Try again.");
      setEmotion("idle");
      setIsThinking(false);
    }
  }, [speakText]);

  const startRecording = useCallback(async () => {
    try {
      setInterimText("");
      setStatusText("Listening...");
      setEmotion("listening");
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        processVoiceInput(blob);
      };

      recorder.onerror = () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        setEmotion("idle");
        setStatusText("Mic error. Try again.");
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 10000);
    } catch (err) {
      console.error("[Mic] Error:", err.message);
      setStatusText("Microphone access denied.");
      setEmotion("idle");
    }
  }, [processVoiceInput]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#0a0a14] via-[#0f0f1e] to-[#0a0a14] text-white overflow-hidden">
      {/* Ambient background */}
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
            isRecording ? "bg-red-500/10 scale-150 blur-2xl animate-pulse" :
            isSpeaking ? "bg-violet-500/10 scale-125 blur-2xl" :
            "bg-transparent"
          }`} />
          <div className={`transition-all duration-300 ${
            isRecording ? "scale-105" : "scale-100"
          }`}>
            <SifuPanda
              emotion={emotion}
              size={180}
              isSpeaking={isSpeaking}
              isListening={isRecording}
            />
          </div>
        </div>

        {/* Status */}
        <p className={`text-sm transition-all duration-300 ${
          isRecording ? "text-red-300" :
          isSpeaking ? "text-violet-300" :
          isThinking ? "text-amber-300" :
          "text-white/40"
        }`}>
          {isRecording ? "Listening... tap again to stop" :
           isThinking ? "Thinking..." :
           statusText || "Tap the mic to speak"}
        </p>

        {/* Mic Button */}
        <button
          onClick={toggleRecording}
          disabled={isThinking || isSpeaking}
          className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 ${
            isRecording
              ? "bg-red-500/20 border-red-400/40 scale-110 shadow-[0_0_40px_rgba(239,68,68,0.25)]"
              : "bg-violet-500/10 border-violet-400/20 hover:bg-violet-500/20 hover:border-violet-400/40"
          } border disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-colors ${
              isRecording ? "text-red-300" : "text-violet-300"
            }`}
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
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
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([]);
              chatHistoryRef.current = [];
              setStatusText("");
            }}
            className="text-xs text-white/20 hover:text-white/50 transition-colors mt-2"
          >
            Clear conversation
          </button>
        )}
      </div>
    </main>
  );
}
