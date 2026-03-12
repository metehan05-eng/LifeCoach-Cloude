"use client";
import React, { useCallback, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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
  Spinner,
  Stack,
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
} from "react-icons/tb";
import { useAsync } from "react-use";
import { useForm } from "react-hook-form";
import PageHeader from "@/components/page-header";
import { useSidebar } from "@/lib/sidebar";
import Chat from "@/components/chat";
import {
  createChatbot,
  getChatbots,
  getDatasources,
  getPrompTemplates,
  removeChatbotById,
} from "@/lib/api";

export default function ChatbotsClientPage() {
  const [showForm, setShowForm] = useState(false);
  const [chatbots, setChatbots] = useState([]);
  const [promptTemplates, setPromptTemplates] = useState([]);
  const [datasources, setDatasources] = useState([]);
  const [selectedChatbot, setSelectedChatbot] = useState(null);
  
  const router = useRouter();
  const pathname = usePathname();
  const menu = useSidebar();

  const sidebarBg = useColorModeValue("gray.50", "gray.900");
  const sidebarBorder = useColorModeValue("gray.200", "gray.700");
  const itemHoverBg = useColorModeValue("gray.100", "gray.800");
  const itemActiveBg = useColorModeValue("gray.100", "gray.800");
  const accentColor = "#6366f1";
  const textMuted = useColorModeValue("gray.500", "gray.400");
  const textColor = useColorModeValue("gray.700", "gray.200");

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm();

  const { loading: isLoading } = useAsync(async () => {
    const [
      { data: chatbots },
      { data: promptTemplates },
      { data: datasources },
    ] = await Promise.all([
      getChatbots(),
      getPrompTemplates(),
      getDatasources(),
    ]);

    setChatbots(chatbots || []);
    setPromptTemplates(promptTemplates || []);
    setDatasources(datasources || []);

    if (chatbots && chatbots.length > 0 && !selectedChatbot) {
      setSelectedChatbot(chatbots[0]);
    }

    return;
  }, [getChatbots, getPrompTemplates, getDatasources]);

  const handleRemoveChatbot = useCallback(async (chatbotId, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    await removeChatbotById(chatbotId);
    setChatbots((prev) => prev.filter(({ id }) => id !== chatbotId));
    if (selectedChatbot?.id === chatbotId) {
      setSelectedChatbot(null);
    }
  }, [selectedChatbot]);

  const onSubmit = useCallback(
    async (values) => {
      const { name, promptTemplateId, datasourceId } = values;
      const { data: chatbot } = await createChatbot({
        name,
        promptTemplateId: parseInt(promptTemplateId),
        datasourceId: parseInt(datasourceId),
      });

      setChatbots((prev) => [...prev, chatbot]);
      setSelectedChatbot(chatbot);
      setShowForm(false);
      reset();
      router.push(`/app/chatbots/${chatbot.id}`);
    },
    [router, reset]
  );

  const handleSelectChatbot = (chatbot) => {
    setSelectedChatbot(chatbot);
    router.push(`/app/chatbots/${chatbot.id}`);
  };

  const handleNewChat = () => {
    setShowForm(true);
  };

  return (
    <Flex flex={1} height="100vh" overflow="hidden">
      <Box
        width="280px"
        minWidth="280px"
        backgroundColor={sidebarBg}
        borderRightWidth={1}
        borderColor={sidebarBorder}
        display="flex"
        flexDirection="column"
      >
        <Box p={4} borderBottomWidth={1} borderColor={sidebarBorder}>
          <Button
            width="100%"
            leftIcon={<Icon as={TbPlus} />}
            backgroundColor={accentColor}
            color="white"
            size="sm"
            onClick={handleNewChat}
            _hover={{
              backgroundColor: "#4f46e5",
            }}
            boxShadow="0 2px 8px rgba(99, 102, 241, 0.3)"
          >
            New Chat
          </Button>
        </Box>

        <Box flex={1} overflowY="auto" p={2}>
          <Stack spacing={1}>
            {chatbots.map((chatbot) => (
              <Box
                key={chatbot.id}
                p={3}
                borderRadius="lg"
                cursor="pointer"
                backgroundColor={
                  selectedChatbot?.id === chatbot.id 
                    ? itemActiveBg 
                    : "transparent"
                }
                _hover={{ backgroundColor: itemHoverBg }}
                onClick={() => handleSelectChatbot(chatbot)}
                position="relative"
                role="group"
              >
                <HStack spacing={3}>
                  <Flex
                    width="32px"
                    height="32px"
                    borderRadius="lg"
                    backgroundColor={
                      selectedChatbot?.id === chatbot.id
                        ? accentColor
                        : useColorModeValue("gray.200", "gray.700")
                    }
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                  >
                    <Icon
                      as={TbMessageCircle}
                      color={
                        selectedChatbot?.id === chatbot.id
                          ? "white"
                          : textMuted
                      }
                    />
                  </Flex>
                  <Box flex={1} minWidth={0}>
                    <Text
                      fontSize="sm"
                      fontWeight="500"
                      color={textColor}
                      noOfLines={1}
                    >
                      {chatbot.name}
                    </Text>
                    {chatbot.datasource && (
                      <Text fontSize="xs" color={textMuted} noOfLines={1}>
                        {chatbot.datasource.name}
                      </Text>
                    )}
                  </Box>
                </HStack>
                <IconButton
                  position="absolute"
                  right={2}
                  top="50%"
                  transform="translateY(-50%)"
                  size="xs"
                  variant="ghost"
                  icon={<Icon as={TbTrashX} />}
                  opacity={0}
                  _groupHover={{ opacity: 1 }}
                  onClick={(e) => handleRemoveChatbot(chatbot.id, e)}
                  color="red.400"
                  _hover={{ backgroundColor: "red.50" }}
                  aria-label="Delete chatbot"
                />
              </Box>
            ))}
          </Stack>

          {chatbots.length === 0 && !showForm && (
            <Center py={8} px={4}>
              <VStack spacing={3} textAlign="center">
                <Icon as={TbSparkles} fontSize="3xl" color={textMuted} />
                <Text fontSize="sm" color={textMuted}>
                  No chatbots yet
                </Text>
                <Text fontSize="xs" color={textMuted}>
                  Create your first AI assistant
                </Text>
              </VStack>
            </Center>
          )}
        </Box>

        <Box p={3} borderTopWidth={1} borderColor={sidebarBorder}>
          <Text fontSize="xs" color={textMuted} textAlign="center">
            {chatbots.length} chatbot{chatbots.length !== 1 ? 's' : ''}
          </Text>
        </Box>
      </Box>

      <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
        {showForm ? (
          <Center flex={1} p={8}>
            <Container maxWidth="md" as="form" onSubmit={handleSubmit(onSubmit)}>
              <Stack 
                spacing={6} 
                backgroundColor={useColorModeValue("white", "gray.800")}
                p={6}
                borderRadius="xl"
                borderWidth={1}
                borderColor={sidebarBorder}
                boxShadow="lg"
              >
                <HStack justifyContent="space-between" alignItems="center">
                  <HStack spacing={3}>
                    <Flex
                      width="40px"
                      height="40px"
                      borderRadius="lg"
                      backgroundColor={accentColor}
                      alignItems="center"
                      justifyContent="center"
                      boxShadow="0 2px 8px rgba(99, 102, 241, 0.3)"
                    >
                      <Icon as={TbSparkles} color="white" fontSize="lg" />
                    </Flex>
                    <Box>
                      <Text fontSize="lg" fontWeight="600">Create New Chatbot</Text>
                      <Text fontSize="sm" color={textMuted}>
                        Configure your AI assistant
                      </Text>
                    </Box>
                  </HStack>
                  <IconButton
                    icon={<Icon as={TbX} />}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowForm(false);
                      reset();
                    }}
                    aria-label="Close"
                  />
                </HStack>
                
                <Stack spacing={4}>
                  <FormControl isInvalid={errors?.name}>
                    <Text fontSize="sm" fontWeight="500" mb={1}>
                      Chatbot Name
                    </Text>
                    <Input
                      placeholder="My AI Assistant..."
                      {...register("name", { required: true })}
                      size="lg"
                    />
                  </FormControl>
                  
                  <FormControl>
                    <Text fontSize="sm" fontWeight="500" mb={1}>
                      Prompt Template
                    </Text>
                    <Select
                      {...register("promptTemplateId")}
                      placeholder="Select a prompt template"
                      size="lg"
                    >
                      {promptTemplates.map(({ id, name }) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControl>
                    <Text fontSize="sm" fontWeight="500" mb={1}>
                      Knowledge Base
                    </Text>
                    <Select
                      {...register("datasourceId")}
                      placeholder="Select a knowledge base"
                      size="lg"
                    >
                      {datasources.map(({ id, name }) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
                
                <HStack justifyContent="flex-end" pt={2}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setShowForm(false);
                      reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    backgroundColor={accentColor}
                    color="white"
                    type="submit"
                    size="sm"
                    isLoading={isSubmitting}
                    _hover={{
                      backgroundColor: "#4f46e5",
                    }}
                  >
                    Create Chatbot
                  </Button>
                </HStack>
              </Stack>
            </Container>
          </Center>
        ) : selectedChatbot ? (
          <Chat 
            id={selectedChatbot.id.toString()} 
            selectedChatbot={selectedChatbot}
            chatbots={chatbots}
          />
        ) : (
          <Center flex={1}>
            <VStack spacing={4}>
              <Flex
                width="80px"
                height="80px"
                borderRadius="2xl"
                backgroundColor={useColorModeValue("gray.100", "gray.800")}
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={TbMessage} fontSize="3xl" color={textMuted} />
              </Flex>
              <VStack spacing={1}>
                <Text fontSize="lg" fontWeight="600" color={textColor}>
                  Select a conversation
                </Text>
                <Text fontSize="sm" color={textMuted}>
                  Choose a chatbot from the sidebar or create a new one
                </Text>
              </VStack>
              <Button
                leftIcon={<Icon as={TbPlus} />}
                backgroundColor={accentColor}
                color="white"
                size="sm"
                onClick={handleNewChat}
                _hover={{
                  backgroundColor: "#4f46e5",
                }}
              >
                New Chat
              </Button>
            </VStack>
          </Center>
        )}
      </Box>
    </Flex>
  );
}
