import React, { useRef } from "react";
import {
  Avatar,
  Box,
  Code,
  HStack,
  Icon,
  IconButton,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import remarkGfm from "remark-gfm";
import PropTypes from "prop-types";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { BeatLoader } from "react-spinners";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import { TbCopy } from "react-icons/tb";
import { MemoizedReactMarkdown } from "@/lib/markdown";

export default function Message({ agent, message, isLastMessage }) {
  const loaderColor = useColorModeValue("#6366f1", "#818cf8");
  const lastMessageReference = useRef();
  const isAi = agent === "ai";
  
  const userBackgroundColor = useColorModeValue("transparent", "transparent");
  const aiBackgroundColor = useColorModeValue("gray.50", "gray.800");
  const aiHoverBackgroundColor = useColorModeValue("gray.100", "gray.750");
  const userTextColor = useColorModeValue("gray.800", "white");
  const aiTextColor = useColorModeValue("gray.800", "gray.100");
  const codeBlockBg = useColorModeValue("#1e1e1e", "#1a1a1a");

  return (
    <Box
      ref={isLastMessage ? lastMessageReference : undefined}
      backgroundColor={isAi ? aiBackgroundColor : userBackgroundColor}
      padding={4}
      _hover={{ 
        backgroundColor: aiHoverBackgroundColor
      }}
      transition="background-color 0.2s"
    >
      <HStack spacing={4} maxWidth="4xl" marginX="auto" alignItems="flex-start">
        <Avatar
          borderRadius="full"
          src={isAi ? "/chatbot.png" : undefined}
          name={!isAi ? "You" : undefined}
          size="sm"
          alignSelf="flex-start"
          backgroundColor={isAi ? "transparent" : "#6366f1"}
          color={isAi ? "transparent" : "white"}
          fontWeight="bold"
          boxShadow={isAi ? "none" : "0 2px 8px rgba(99, 102, 241, 0.4)"}
        />
        <Stack spacing={2} flex={1} maxWidth="calc(100% - 60px)">
          <HStack spacing={2} alignItems="center">
            <Text 
              fontSize="xs" 
              fontWeight="600" 
              color={isAi ? "#6366f1" : "#6366f1"}
              textTransform="uppercase"
              letterSpacing="0.5px"
            >
              {isAi ? "AI Assistant" : "You"}
            </Text>
          </HStack>
          {message ? (
            <Box 
              fontSize="sm" 
              color={isAi ? aiTextColor : userTextColor}
              lineHeight="1.7"
            >
              <MemoizedReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const value = String(children).replace(/\n$/, "");
                    const match = /language-(\w+)/.exec(className || "");

                    const handleCopyCode = () => {
                      navigator.clipboard.writeText(value);
                    };

                    return !inline ? (
                      <Box position="relative" my={3}>
                        <HStack 
                          position="absolute" 
                          top={2} 
                          right={2} 
                          zIndex={1}
                          backgroundColor={codeBlockBg}
                          borderRadius="md"
                          paddingX={2}
                          paddingY={1}
                        >
                          <Text fontSize="xs" color="gray.400">
                            {match && match[1]}
                          </Text>
                          <IconButton
                            size="xs"
                            variant="ghost"
                            icon={<Icon as={TbCopy} fontSize="sm" color="gray.400" />}
                            onClick={() => handleCopyCode()}
                            _hover={{ backgroundColor: "gray.700" }}
                          />
                        </HStack>
                        <SyntaxHighlighter
                          customStyle={{
                            fontSize: "13px",
                            borderRadius: "8px",
                            padding: "16px",
                          }}
                          codeTagProps={{
                            style: {
                              lineHeight: "1.6",
                              fontSize: "inherit",
                            },
                          }}
                          style={dracula}
                          language={(match && match[1]) || "text"}
                        >
                          {value}
                        </SyntaxHighlighter>
                      </Box>
                    ) : (
                      <Code 
                        fontSize="sm" 
                        className={className} 
                        {...props}
                        backgroundColor={useColorModeValue("gray.100", "gray.700")}
                        color={useColorModeValue("#dc2626", "#f87171")}
                        px={2}
                        py={0.5}
                        borderRadius="md"
                      >
                        {children}
                      </Code>
                    );
                  },
                  p({ node, ...props }) {
                    return <Text {...props} mb={3} />;
                  },
                  ul({ node, ...props }) {
                    return <Box as="ul" pl={6} mb={3} {...props} />;
                  },
                  ol({ node, ...props }) {
                    return <Box as="ol" pl={6} mb={3} {...props} />;
                  },
                  li({ node, ...props }) {
                    return <Box as="li" mb={1} {...props} />;
                  },
                  h1({ node, ...props }) {
                    return <Text as="h1" fontSize="xl" fontWeight="bold" mb={3} mt={4} {...props} />;
                  },
                  h2({ node, ...props }) {
                    return <Text as="h2" fontSize="lg" fontWeight="bold" mb={3} mt={3} {...props} />;
                  },
                  h3({ node, ...props }) {
                    return <Text as="h3" fontSize="md" fontWeight="bold" mb={2} mt={2} {...props} />;
                  },
                  blockquote({ node, ...props }) {
                    return (
                      <Box 
                        as="blockquote" 
                        borderLeftWidth={4}
                        borderLeftColor="#6366f1"
                        pl={4}
                        py={2}
                        my={3}
                        bg={useColorModeValue("gray.50", "gray.800")}
                        borderRadius="0 8px 8px 0"
                        {...props} 
                      />
                    );
                  },
                }}
                remarkPlugins={[remarkGfm]}
              >
                {message}
              </MemoizedReactMarkdown>
            </Box>
          ) : (
            <HStack spacing={2}>
              <BeatLoader color={loaderColor} size={6} />
              <Text fontSize="xs" color="gray.400">Thinking...</Text>
            </HStack>
          )}
        </Stack>
      </HStack>
    </Box>
  );
}

Message.propTypes = {
  agent: PropTypes.string,
  message: PropTypes.string,
  isLastMessage: PropTypes.bool,
};
