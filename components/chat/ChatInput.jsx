"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

function MicIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

const MENU_ITEMS = [
  { id: "file", icon: "📄", label: "Dosya / Belge Ekle" },
  { id: "waffle", icon: "🎨", label: "Waffle Studio (Görsel Üret)" },
  { id: "target", icon: "🎯", label: "Hızlı Hedef Oluştur" },
  { id: "productivity", icon: "⚡", label: "Üretkenlik Sistemini Değiştir" },
  { id: "learning", icon: "📚", label: "Öğrenme Rehberi" },
  { id: "canvas", icon: "📝", label: "Canvas (Split Screen)" },
  { id: "music", icon: "🎵", label: "Müzik Üret" },
];

export default function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  centered = false,
  isMobile = false,
  minimal = false,
  onVoiceToggle,
  isRecording = false,
  voiceMode = "stt",
  interimText = "",
  onSelectView,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  /* ── Menü dışına tıklama kapatıcı ── */
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [menuOpen]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [value]);

  /* ── Menü aksiyonları ── */
  const handleMenuAction = useCallback((id) => {
    setMenuOpen(false);
    if (id === "file") {
      fileInputRef.current?.click();
    } else if (id === "waffle") {
      onSelectView?.("chat", "waffle");
    } else if (id === "target") {
      onSelectView?.("chat", "targets");
    } else if (id === "productivity") {
      onSelectView?.("chat", "productivity");
    } else if (id === "learning") {
      onSelectView?.("learning-guide");
    } else if (id === "canvas") {
      onSelectView?.("canvas");
    } else if (id === "music") {
      onSelectView?.("music");
    }
  }, [onSelectView]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remaining = 10 - attachments.length;
    if (remaining <= 0) {
      alert("En fazla 10 dosya ekleyebilirsin.");
      e.target.value = "";
      return;
    }
    const selected = files.slice(0, remaining);
    if (files.length > remaining) {
      alert(`En fazla 10 dosya ekleyebilirsin. İlk ${remaining} dosya eklendi, ${files.length - remaining} dosya atlandı.`);
    }
    const newAttachments = await Promise.all(
      selected.map(
        (file) =>
          new Promise((resolve) => {
            const { type, name } = file;
            const extension = name.split(".").pop().toUpperCase();
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve({
                id: Math.random().toString(36).substr(2, 9),
                file,
                name,
                extension,
                preview: type.startsWith("image/") ? event.target.result : null,
                type,
              });
            };
            if (type.startsWith("image/")) reader.readAsDataURL(file);
            else
              resolve({
                id: Math.random().toString(36).substr(2, 9),
                file,
                name,
                extension,
                preview: null,
                type,
              });
          })
      )
    );
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!value.trim() && attachments.length === 0) || isLoading) return;
    onSend(value.trim(), attachments);
    onChange("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const isReady = (value.trim() || attachments.length > 0) && !isLoading;

  const getFileIcon = (ext) => {
    switch (ext) {
      case "PPTX": case "PPT": return { bg: "#c0392b", icon: "📊" };
      case "DOCX": case "DOC": return { bg: "#2980b9", icon: "📝" };
      case "XLSX": case "XLS": return { bg: "#27ae60", icon: "📈" };
      case "PDF": return { bg: "#e67e22", icon: "📕" };
      case "MP4": case "WEBM": case "MOV": case "AVI": return { bg: "#6b21a8", icon: "🎬" };
      default: return { bg: "#7f8c8d", icon: "📁" };
    }
  };

  const btnSize = isMobile ? "h-[40px] w-[40px]" : "h-[40px] w-[40px]";

  return (
    <div
      className={centered ? "w-full" : "shrink-0 px-3 pb-4 pt-0 sm:px-4 sm:pb-5 md:px-6"}
      style={centered ? undefined : { paddingBottom: "calc(1rem + var(--safe-bottom, 0px))" }}
    >
      {attachments.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto">
          {attachments.map((at) => (
            <div key={at.id} className="relative flex h-16 w-[90px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border"
              style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)" }}
            >
              <button type="button" onClick={() => removeAttachment(at.id)}
                className="absolute right-0.5 top-0.5 z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full border-none bg-black/70 text-[10px] text-white">×</button>
              {at.preview ? (
                <img src={at.preview} alt={at.name} className="h-full w-full object-cover" />
              ) : (
                <>
                  <div className="flex h-7 w-7 items-center justify-center rounded-md text-sm" style={{ background: getFileIcon(at.extension).bg }}>
                    {getFileIcon(at.extension).icon}
                  </div>
                  <div className="mt-0.5 w-[85%] truncate text-center text-[9px]" style={{ color: "var(--text-muted)" }}>{at.name}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={`han-input-box ${focused ? "ring-1 ring-violet-500/20" : ""}`}>
        {/* ── Artı / Menü Tetikleyici ── */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((p) => !p)}
            className={`${btnSize} flex items-center justify-center rounded-full border transition-all duration-200 ${
              menuOpen
                ? "border-violet-500/40 bg-violet-600/20 text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                : "hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-400"
            }`}
            style={!menuOpen ? { borderColor: "var(--border-subtle)", background: "var(--bg-elevated)", color: "var(--text-muted)" } : undefined}
            title="Özellikler"
            aria-label="Özellikler menüsü"
          >
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-300 ${menuOpen ? "rotate-45" : ""}`}
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* ── Dropdown Menü ── */}
          {menuOpen && (
            <div
              className="absolute bottom-full left-0 mb-2 z-50 w-64 origin-bottom-left animate-scale-in rounded-2xl border border-purple-500/25 p-2 shadow-2xl backdrop-blur-2xl"
              style={{ background: "rgba(15, 15, 30, 0.92)" }}
            >
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMenuAction(item.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs text-white/70 transition-all hover:bg-violet-600/15 hover:text-white"
                >
                  <span className="text-base shrink-0">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange}
          accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,video/mp4,video/webm,video/quicktime,video/x-msvideo" />

        <textarea ref={textareaRef} value={value} onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={centered ? "Mesajını yaz veya dosya ekle..." : "Mesaj yaz..."}
          disabled={isLoading} rows={1}
          className="max-h-40 min-h-[24px] flex-1 resize-none border-none bg-transparent px-1 py-2.5 text-sm font-normal tracking-tight outline-none md:text-[15px]"
          style={{ color: "var(--text-primary)", caretColor: "#7c3aed" }}
        />

        {onVoiceToggle && voiceMode === "stt" && (
          <button type="button" onClick={onVoiceToggle}
            className={`${btnSize} flex shrink-0 items-center justify-center rounded-full border transition-all ${
              isRecording
                ? "border-red-400/40 bg-red-500/15 text-red-500 shadow-[0_0_16px_rgba(239,68,68,0.2)] animate-pulse"
                : "hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-500"
            }`}
            style={!isRecording ? { borderColor: "var(--border-subtle)", background: "var(--bg-elevated)", color: "var(--text-muted)" } : undefined}
            title={isRecording ? "Dinlemeyi durdur" : "Sesli yaz — konuşmayı metne çevir"}
            aria-label="Sesli yaz"
          >
            <MicIcon active={isRecording} />
          </button>
        )}

        <button type="button" onClick={handleSend} disabled={!isReady}
          className={`${btnSize} flex shrink-0 items-center justify-center rounded-full border-none transition-all duration-200 ${
            isReady
              ? "bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md hover:scale-105 hover:shadow-lg"
              : "cursor-not-allowed opacity-40"
          }`}
          style={!isReady ? { background: "var(--bg-hover)" } : undefined}
        >
          {isLoading ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={isReady ? "white" : "var(--text-muted)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          )}
        </button>
      </div>

      {isRecording && interimText && (
        <p className="mt-1.5 px-2 text-xs italic" style={{ color: "var(--text-muted)" }}>
          Dinleniyor: &ldquo;{interimText}&rdquo;
        </p>
      )}

      {!isMobile && !centered && !minimal && (
        <div className="mt-2 text-center text-[10px]" style={{ color: "var(--text-muted)" }}>
          HAN AI hata yapabilir. Kişisel verilerini paylaşmaktan kaçın.
        </div>
      )}
    </div>
  );
}
