"use client";

import { useState } from "react";

export default function TestEmailPage() {
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  const testFeedback = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Metehan",
          email: "metehanhaydarerbas@gmail.com",
          subject: "Sifu Panda Test",
          message: "Merhaba Sifu Panda! Bu bir test mesajıdır. 🐼",
        }),
      });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setStatus({ error: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a14] text-white gap-6">
      <h1 className="text-xl font-bold">Email Test</h1>
      <button
        onClick={testFeedback}
        disabled={sending}
        className="px-6 py-3 bg-violet-600 rounded-xl hover:bg-violet-500 disabled:opacity-50"
      >
        {sending ? "Gönderiliyor..." : "Test Email Gönder"}
      </button>
      {status && (
        <pre className="text-sm text-white/60 bg-white/5 p-4 rounded-xl">
          {JSON.stringify(status, null, 2)}
        </pre>
      )}
    </main>
  );
}
