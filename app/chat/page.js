"use client";
import dynamic from "next/dynamic";
import LoadingScreen from "@/components/ui/LoadingScreen";

const ChatbotInterface = dynamic(() => import("@/components/ChatbotInterface"), {
  ssr: false,
  loading: () => <LoadingScreen isLoading />,
});

export default function ChatPage() {
  return <ChatbotInterface />;
}
