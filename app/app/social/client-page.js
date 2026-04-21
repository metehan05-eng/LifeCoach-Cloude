"use client";
import React, { useCallback, useState, useEffect, useRef } from "react";
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
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Stack,
  Text,
  Textarea,
  useColorModeValue,
  useDisclosure,
  VStack,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  InputGroup,
  InputRightElement,
  Image,
  Badge,
  Divider,
  useToast,
} from "@chakra-ui/react";
import { 
  TbPlus, 
  TbTrashX, 
  TbUsers, 
  TbUserPlus,
  TbX,
  TbSparkles,
  TbSettings,
  TbMessageCircle,
  TbExternalLink,
  TbArrowRight,
  TbSend,
  TbPaperclip,
  TbFile,
  TbDownload,
  TbFileTypePdf,
  TbPhoto,
  TbMessage,
  TbSearch,
  TbSpark,
  TbCheck,
  TbCheckupList,
} from "react-icons/tb";
import { useAsync } from "react-use";
import { useForm } from "react-hook-form";

const accentColor = "#6366f1";

export default function SocialClientPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [groups, setGroups] = useState([]);
  const [partners, setPartners] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sentFiles, setSentFiles] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const { isOpen: isGroupModalOpen, onOpen: onGroupModalOpen, onClose: onGroupModalClose } = useDisclosure();
  const { isOpen: isPartnerModalOpen, onOpen: onPartnerModalOpen, onClose: onPartnerModalClose } = useDisclosure();
  const { isOpen: isFileSidebarOpen, onOpen: onFileSidebarOpen, onClose: onFileSidebarClose } = useDisclosure();
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const toast = useToast();

  const sidebarBg = useColorModeValue("gray.50", "gray.900");
  const sidebarBorder = useColorModeValue("gray.200", "gray.700");
  const itemHoverBg = useColorModeValue("gray.100", "gray.800");
  const itemActiveBg = useColorModeValue("gray.100", "gray.800");
  const textMuted = useColorModeValue("gray.500", "gray.400");
  const textColor = useColorModeValue("gray.700", "gray.200");
  const cardBg = useColorModeValue("white", "gray.800");

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm();

  const { loading: isLoading } = useAsync(async () => {
    await Promise.all([
      loadGroups(),
      loadPartners(),
      loadConversations(),
      loadFiles()
    ]);
  }, []);

  // Poll for new messages every 3 seconds when a conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;
    
    const interval = setInterval(() => {
      loadMessages(selectedConversation.partnerId);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [selectedConversation?.partnerId]);

  async function loadGroups() {
    try {
      const response = await fetch("/api/social?type=groups", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (data.success) setGroups(data.groups || []);
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  }

  async function loadConversations() {
    try {
      const response = await fetch("/api/social?type=conversations", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (data.success) setConversations(data.conversations || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }

  async function loadPartners() {
    try {
      const response = await fetch("/api/social?type=partners", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (data.success) setPartners(data.partners || []);
      
      // Also add partners as conversations if they don't exist
      if (data.success && data.partners) {
        const existingConversations = conversations.map(c => c.partnerId);
        data.partners.forEach(partner => {
          if (!existingConversations.includes(partner.partnerId)) {
            setConversations(prev => [...prev, {
              partnerId: partner.partnerId,
              partnerName: partner.partnerName || 'Partner',
              lastMessage: null,
              unreadCount: 0,
              updatedAt: null
            }]);
          }
        });
      }
    } catch (err) {
      console.error("Failed to load partners:", err);
    }
  }

  async function addPartner(partnerId) {
    try {
      const response = await fetch("/api/social?type=partners", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
        body: JSON.stringify({ partnerId }),
      });
      const data = await response.json();
      if (data.success) {
        setPartners(prev => [...prev, data.partnership]);
        // Add to conversations
        setConversations(prev => [...prev, {
          partnerId: data.partnership.partnerId,
          partnerName: data.partnership.partnerName,
          lastMessage: null,
          unreadCount: 0,
          updatedAt: null
        }]);
        toast({ title: "Partner eklendi!", status: "success", duration: 2000 });
      } else {
        toast({ title: data.error || "Partner eklenemedi", status: "error", duration: 2000 });
      }
    } catch (err) {
      console.error("Failed to add partner:", err);
      toast({ title: "Partner eklenemedi", status: "error", duration: 2000 });
    }
  }

  async function searchUsers(query) {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error("Failed to search users:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelectPartnerFromSearch(user) {
    if (user.isPartner) {
      toast({ title: "Bu kullanıcı zaten partneriniz", status: "info", duration: 2000 });
      return;
    }
    addPartner(user.id);
    setSearchResults([]);
    setSearchQuery("");
    onPartnerModalClose();
  }

  async function loadFiles() {
    try {
      const response = await fetch("/api/social?type=files", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (data.success) {
        setSentFiles(data.sent || []);
        setReceivedFiles(data.received || []);
      }
    } catch (err) {
      console.error("Failed to load files:", err);
    }
  }

  async function loadMessages(partnerId) {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/social?type=messages&partnerId=${partnerId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages || []);
        scrollToBottom();
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function getAiSuggestions(partnerName, lastMessage) {
    setAiSuggestions([
      { text: "Yükleniyor...", mood: "loading" },
      { text: "Yükleniyor...", mood: "loading" },
      { text: "Yükleniyor...", mood: "loading" }
    ]);
    setShowSuggestions(true);
    
    try {
      const response = await fetch("/api/social?type=ai-suggestion", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
        body: JSON.stringify({ partnerName, lastMessage }),
      });
      const data = await response.json();
      if (data.success && data.suggestions) {
        setAiSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error("Failed to get AI suggestions:", err);
      setAiSuggestions([
        { text: "Tekrar deneyin", mood: "friendly" },
        { text: "Hata oluştu", mood: "supportive" },
        { text: "Tıkla ve dene", mood: "motivated" }
      ]);
    }
  }

  async function sendMessage(content, messageType = 'text', fileData = null, fileName = null, fileType = null) {
    if (!selectedConversation || !content.trim()) return;
    
    // Optimistic update - add message immediately
    const tempMessage = {
      id: `temp_${Date.now()}`,
      senderId: 'me',
      recipientId: selectedConversation.partnerId,
      content,
      type: messageType,
      timestamp: new Date().toISOString(),
      fileData,
      fileName,
      fileType,
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage("");
    scrollToBottom();
    setIsSending(true);
    
    try {
      const response = await fetch("/api/social?type=messages", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
        body: JSON.stringify({
          partnerId: selectedConversation.partnerId,
          content,
          messageType,
          fileData,
          fileName,
          fileType,
        }),
      });
      const data = await response.json();
      if (data.success) {
        // Replace temp message with real one
        setMessages(prev => prev.map(m => m.id === tempMessage.id ? data.data : m));
        setShowSuggestions(false);
        loadFiles();
        loadConversations(); // Update conversation list
      } else {
        // Remove temp message if failed
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
    } finally {
      setIsSending(false);
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function handleSendMessage() {
    if (newMessage.trim()) {
      sendMessage(newMessage);
    }
  }

  function handleSuggestionClick(suggestion) {
    setNewMessage(suggestion.text);
    setShowSuggestions(false);
  }

  function handleSelectConversation(conversation) {
    setSelectedConversation(conversation);
    loadMessages(conversation.partnerId);
    getAiSuggestions(conversation.partnerName, conversation.lastMessage?.content);
  }

  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      const isImage = file.type.startsWith('image/');
      const message = isImage ? `📷 ${file.name}` : `📎 ${file.name}`;
      
      await sendMessage(
        message,
        isImage ? 'image' : 'file',
        base64,
        file.name,
        file.type
      );
      
      toast({
        title: "Dosya gönderildi",
        status: "success",
        duration: 2000,
      });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function downloadFile(fileData, fileName) {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function deleteFile(fileId) {
    try {
      await fetch("/api/social?type=files", {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
        body: JSON.stringify({ fileId }),
      });
      loadFiles();
      toast({ title: "Dosya silindi", status: "info", duration: 2000 });
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  }

  const onGroupSubmit = useCallback(async (values) => {
    try {
      const response = await fetch("/api/social?type=groups", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (data.success) {
        setGroups((prev) => [...prev, data.group]);
        onGroupModalClose();
        reset();
      }
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  }, [onGroupModalClose, reset]);

  const filteredConversations = conversations.filter(c => 
    c.partnerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Flex flex={1} height="100vh" overflow="hidden">
      {/* Left Sidebar - Groups & Conversations */}
      <Box
        width="300px"
        minWidth="300px"
        backgroundColor={sidebarBg}
        borderRightWidth={1}
        borderColor={sidebarBorder}
        display="flex"
        flexDirection="column"
      >
        <Tabs 
          variant="soft-rounded" 
          colorScheme="teal" 
          onChange={(index) => setActiveTab(index)}
          p={2}
        >
          <TabList mb={2}>
            <Tab flex={1} fontSize="sm"><Icon as={TbUsers} mr={1} /> Gruplar</Tab>
            <Tab flex={1} fontSize="sm"><Icon as={TbMessage} mr={1} /> Mesajlar</Tab>
            <Tab flex={1} fontSize="sm"><Icon as={TbFile} mr={1} /> Dosyalar</Tab>
          </TabList>

          <TabPanels>
            {/* Groups Tab */}
            <TabPanel p={0}>
              <Box p={2}>
                <Button
                  width="100%"
                  leftIcon={<Icon as={TbPlus} />}
                  backgroundColor={accentColor}
                  color="white"
                  size="sm"
                  onClick={onGroupModalOpen}
                  _hover={{ backgroundColor: "#4f46e5" }}
                  boxShadow="0 2px 8px rgba(99, 102, 241, 0.3)"
                >
                  Yeni Grup
                </Button>
              </Box>
              <Box flex={1} overflowY="auto" p={2}>
                <Stack spacing={1}>
                  {groups.map((group) => (
                    <Box
                      key={group.id}
                      p={3}
                      borderRadius="lg"
                      cursor="pointer"
                      backgroundColor={selectedGroup?.id === group.id ? itemActiveBg : "transparent"}
                      _hover={{ backgroundColor: itemHoverBg }}
                      onClick={() => { setSelectedGroup(group); setSelectedConversation(null); }}
                    >
                      <HStack spacing={3}>
                        <Flex width="36px" height="36px" borderRadius="lg" backgroundColor={accentColor} alignItems="center" justifyContent="center">
                          <Icon as={TbUsers} color="white" />
                        </Flex>
                        <Box flex={1}>
                          <Text fontSize="sm" fontWeight="500" color={textColor} noOfLines={1}>{group.name}</Text>
                          <Text fontSize="xs" color={textMuted}>{group.totalMembers} üye</Text>
                        </Box>
                      </HStack>
                    </Box>
                  ))}
                </Stack>
                {groups.length === 0 && (
                  <Center py={8}>
                    <VStack spacing={2}>
                      <Icon as={TbSparkles} fontSize="2xl" color={textMuted} />
                      <Text fontSize="sm" color={textMuted}>Henüz grup yok</Text>
                    </VStack>
                  </Center>
                )}
              </Box>
            </TabPanel>

            {/* Conversations Tab */}
            <TabPanel p={0}>
              <Box p={2}>
                <InputGroup size="sm">
                  <Input 
                    placeholder="Ara..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <InputRightElement>
                    <Icon as={TbSearch} color={textMuted} />
                  </InputRightElement>
                </InputGroup>
              </Box>
              <Box flex={1} overflowY="auto" p={2}>
                <Stack spacing={1}>
                  {filteredConversations.map((conv) => (
                    <Box
                      key={conv.partnerId}
                      p={3}
                      borderRadius="lg"
                      cursor="pointer"
                      backgroundColor={selectedConversation?.partnerId === conv.partnerId ? itemActiveBg : "transparent"}
                      _hover={{ backgroundColor: itemHoverBg }}
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <HStack spacing={3}>
                        <Flex width="36px" height="36px" borderRadius="full" backgroundColor={accentColor} alignItems="center" justifyContent="center">
                          <Text color="white" fontSize="sm" fontWeight="bold">
                            {conv.partnerName?.[0]?.toUpperCase() || '?'}
                          </Text>
                        </Flex>
                        <Box flex={1} overflow="hidden">
                          <HStack justify="space-between">
                            <Text fontSize="sm" fontWeight="500" color={textColor} noOfLines={1}>{conv.partnerName}</Text>
                            {conv.unreadCount > 0 && (
                              <Badge colorScheme="teal" borderRadius="full">{conv.unreadCount}</Badge>
                            )}
                          </HStack>
                          <Text fontSize="xs" color={textMuted} noOfLines={1}>
                            {conv.lastMessage?.content || 'Henüz mesaj yok'}
                          </Text>
                        </Box>
                      </HStack>
                    </Box>
                  ))}
                </Stack>
                {filteredConversations.length === 0 && (
                  <Center py={8}>
                    <VStack spacing={2}>
                      <Icon as={TbMessageCircle} fontSize="2xl" color={textMuted} />
                      <Text fontSize="sm" color={textMuted}>Henüz konuşma yok</Text>
                      <Button size="xs" leftIcon={<Icon as={TbUserPlus} />} onClick={onPartnerModalOpen}>
                        Partner Ekle
                      </Button>
                    </VStack>
                  </Center>
                )}
              </Box>
            </TabPanel>

            {/* Files Tab */}
            <TabPanel p={0}>
              <Box flex={1} overflowY="auto" p={2}>
                <VStack spacing={3} align="stretch">
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color={textMuted} mb={2}>GÖNDERİLEN DOSYALAR</Text>
                    {sentFiles.map((file) => (
                      <Flex 
                        key={file.id} 
                        p={2} 
                        bg={cardBg} 
                        borderRadius="md" 
                        mb={2}
                        align="center"
                        justify="space-between"
                      >
                        <HStack flex={1} onClick={() => downloadFile(file.fileData, file.fileName)} cursor="pointer">
                          <Icon as={file.fileType?.startsWith('image/') ? TbPhoto : TbFileTypePdf} />
                          <Text fontSize="sm" noOfLines={1}>{file.fileName}</Text>
                        </HStack>
                        <HStack>
                          <IconButton 
                            icon={<Icon as={TbDownload} />} 
                            size="xs" 
                            variant="ghost"
                            onClick={() => downloadFile(file.fileData, file.fileName)}
                            aria-label="İndir"
                          />
                          <IconButton 
                            icon={<Icon as={TbTrashX} />} 
                            size="xs" 
                            variant="ghost" 
                            colorScheme="red"
                            onClick={() => deleteFile(file.id)}
                            aria-label="Sil"
                          />
                        </HStack>
                      </Flex>
                    ))}
                    {sentFiles.length === 0 && <Text fontSize="xs" color={textMuted}>Gönderilmiş dosya yok</Text>}
                  </Box>
                  
                  <Divider />
                  
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color={textMuted} mb={2}>ALINAN DOSYALAR</Text>
                    {receivedFiles.map((file) => (
                      <Flex 
                        key={file.id} 
                        p={2} 
                        bg={cardBg} 
                        borderRadius="md" 
                        mb={2}
                        align="center"
                        justify="space-between"
                      >
                        <HStack flex={1} onClick={() => downloadFile(file.fileData, file.fileName)} cursor="pointer">
                          <Icon as={file.fileType?.startsWith('image/') ? TbPhoto : TbFileTypePdf} />
                          <Text fontSize="sm" noOfLines={1}>{file.fileName}</Text>
                        </HStack>
                        <HStack>
                          <IconButton 
                            icon={<Icon as={TbDownload} />} 
                            size="xs" 
                            variant="ghost"
                            onClick={() => downloadFile(file.fileData, file.fileName)}
                            aria-label="İndir"
                          />
                          <IconButton 
                            icon={<Icon as={TbTrashX} />} 
                            size="xs" 
                            variant="ghost" 
                            colorScheme="red"
                            onClick={() => deleteFile(file.id)}
                            aria-label="Sil"
                          />
                        </HStack>
                      </Flex>
                    ))}
                    {receivedFiles.length === 0 && <Text fontSize="xs" color={textMuted}>Alınan dosya yok</Text>}
                  </Box>
                </VStack>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Main Chat Area */}
      <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <Flex p={4} borderBottomWidth={1} borderColor={sidebarBorder} align="center" justify="space-between">
              <HStack spacing={3}>
                <Flex width="40px" height="40px" borderRadius="full" backgroundColor={accentColor} alignItems="center" justifyContent="center">
                  <Text color="white" fontWeight="bold">{selectedConversation.partnerName?.[0]?.toUpperCase() || '?'}</Text>
                </Flex>
                <Box>
                  <Text fontWeight="600" color={textColor}>{selectedConversation.partnerName}</Text>
                  <Text fontSize="xs" color={textMuted}>Partner</Text>
                </Box>
              </HStack>
              <HStack>
                <Button size="sm" variant="ghost" leftIcon={<Icon as={TbCheckupList} />} onClick={() => getAiSuggestions(selectedConversation.partnerName, messages[messages.length-1]?.content)}>
                  AI Öner
                </Button>
              </HStack>
            </Flex>

            {/* AI Suggestions */}
            {showSuggestions && aiSuggestions.length > 0 && (
              <Box p={3} bg={useColorModeValue("purple.50", "purple.900")} borderBottomWidth={1} borderColor={sidebarBorder}>
                <HStack mb={2}>
                  <Icon as={TbSpark} color="purple.500" />
                  <Text fontSize="xs" fontWeight="bold" color="purple.500">AI Önerileri</Text>
                </HStack>
                <HStack spacing={2} flexWrap="wrap">
                  {aiSuggestions.map((suggestion, idx) => (
                    <Button 
                      key={idx}
                      size="sm"
                      variant="outline"
                      colorScheme="purple"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion.text}
                    </Button>
                  ))}
                </HStack>
              </Box>
            )}

            {/* Messages */}
            <Box flex={1} overflowY="auto" p={4}>
              <VStack spacing={4} align="stretch">
                {isLoadingMessages ? (
                  <Center py={10}><Spinner /></Center>
                ) : messages.map((msg) => {
                  const isMine = msg.senderId !== selectedConversation.partnerId;
                  return (
                    <Flex key={msg.id} justify={isMine ? "flex-end" : "flex-start"}>
                      <Box maxW="70%">
                        <Box
                          p={3}
                          borderRadius="lg"
                          bg={isMine ? accentColor : cardBg}
                          color={isMine ? "white" : textColor}
                          boxShadow="sm"
                        >
                          {msg.type === 'image' && msg.fileData && (
                            <Image 
                              src={msg.fileData} 
                              alt="Image" 
                              borderRadius="md" 
                              maxH="200px" 
                              mb={2}
                              cursor="pointer"
                              onClick={() => window.open(msg.fileData, '_blank')}
                            />
                          )}
                          <Text fontSize="sm">{msg.content}</Text>
                        </Box>
                        <Text fontSize="xs" color={textMuted} mt={1}>
                          {new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          {isMine && msg.readAt && <Icon as={TbCheck} ml={1} color="green.400" />}
                        </Text>
                      </Box>
                    </Flex>
                  );
                })}
                <div ref={messagesEndRef} />
              </VStack>
            </Box>

            {/* Message Input */}
            <Box p={4} borderTopWidth={1} borderColor={sidebarBorder}>
              <HStack spacing={2}>
                <InputGroup>
                  <Input
                    placeholder="Mesaj yaz..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <InputRightElement>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }}
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileSelect}
                    />
                    <IconButton
                      icon={<Icon as={TbPaperclip} />}
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Dosya ekle"
                    />
                  </InputRightElement>
                </InputGroup>
                <input 
                  type="file" 
                  ref={imageInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleFileSelect}
                />
                <IconButton
                  icon={<Icon as={TbPhoto} />}
                  variant="ghost"
                  onClick={() => imageInputRef.current?.click()}
                  aria-label="Fotoğraf ekle"
                />
                <IconButton
                  icon={<Icon as={TbSend} />}
                  backgroundColor={accentColor}
                  color="white"
                  onClick={handleSendMessage}
                  isLoading={isSending}
                  _hover={{ backgroundColor: "#4f46e5" }}
                  aria-label="Gönder"
                />
              </HStack>
            </Box>
          </>
        ) : selectedGroup ? (
          <Flex flex={1} direction="column" p={6}>
            <Stack spacing={4} mb={6}>
              <HStack spacing={3}>
                <Flex width="48px" height="48px" borderRadius="lg" backgroundColor={accentColor} alignItems="center" justifyContent="center">
                  <Icon as={TbUsers} color="white" fontSize="xl" />
                </Flex>
                <Box>
                  <Text fontSize="xl" fontWeight="600" color={textColor}>{selectedGroup.name}</Text>
                  <Text fontSize="sm" color={textMuted}>{selectedGroup.subject} • {selectedGroup.totalMembers} üye</Text>
                </Box>
              </HStack>
              {selectedGroup.description && <Text color={textColor}>{selectedGroup.description}</Text>}
            </Stack>
            <Box flex={1} bg={useColorModeValue("gray.50", "gray.800")} borderRadius="xl" p={6}>
              <VStack spacing={4}>
                <Text fontWeight="600" color={textColor}>Grup Özellikleri</Text>
                <Box p={4} borderRadius="lg" bg={cardBg} borderWidth={1} borderColor={sidebarBorder} w="full">
                  <HStack justify="space-between">
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="500" color={textColor}>Tartışma Paneli</Text>
                      <Text fontSize="sm" color={textMuted}>Grup üyeleriyle sohbet et</Text>
                    </VStack>
                    <Icon as={TbMessageCircle} color={accentColor} />
                  </HStack>
                </Box>
              </VStack>
            </Box>
          </Flex>
        ) : (
          <Center flex={1}>
            <VStack spacing={6} maxWidth="500px" textAlign="center">
              <Flex width="100px" height="100px" borderRadius="2xl" bg={useColorModeValue("gray.100", "gray.800")} alignItems="center" justifyContent="center">
                <Icon as={TbUsers} fontSize="3xl" color={textMuted} />
              </Flex>
              <VStack spacing={2}>
                <Text fontSize="xl" fontWeight="600" color={textColor}>Gruplar & Topluluk</Text>
                <Text fontSize="sm" color={textMuted}>Diğer öğrencilerle bağlan, hedeflerini paylaş ve birlikte çalış</Text>
              </VStack>
              <Button leftIcon={<Icon as={TbPlus} />} backgroundColor={accentColor} color="white" onClick={onGroupModalOpen}>
                Yeni Grup Oluştur
              </Button>
            </VStack>
          </Center>
        )}
      </Box>

      {/* Group Modal */}
      <Modal isOpen={isGroupModalOpen} onClose={onGroupModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <Flex width="40px" height="40px" borderRadius="lg" backgroundColor={accentColor} alignItems="center" justifyContent="center">
                <Icon as={TbSparkles} color="white" />
              </Flex>
              <Box>
                <Text fontSize="lg" fontWeight="600">Yeni Grup Oluştur</Text>
                <Text fontSize="sm" fontWeight="normal" color={textMuted}>Bir çalışma grubu başlat</Text>
              </Box>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4} py={4}>
              <FormControl isInvalid={errors?.name}>
                <Text fontSize="sm" fontWeight="500" mb={1}>Grup Adı</Text>
                <Input placeholder="örn: Tıp Fakültesi Hazırlık" {...register("name", { required: true })} size="lg" />
              </FormControl>
              <FormControl>
                <Text fontSize="sm" fontWeight="500" mb={1}>Konu</Text>
                <Input placeholder="örn: Tıp, Hukuk, Mühendislik..." {...register("subject")} size="lg" />
              </FormControl>
              <FormControl>
                <Text fontSize="sm" fontWeight="500" mb={1}>Açıklama</Text>
                <Textarea placeholder="Grubunu tanımla..." {...register("description")} rows={4} />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onGroupModalClose}>İptal</Button>
            <Button backgroundColor={accentColor} color="white" onClick={handleSubmit(onGroupSubmit)} isLoading={isSubmitting}>
              Oluştur
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Partner Modal */}
      <Modal isOpen={isPartnerModalOpen} onClose={onPartnerModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <Flex width="40px" height="40px" borderRadius="lg" backgroundColor={accentColor} alignItems="center" justifyContent="center">
                <Icon as={TbUserPlus} color="white" />
              </Flex>
              <Box>
                <Text fontSize="lg" fontWeight="600">Partner Ekle</Text>
                <Text fontSize="sm" fontWeight="normal" color={textMuted}>Kullanıcı ara ve ekle</Text>
              </Box>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <InputGroup size="lg">
                  <Input
                    placeholder="İsim veya e-posta ara..."
                    value={searchQuery}
                    onChange={(e) => searchUsers(e.target.value)}
                  />
                  <InputRightElement>
                    {isSearching ? (
                      <Spinner size="sm" />
                    ) : (
                      <Icon as={TbSearch} color={textMuted} />
                    )}
                  </InputRightElement>
                </InputGroup>
              </FormControl>
              
              {searchResults.length > 0 && (
                <Box maxH="300px" overflowY="auto">
                  <Text fontSize="xs" fontWeight="bold" color={textMuted} mb={2}>
                    BULUNAN KULLANICILAR ({searchResults.length})
                  </Text>
                  <Stack spacing={2}>
                    {searchResults.map((user) => (
                      <Flex
                        key={user.id}
                        p={3}
                        bg={cardBg}
                        borderRadius="lg"
                        cursor={user.isPartner ? "not-allowed" : "pointer"}
                        opacity={user.isPartner ? 0.5 : 1}
                        _hover={user.isPartner ? {} : { bg: useColorModeValue("gray.100", "gray.700") }}
                        onClick={() => handleSelectPartnerFromSearch(user)}
                        align="center"
                        justify="space-between"
                      >
                        <HStack spacing={3}>
                          <Flex width="40px" height="40px" borderRadius="full" backgroundColor={accentColor} alignItems="center" justifyContent="center">
                            {user.image ? (
                              <Image src={user.image} alt="" borderRadius="full" width="40px" height="40px" />
                            ) : (
                              <Text color="white" fontWeight="bold">
                                {user.displayName?.[0]?.toUpperCase() || '?'}
                              </Text>
                            )}
                          </Flex>
                          <Box>
                            <Text fontSize="sm" fontWeight="500">{user.displayName}</Text>
                            {user.email && (
                              <Text fontSize="xs" color={textMuted}>{user.email}</Text>
                            )}
                          </Box>
                        </HStack>
                        {user.isPartner ? (
                          <Badge colorScheme="green">Partner</Badge>
                        ) : (
                          <Icon as={TbPlus} color={accentColor} />
                        )}
                      </Flex>
                    ))}
                  </Stack>
                </Box>
              )}
              
              {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                <Center py={4}>
                  <Text color={textMuted}>Kullanıcı bulunamadı</Text>
                </Center>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}