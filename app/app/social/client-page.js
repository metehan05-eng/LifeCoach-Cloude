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
} from "react-icons/tb";
import { useAsync } from "react-use";
import { useForm } from "react-hook-form";
import PageHeader from "@/components/page-header";

export default function SocialClientPage() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const router = useRouter();
  const pathname = usePathname();

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
    try {
      const response = await fetch("/api/social?type=groups", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  }, []);

  const onSubmit = useCallback(
    async (values) => {
      try {
        const response = await fetch("/api/social?type=groups", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(values),
        });
        const data = await response.json();
        
        if (data.success) {
          setGroups((prev) => [...prev, data.group]);
          onClose();
          reset();
        }
      } catch (err) {
        console.error("Failed to create group:", err);
      }
    },
    [onClose, reset]
  );

  const handleJoinDiscord = useCallback(() => {
    window.open("/discord.html", "_blank");
  }, []);

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
            onClick={onOpen}
            _hover={{
              backgroundColor: "#4f46e5",
            }}
            boxShadow="0 2px 8px rgba(99, 102, 241, 0.3)"
          >
            New Group
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
                backgroundColor={
                  selectedGroup?.id === group.id 
                    ? itemActiveBg 
                    : "transparent"
                }
                _hover={{ backgroundColor: itemHoverBg }}
                onClick={() => setSelectedGroup(group)}
                position="relative"
                role="group"
              >
                <HStack spacing={3}>
                  <Flex
                    width="32px"
                    height="32px"
                    borderRadius="lg"
                    backgroundColor={
                      selectedGroup?.id === group.id
                        ? accentColor
                        : useColorModeValue("gray.200", "gray.700")
                    }
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                  >
                    <Icon
                      as={TbUsers}
                      color={
                        selectedGroup?.id === group.id
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
                      {group.name}
                    </Text>
                    <Text fontSize="xs" color={textMuted} noOfLines={1}>
                      {group.totalMembers} member{group.totalMembers !== 1 ? 's' : ''}
                    </Text>
                  </Box>
                </HStack>
              </Box>
            ))}
          </Stack>

          {groups.length === 0 && (
            <Center py={8} px={4}>
              <VStack spacing={3} textAlign="center">
                <Icon as={TbSparkles} fontSize="3xl" color={textMuted} />
                <Text fontSize="sm" color={textMuted}>
                  No groups yet
                </Text>
                <Text fontSize="xs" color={textMuted}>
                  Create or join a study group
                </Text>
              </VStack>
            </Center>
          )}
        </Box>

        <Box p={3} borderTopWidth={1} borderColor={sidebarBorder}>
          <Text fontSize="xs" color={textMuted} textAlign="center">
            {groups.length} group{groups.length !== 1 ? 's' : ''}
          </Text>
        </Box>
      </Box>

      <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
        {selectedGroup ? (
          <Flex flex={1} direction="column" p={6}>
            <Stack spacing={4} mb={6}>
              <HStack justifyContent="space-between" alignItems="center">
                <HStack spacing={3}>
                  <Flex
                    width="48px"
                    height="48px"
                    borderRadius="lg"
                    backgroundColor={accentColor}
                    alignItems="center"
                    justifyContent="center"
                    boxShadow="0 2px 8px rgba(99, 102, 241, 0.3)"
                  >
                    <Icon as={TbUsers} color="white" fontSize="xl" />
                  </Flex>
                  <Box>
                    <Text fontSize="xl" fontWeight="600" color={textColor}>
                      {selectedGroup.name}
                    </Text>
                    <Text fontSize="sm" color={textMuted}>
                      {selectedGroup.subject || "General"} • {selectedGroup.totalMembers} members
                    </Text>
                  </Box>
                </HStack>
              </HStack>
              
              {selectedGroup.description && (
                <Text color={textColor}>{selectedGroup.description}</Text>
              )}
            </Stack>

            <Box
              flex={1}
              backgroundColor={useColorModeValue("gray.50", "gray.800")}
              borderRadius="xl"
              p={6}
            >
              <VStack spacing={4} align="stretch">
                <Text fontWeight="600" color={textColor}>
                  Group Features
                </Text>
                <Box
                  p={4}
                  borderRadius="lg"
                  backgroundColor={useColorModeValue("white", "gray.700")}
                  borderWidth={1}
                  borderColor={sidebarBorder}
                >
                  <HStack justifyContent="space-between">
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="500" color={textColor}>
                        Discussion Board
                      </Text>
                      <Text fontSize="sm" color={textMuted}>
                        Chat with group members
                      </Text>
                    </VStack>
                    <Icon as={TbMessageCircle} color={accentColor} />
                  </HStack>
                </Box>
              </VStack>
            </Box>
          </Flex>
        ) : (
          <Center flex={1} p={8}>
            <VStack spacing={6} maxWidth="500px" textAlign="center">
              <Flex
                width="100px"
                height="100px"
                borderRadius="2xl"
                backgroundColor={useColorModeValue("gray.100", "gray.800")}
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={TbUsers} fontSize="3xl" color={textMuted} />
              </Flex>
              
              <VStack spacing={2}>
                <Text fontSize="xl" fontWeight="600" color={textColor}>
                  Study Groups & Communities
                </Text>
                <Text fontSize="sm" color={textMuted}>
                  Connect with other learners, share goals, and stay accountable together
                </Text>
              </VStack>

              <Box
                width="100%"
                p={6}
                borderRadius="xl"
                backgroundColor={useColorModeValue("gray.50", "gray.800")}
                borderWidth={1}
                borderColor={sidebarBorder}
              >
                <VStack spacing={4}>
                  <Text fontWeight="600" color={textColor}>
                    Join Our Discord Community
                  </Text>
                  <Text fontSize="sm" color={textMuted}>
                    Connect with thousands of learners, join study groups, and get support
                  </Text>
                  <Button
                    rightIcon={<Icon as={TbExternalLink} />}
                    backgroundColor={accentColor}
                    color="white"
                    size="md"
                    onClick={handleJoinDiscord}
                    _hover={{
                      backgroundColor: "#4f46e5",
                    }}
                    boxShadow="0 2px 8px rgba(99, 102, 241, 0.3)"
                  >
                    Open Discord
                  </Button>
                </VStack>
              </Box>

              <Button
                leftIcon={<Icon as={TbPlus} />}
                backgroundColor={accentColor}
                color="white"
                size="sm"
                onClick={onOpen}
                _hover={{
                  backgroundColor: "#4f46e5",
                }}
              >
                Create New Group
              </Button>
            </VStack>
          </Center>
        )}
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <Flex
                width="40px"
                height="40px"
                borderRadius="lg"
                backgroundColor={accentColor}
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={TbSparkles} color="white" />
              </Flex>
              <Box>
                <Text fontSize="lg" fontWeight="600">Create New Group</Text>
                <Text fontSize="sm" fontWeight="normal" color={textMuted}>
                  Start a study group
                </Text>
              </Box>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4} py={4}>
              <FormControl isInvalid={errors?.name}>
                <Text fontSize="sm" fontWeight="500" mb={1}>
                  Group Name
                </Text>
                <Input
                  placeholder="e.g., Medical School Prep..."
                  {...register("name", { required: true })}
                  size="lg"
                />
              </FormControl>
              
              <FormControl>
                <Text fontSize="sm" fontWeight="500" mb={1}>
                  Subject
                </Text>
                <Input
                  placeholder="e.g., Medicine, Law, Engineering..."
                  {...register("subject")}
                  size="lg"
                />
              </FormControl>
              
              <FormControl>
                <Text fontSize="sm" fontWeight="500" mb={1}>
                  Description
                </Text>
                <Textarea
                  placeholder="Describe your study group..."
                  {...register("description")}
                  rows={4}
                />
              </FormControl>
            </Stack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              backgroundColor={accentColor}
              color="white"
              onClick={handleSubmit(onSubmit)}
              isLoading={isSubmitting}
              _hover={{
                backgroundColor: "#4f46e5",
              }}
            >
              Create Group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
}