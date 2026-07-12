"use client";
import { useState, useEffect, useRef } from "react";

function SimpleMarkdown({ content }) {
  if (!content) return null;
  const html = content
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-white mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-white mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-white mt-5 mb-3">$1</h1>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-black/30 border border-white/[0.06] rounded-xl p-4 my-3 overflow-x-auto"><code class="text-xs text-emerald-300 font-mono">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="text-[11px] bg-white/5 text-violet-300 px-1.5 py-0.5 rounded font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="italic text-white/80">$1</em>')
    .replace(/^- (.+)$/gm, '<li class="text-xs text-white/60 ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="text-xs text-white/60 ml-4 list-decimal">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-xs text-white/60 leading-relaxed mb-3">')
    .replace(/\n/g, '<br/>');
  return (
    <div
      className="prose-content"
      dangerouslySetInnerHTML={{ __html: `<p class="text-xs text-white/60 leading-relaxed mb-3">${html}</p>` }}
    />
  );
}

export default function CanvasView({ onSelectView }) {
  const [canvases, setCanvases] = useState([]);
  const [activeCanvas, setActiveCanvas] = useState(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    fetchCanvases();
  }, []);

  const fetchCanvases = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/modules/canvas");
      if (res.ok) {
        const data = await res.json();
        setCanvases(data.canvases || []);
        if (data.canvases?.length > 0 && !activeCanvas) {
          setActiveCanvas(data.canvases[0]);
          setContent(data.canvases[0].content || "");
          setTitle(data.canvases[0].title || "");
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const selectCanvas = (c) => {
    setActiveCanvas(c);
    setContent(c.content || "");
    setTitle(c.title || "");
    setShowNewForm(false);
    setPreview(false);
  };

  const handleCreate = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/modules/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || "İsimsiz Canvas", content: content.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCanvas(data.canvas);
        setCanvases(prev => [data.canvas, ...prev]);
        setShowNewForm(false);
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!activeCanvas) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/modules/canvas/${activeCanvas.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCanvas(data.canvas);
        setCanvases(prev => prev.map(c => c.id === data.canvas.id ? data.canvas : c));
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeCanvas) return;
    try {
      const res = await fetch(`/api/modules/canvas/${activeCanvas.id}`, { method: "DELETE" });
      if (res.ok) {
        const remaining = canvases.filter(c => c.id !== activeCanvas.id);
        setCanvases(remaining);
        if (remaining.length > 0) {
          selectCanvas(remaining[0]);
        } else {
          setActiveCanvas(null);
          setContent("");
          setTitle("");
        }
      }
    } catch {}
  };

  const handleContentChange = (val) => {
    setContent(val);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (activeCanvas) handleSave();
    }, 3000);
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0d0e15] text-white">
      <div className="w-56 shrink-0 border-r border-white/[0.06] overflow-y-auto flex flex-col bg-[#0a0a14]">
        <div className="p-3 border-b border-white/[0.06]">
          <button
            onClick={() => { setShowNewForm(true); setActiveCanvas(null); }}
            className="w-full text-xs font-semibold rounded-xl py-2 px-3 transition-all flex items-center justify-center gap-1.5 bg-violet-600/15 text-violet-400 border border-violet-500/20 hover:bg-violet-600/25"
          >
            <span>+</span> Yeni Canvas
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {canvases.length === 0 && !showNewForm && (
            <div className="text-xs text-white/20 text-center py-8">Henüz canvas yok</div>
          )}
          {canvases.map(c => (
            <button
              key={c.id}
              onClick={() => selectCanvas(c)}
              className={`w-full text-left rounded-xl px-3 py-2.5 transition-all text-xs ${
                activeCanvas?.id === c.id
                  ? 'bg-violet-600/15 border border-violet-500/25'
                  : 'hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <div className="truncate font-medium text-white/80">
                {c.title || "İsimsiz Canvas"}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[9px] text-white/20">
                <span>v{c.version}</span>
                <span>{new Date(c.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06]">
          <button
            onClick={() => onSelectView("chat")}
            className="text-xs text-white/40 hover:text-white transition flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Sohbete Dön
          </button>
          <div className="flex items-center gap-2">
            {activeCanvas && (
              <>
                <button
                  onClick={() => setPreview(!preview)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    preview ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30' : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {preview ? "Düzenle" : "Önizleme"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30 transition-all"
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-600/15 text-red-400 border border-red-500/25 hover:bg-red-600/25 transition-all"
                >
                  Sil
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {showNewForm && !activeCanvas ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="max-w-2xl w-full bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                <h3 className="text-sm font-bold text-violet-300 mb-4">Yeni Canvas</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-white/50 mb-1.5">Başlık</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Canvas başlığı"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-white/50 mb-1.5">İçerik (Markdown)</label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="İçeriğinizi markdown formatında yazın..."
                      className="w-full h-64 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none transition-all resize-none font-mono"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowNewForm(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-white/50 hover:bg-white/[0.03] transition-all"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={saving || !content.trim()}
                      className="flex-1 glow-btn rounded-xl py-2.5 font-semibold text-xs disabled:opacity-50"
                    >
                      {saving ? "Oluşturuluyor..." : "Oluştur"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeCanvas ? (
            <div className="flex h-full">
              <div className={`${preview ? 'hidden' : 'flex'} flex-1 flex-col border-r border-white/[0.06]`}>
                <div className="px-6 py-3 border-b border-white/[0.06]">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold text-white border-none outline-none placeholder-white/30"
                    placeholder="Başlık"
                  />
                </div>
                <textarea
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="flex-1 w-full bg-transparent text-sm text-white/80 font-mono outline-none resize-none p-6 leading-relaxed"
                  placeholder="İçeriğinizi markdown formatında yazın..."
                />
              </div>
              <div className={`${preview ? 'flex' : 'hidden'} flex-1 overflow-y-auto p-6`}>
                <div className="prose prose-invert max-w-none">
                  <SimpleMarkdown content={content} />
                </div>
              </div>
              <div className="w-64 shrink-0 p-4 border-l border-white/[0.06] bg-[#0a0a14]">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-3">Özellikler</h4>
                <div className="space-y-2 text-xs text-white/40">
                  <div className="flex justify-between"><span>Sürüm</span><span className="text-white/60">{activeCanvas.version}</span></div>
                  <div className="flex justify-between"><span>Oluşturulma</span><span className="text-white/60">{new Date(activeCanvas.createdAt).toLocaleDateString('tr-TR')}</span></div>
                  <div className="flex justify-between"><span>Güncelleme</span><span className="text-white/60">{new Date(activeCanvas.updatedAt).toLocaleDateString('tr-TR')}</span></div>
                </div>
                <div className="mt-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-3">Markdown İpuçları</h4>
                  <div className="space-y-1 text-[10px] text-white/30">
                    <div><code className="text-amber-300"># Başlık</code> H1</div>
                    <div><code className="text-amber-300">## Başlık</code> H2</div>
                    <div><code className="text-amber-300">**kalın**</code> Kalın</div>
                    <div><code className="text-amber-300">*italik*</code> İtalik</div>
                    <div><code className="text-amber-300">`kod`</code> Kod</div>
                    <div><code className="text-amber-300">```kod bloğu```</code> Kod Bloğu</div>
                    <div><code className="text-amber-300">- liste</code> Liste</div>
                  </div>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-2xl animate-bounce">📝</div>
              <p className="text-sm text-white/40 mt-3 ml-2">Yükleniyor...</p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="text-6xl mb-4 opacity-30">📝</div>
              <h3 className="text-lg font-bold text-white/60 mb-2">Henüz Canvas Yok</h3>
              <p className="text-sm text-white/30 max-w-md mb-6">
                Doküman, kod veya notlarını düzenlemek için yeni bir canvas oluştur.
              </p>
              <button
                onClick={() => setShowNewForm(true)}
                className="glow-btn rounded-xl px-6 py-3 font-semibold text-xs"
              >
                ✨ İlk Canvas'ı Oluştur
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
