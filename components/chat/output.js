import React, { useEffect, useRef } from "react";
import { Box, Stack, useColorModeValue } from "@chakra-ui/react";
import PropTypes from "prop-types";
import Message from "./message";

export default function ChatOuput({
  messages,
  newMessage,
  isLoading,
  ...properties
}) {
  const lastMessageReference = useRef();

  useEffect(() => {
    if (lastMessageReference?.current) {
      lastMessageReference?.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, newMessage]);

  const showAIMessage = isLoading || newMessage;

  return (
    <Stack 
      flex={1} 
      maxWidth="100%" 
      spacing={0}
      {...properties}
      backgroundColor={useColorModeValue("white", "gray.900")}
    >
      <Stack spacing={0}>
        {messages.length === 0 && !showAIMessage && (
          <Box 
            flex={1} 
            display="flex" 
            alignItems="center" 
            justifyContent="center"
            minHeight="400px"
          >
            <Box 
              textAlign="center" 
              maxWidth="md"
              padding={8}
            >
              <Box
                as="img"
                src="/chatbot.png"
                width="80px"
                height="80px"
                marginX="auto"
                marginBottom={4}
                borderRadius="xl"
                boxShadow="0 4px 20px rgba(99, 102, 241, 0.2)"
              />
              <Box
                fontSize="xl"
                fontWeight="600"
                color={useColorModeValue("gray.700", "gray.200")}
                marginBottom={2}
              >
                AI Assistant
              </Box>
              <Box
                fontSize="sm"
                color={useColorModeValue("gray.500", "gray.400")}
                lineHeight="1.6"
              >
                Start a conversation with your AI assistant. 
                Ask questions, get help, or just chat!
              </Box>
            </Box>
          </Box>
        )}
        {messages.map(({ agent, data: { response } }, index) => (
          <Message
            key={index}
            agent={agent}
            message={response}
            isLastMessage={index + 1 === messages.length}
          />
        ))}
        {showAIMessage && (
          <Box ref={lastMessageReference}>
            <Message agent="ai" message={newMessage} isLastMessage={true} />
          </Box>
        )}
      </Stack>
    </Stack>
  );
}

ChatOuput.propTypes = {
  messages: PropTypes.array,
  newMessage: PropTypes.string,
  isLoading: PropTypes.bool,
};
