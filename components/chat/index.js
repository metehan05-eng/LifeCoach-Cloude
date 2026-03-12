import React, { useCallback, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useRouter } from "next/navigation";
import { 
  Box, 
  Stack, 
  HStack, 
  Text, 
  Select, 
  useColorModeValue,
  Flex,
  Spinner,
} from "@chakra-ui/react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import ChatInput from "./input";
import ChatOuput from "./output";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function Chat({ id, onSelectChatbot, selectedChatbot, chatbots, ...properties }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState();
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const router = useRouter();
  
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const headerBg = useColorModeValue("white", "gray.800");

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch(`${API_URL}/api/ollama-models`);
        const data = await res.json();
        if (data && data.length > 0) {
          setModels(data);
          setSelectedModel(data[0].name);
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
      }
    }
    fetchModels();
  }, []);

  useEffect(() => {
    if (id) {
      const email = localStorage.getItem("userEmail");
      const token = localStorage.getItem("token");
      if (!email) return;

      fetch(`${API_URL}/api/get-session`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
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
        .catch(() => setMessages([]));
    } else {
      setMessages([]);
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
      const token = localStorage.getItem("token");
      if (!email) {
        alert("Please log in first.");
        setIsSendingMessage(false);
        return;
      }

      const ctrl = new AbortController();

      await fetchEventSource(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
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
              router.replace(`/app/chatbots/${data.sessionId}`);
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
      spacing={0}
      position="relative"
      backgroundColor={useColorModeValue("white", "gray.900")}
    >
      <Box 
        px={6} 
        py={3}
        backgroundColor={headerBg}
        borderBottomWidth={1}
        borderColor={borderColor}
      >
        <HStack justifyContent="space-between">
          <HStack spacing={3}>
            <Box
              width="32px"
              height="32px"
              borderRadius="lg"
              backgroundColor="#6366f1"
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxShadow="0 2px 8px rgba(99, 102, 241, 0.3)"
            >
              <Text color="white" fontSize="sm" fontWeight="bold">AI</Text>
            </Box>
            <Text fontSize="sm" fontWeight="600" color={useColorModeValue("gray.700", "gray.200")}>
              {selectedChatbot?.name || "AI Assistant"}
            </Text>
          </HStack>
          <HStack spacing={2}>
            <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
              Model:
            </Text>
            <Select
              size="xs"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={models.length === 0 || isSendingMessage}
              width="auto"
              minWidth="120px"
              fontSize="xs"
            >
              {models.map((model) => (
                <option key={model.name} value={model.name}>{model.name}</option>
              ))}
            </Select>
          </HStack>
        </HStack>
      </Box>
      <ChatOuput
        isLoading={isSendingMessage}
        messages={messages}
        newMessage={newMessage}
        overflowY="auto"
        flex={1}
      />
      <ChatInput
        position="relative"
        bottom="0"
        width="100%"
        isLoading={isSendingMessage}
        onSubmit={onSubmit}
      />
    </Stack>
  );
}

Chat.propTypes = {
  id: PropTypes.string,
  onSelectChatbot: PropTypes.func,
  selectedChatbot: PropTypes.object,
  chatbots: PropTypes.array,
};
