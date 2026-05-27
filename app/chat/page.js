"use client";
import dynamic from "next/dynamic";

const ChatLoading = () => (
  <div
    style={{
      width: "100vw",
      height: "100vh",
      background: "#0c0c18",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div style={{ color: "rgba(99,102,241,0.5)", fontSize: "14px" }}>Yükleniyor...</div>
  </div>
);

const ChatbotInterface = dynamic(() => import("@/components/ChatbotInterface"), {
  ssr: false,
  loading: ChatLoading,
});

export default function ChatPage() {
  return <ChatbotInterface />;
}
