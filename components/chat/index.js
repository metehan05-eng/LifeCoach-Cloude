import React, { useCallback, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useRouter } from "next/navigation";
import { Stack, Select, HStack, Text, Box } from "@chakra-ui/react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import ChatInput from "./input";
import ChatOuput from "./output";

// Vercel/Local için boş bırakıyoruz (relative path kullanır) veya env'den alır
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function Chat({ id, ...properties }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState();
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const router = useRouter();

  // Backend'den kullanılabilir modelleri çek
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch(`${API_URL}/api/ollama-models`);
        const data = await res.json();
        if (data && data.length > 0) {
          setModels(data);
          setSelectedModel(data[0].name); // İlk modeli varsayılan yap
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
      }
    }
    fetchModels();
  }, []);

  // Sohbet geçmişini yükle
  useEffect(() => {
    if (id) {
      const email = localStorage.getItem("userEmail"); // Kullanıcı email'ini localStorage'dan alıyoruz
      if (!email) return;

      fetch(`${API_URL}/api/get-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sessionId: id }),
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((session) => {
          const formattedMessages = session.messages.map((msg) => ({
            agent: msg.role === "assistant" ? "ai" : undefined,
            data: { response: msg.content },
          }));
          setMessages(formattedMessages);
        })
        .catch(() => setMessages([])); // Hata veya seans yoksa mesajları temizle
    } else {
      setMessages([]); // ID yoksa (yeni sohbet) mesajları temizle
    }
  }, [id]);

  const onSubmit = useCallback(
    async (values) => {
      if (!values || !selectedModel) return;

      let message = "";
      setIsSendingMessage(true);
      const userMessage = { data: { response: values } };
      const currentMessages = [...messages, userMessage];
      setMessages(currentMessages);

      const history = currentMessages.slice(0, -1).map((msg) => ({
        role: msg.agent === "ai" ? "assistant" : "user",
        content: msg.data.response,
      }));

      const email = localStorage.getItem("userEmail");
      if (!email) {
        alert("Please log in first.");
        setIsSendingMessage(false);
        return;
      }

      const ctrl = new AbortController();

      await fetchEventSource(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: values,
          history,
          email,
          sessionId: id,
          model: selectedModel,
        }),
        signal: ctrl.signal,
        async onmessage(event) {
          const data = JSON.parse(event.data);

          if (data.error) {
            console.error("SSE Error:", data.error);
            setNewMessage(`Server error occurred: ${data.error}`);
            setIsSendingMessage(false);
            ctrl.abort();
            return;
          }

          if (data.token) {
            message += data.token;
            setNewMessage(message);
          }

          if (data.done) {
            setMessages((previousMessages) => [
              ...previousMessages,
              { agent: "ai", data: { response: message } },
            ]);
            setNewMessage(undefined);
            setIsSendingMessage(false);

            if (data.sessionId && data.sessionId !== id) {
              router.replace(`/chat/${data.sessionId}`);
            }
            ctrl.abort();
          }
        },
        onerror(err) {
          setIsSendingMessage(false);
          setNewMessage("An error occurred while sending the message.");
          throw err;
        },
      });
    },
    [id, messages, selectedModel, router]
  );

  return (
    <Stack
      {...properties}
      minHeight="100vh"
      maxHeight="100vh"
      spacing={6}
      position="relative"
    >
      <Box px={6} pt={4}>
        <HStack>
          <Text fontSize="sm" fontWeight="500" mr={2} whiteSpace="nowrap">
            AI Model:
          </Text>
          <Select
            size="sm"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={models.length === 0 || isSendingMessage}
          >
            {models.map((model) => (
              <option key={model.name} value={model.name}>{model.name}</option>
            ))}
          </Select>
        </HStack>
      </Box>
      <ChatOuput
        isLoading={isSendingMessage}
        messages={messages}
        newMessage={newMessage}
        overflowY="auto"
        paddingBottom={40}
      />
      <ChatInput
        position="absolute"
        bottom="0"
        width="100%"
        isLoading={isSendingMessage}
        onSubmit={onSubmit}
        paddingY={6}
      />
    </Stack>
  );
}

Chat.propTypes = {
  id: PropTypes.string,
};
