"use client";

import React, { useRef, useEffect, useState } from "react";

export default function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  centered = false,
  isMobile = false,
  minimal = false,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [value]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newAttachments = await Promise.all(
      files.map(
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
      case "PPTX":
      case "PPT":
        return { bg: "#c0392b", icon: "📊" };
      case "DOCX":
      case "DOC":
        return { bg: "#2980b9", icon: "📝" };
      case "XLSX":
      case "XLS":
        return { bg: "#27ae60", icon: "📈" };
      case "PDF":
        return { bg: "#e67e22", icon: "📕" };
      case "MP4":
      case "WEBM":
      case "MOV":
      case "AVI":
        return { bg: "#6b21a8", icon: "🎬" };
      default:
        return { bg: "#7f8c8d", icon: "📁" };
    }
  };

  const btnSize = isMobile ? "h-[34px] w-[34px]" : "h-[38px] w-[38px]";

  return (
    <div className={centered ? "w-full" : "shrink-0 px-4 pb-5 pt-0 md:px-5"}>
      {attachments.length > 0 && (
        <div className="mb-1.5 flex gap-2 overflow-x-auto">
          {attachments.map((at) => (
            <div
              key={at.id}
              className="relative flex h-16 w-[90px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]"
            >
              <button
                type="button"
                onClick={() => removeAttachment(at.id)}
                className="absolute right-0.5 top-0.5 z-10 flex h-[18px] w-[18px] items-center justify-center rounded-full border-none bg-black/70 text-[10px] text-white"
              >
                ×
              </button>
              {at.preview ? (
                <img src={at.preview} alt={at.name} className="h-full w-full object-cover" />
              ) : (
                <>
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md text-sm"
                    style={{ background: getFileIcon(at.extension).bg }}
                  >
                    {getFileIcon(at.extension).icon}
                  </div>
                  <div className="mt-0.5 w-[85%] truncate text-center text-[9px] text-white/70">
                    {at.name}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div
        className={`han-input-box ${focused ? "border-han-purple/40 shadow-[0_0_32px_rgba(124,58,237,0.12)]" : ""}`}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`${btnSize} flex shrink-0 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.04] text-white/40 transition-colors hover:border-han-purple/20 hover:bg-han-purple/10 hover:text-han-purple-light`}
          title="Dosya Ekle"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={handleFileChange}
          accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,video/mp4,video/webm,video/quicktime,video/x-msvideo"
        />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={
            centered
              ? "HAN AI'ya bir şey sor veya dosya at..."
              : "Bir şey sor..."
          }
          disabled={isLoading}
          rows={1}
          className="max-h-40 min-h-[22px] flex-1 resize-none border-none bg-transparent px-1 py-2 text-sm font-medium tracking-tight text-han-text outline-none [caret-color:#a78bfa] placeholder:text-white/25 md:text-[15px]"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!isReady}
          className={`${btnSize} flex shrink-0 items-center justify-center rounded-xl border-none transition-all duration-300 ${
            isReady
              ? "scale-100 bg-gradient-to-br from-han-purple to-han-indigo shadow-[0_0_16px_rgba(124,58,237,0.4)] hover:scale-105 hover:shadow-[0_0_24px_rgba(124,58,237,0.5)]"
              : "scale-[0.85] cursor-not-allowed bg-han-purple/[0.06]"
          }`}
        >
          {isLoading ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-300/25 border-t-violet-300" />
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isReady ? "white" : "rgba(124,58,237,0.3)"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          )}
        </button>
      </div>

      {!isMobile && !centered && !minimal && (
        <div className="mt-1.5 text-center text-[10px] text-white/20">
          LifeCoach AI · HAN 4.2 Ultra Core
        </div>
      )}
    </div>
  );
}
