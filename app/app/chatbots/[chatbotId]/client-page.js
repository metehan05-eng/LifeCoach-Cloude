"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Center,
  Container,
  Flex,
  FormControl,
  HStack,
  Icon,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  StackDivider,
  Tag,
  Text,
  Textarea,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import { 
  TbPlus, 
  TbTrashX, 
  TbMessage, 
  TbMessageCircle,
  TbX,
  TbSparkles,
  TbSettings,
  TbDatabase,
  TbArrowLeft,
  TbApi,
} from "react-icons/tb";
import { useAsync } from "react-use";
import { useForm } from "react-hook-form";
import { getChatbotById } from "@/lib/api";
import Chat from "@/components/chat";
import CodeBlock from "@/components/code-block";

import { API_DOCS } from "@/lib/api-docs";

export default function ChatbotClientPage({ chatbotId }) {
  const [chatbot, setChatbot] = useState();
  const [showSidebar, setShowSidebar] = useState(true);
  
  const router = useRouter();
  
  const sidebarBg = useColorModeValue("gray.50", "gray.900");
  const sidebarBorder = useColorModeValue("gray.200", "gray.700");
  const itemHoverBg = useColorModeValue("gray.100", "gray.800");
  const accentColor = "#6366f1";
  const textMuted = useColorModeValue("gray.500", "gray.400");
  const textColor = useColorModeValue("gray.700", "gray.200");

  const { loading: isLoading } = useAsync(async () => {
    const { data } = await getChatbotById(chatbotId);
    setChatbot(data);
  }, [chatbotId, getChatbotById]);

  const handleBack = () => {
    router.push("/app/chatbots");
  };

  return (
    <Flex flex={1} height="100vh" overflow="hidden">
      {showSidebar && (
        <Box
          width="320px"
          minWidth="320px"
          backgroundColor={sidebarBg}
          borderRightWidth={1}
          borderColor={sidebarBorder}
          display="flex"
          flexDirection="column"
        >
          <Box p={4} borderBottomWidth={1} borderColor={sidebarBorder}>
            <HStack spacing={3}>
              <IconButton
                icon={<Icon as={TbArrowLeft} />}
                variant="ghost"
                size="sm"
                onClick={handleBack}
                aria-label="Back to chatbots"
              />
              <Flex
                width="36px"
                height="36px"
                borderRadius="lg"
                backgroundColor={accentColor}
                alignItems="center"
                justifyContent="center"
                boxShadow="0 2px 8px rgba(99, 102, 241, 0.3)"
              >
                <Icon as={TbMessageCircle} color="white" />
              </Flex>
              <Box flex={1} minWidth={0}>
                <Text fontSize="sm" fontWeight="600" color={textColor} noOfLines={1}>
                  {chatbot?.name || "Loading..."}
                </Text>
                <Text fontSize="xs" color={textMuted}>
                  AI Assistant
                </Text>
              </Box>
              <IconButton
                icon={<Icon as={TbX} />}
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(false)}
                aria-label="Close sidebar"
              />
            </HStack>
          </Box>

          <Stack 
            divider={<StackDivider />} 
            spacing={0} 
            flex={1} 
            overflowY="auto"
          >
            <Box p={4}>
              <Stack spacing={4}>
                <Stack spacing={2}>
                  <HStack spacing={2}>
                    <Icon as={TbDatabase} color={accentColor} />
                    <Text fontSize="sm" fontWeight="600" color={textColor}>
                      Knowledge Base
                    </Text>
                  </HStack>
                  {chatbot?.datasource ? (
                    <Box
                      p={3}
                      borderRadius="lg"
                      backgroundColor={useColorModeValue("white", "gray.800")}
                      borderWidth={1}
                      borderColor={sidebarBorder}
                    >
                      <HStack justifyContent="space-between">
                        <Text fontSize="sm" fontWeight="500">
                          {chatbot.datasource.name}
                        </Text>
                        <Tag 
                          colorScheme="teal" 
                          size="sm"
                          backgroundColor={useColorModeValue("green.50", "green.900")}
                          color={useColorModeValue("green.600", "green.200")}
                        >
                          {chatbot.datasource.type}
                        </Tag>
                      </HStack>
                    </Box>
                  ) : (
                    <Text fontSize="sm" color={textMuted}>
                      No knowledge base selected
                    </Text>
                  )}
                </Stack>

                <Stack spacing={2}>
                  <HStack spacing={2}>
                    <Icon as={TbApi} color={accentColor} />
                    <Text fontSize="sm" fontWeight="600" color={textColor}>
                      API Access
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color={textMuted}>
                    Use this endpoint to integrate with your chatbot
                  </Text>
                  <Box
                    p={3}
                    borderRadius="lg"
                    backgroundColor={useColorModeValue("white", "gray.800")}
                    borderWidth={1}
                    borderColor={sidebarBorder}
                  >
                    <CodeBlock items={API_DOCS} />
                  </Box>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </Box>
      )}

      <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
        {!showSidebar && (
          <Box
            position="absolute"
            top={4}
            left={4}
            zIndex={10}
          >
            <IconButton
              icon={<Icon as={TbSettings} />}
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(true)}
              backgroundColor={useColorModeValue("white", "gray.800")}
              boxShadow="md"
              aria-label="Open settings"
            />
          </Box>
        )}
        
        {isLoading ? (
          <Center flex={1}>
            <Spinner size="lg" color={accentColor} />
          </Center>
        ) : (
          <Chat id={chatbotId} selectedChatbot={chatbot} />
        )}
      </Box>
    </Flex>
  );
}
