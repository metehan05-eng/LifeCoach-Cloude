import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  HStack,
  Icon,
  IconButton,
  Spinner,
  Text,
  Textarea,
  useColorModeValue,
} from "@chakra-ui/react";
import { TbSend, TbMoodSmile } from "react-icons/tb";
import autosize from "autosize";
import { BeatLoader } from "react-spinners";

export default function ChatInput({ isLoading, onSubmit, ...properties }) {
  const backgroundColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const focusBorderColor = useColorModeValue("#6366f1", "#818cf8");
  const textColor = useColorModeValue("gray.700", "gray.100");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");
  const buttonColor = useColorModeValue("#6366f1", "#818cf8");
  const iconColor = useColorModeValue("gray.500", "gray.400");
  
  const [message, setMessage] = useState("");
  const textareaReference = useRef();

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        if (message && message.trim()) {
          onSubmit(message);
          setMessage("");

          autosize.destroy(textareaReference?.current);
        }
      }
    },
    [message, onSubmit]
  );

  const handleSubmit = () => {
    if (message && message.trim()) {
      onSubmit(message);
      setMessage("");
      autosize.destroy(textareaReference?.current);
    }
  };

  useEffect(() => {
    const ref = textareaReference?.current;
    autosize(ref);
    return () => {
      autosize.destroy(ref);
    };
  }, []);

  useEffect(() => {
    const ref = textareaReference?.current;
    if (!isLoading) {
      ref?.focus();
    }
  }, [isLoading]);

  return (
    <Box 
      {...properties} 
      backgroundColor={backgroundColor}
      borderTopWidth={1}
      borderColor={borderColor}
      paddingX={4}
      paddingY={4}
    >
      <Box 
        maxWidth="4xl" 
        marginX="auto"
        backgroundColor={useColorModeValue("gray.50", "gray.750")}
        borderRadius="xl"
        borderWidth={1}
        borderColor={borderColor}
        overflow="hidden"
        transition="all 0.2s"
        _focusWithin={{
          borderColor: focusBorderColor,
          boxShadow: `0 0 0 3px ${useColorModeValue("rgba(99, 102, 241, 0.1)", "rgba(129, 140, 248, 0.1)")}`
        }}
      >
        <Textarea
          ref={textareaReference}
          isDisabled={isLoading}
          autoFocus={!isLoading && true}
          variant="unstyled"
          value={message}
          fontWeight={400}
          placeholder="Send a message to AI Assistant..."
          onKeyDown={handleKeyDown}
          backgroundColor="transparent"
          onChange={(event) => setMessage(event.target.value)}
          flex={1}
          rows={1}
          size="md"
          outline="none"
          resize="none"
          paddingX={4}
          paddingY={3}
          color={textColor}
          _placeholder={{ color: placeholderColor }}
        />
        <HStack 
          justifyContent="space-between" 
          alignItems="center"
          paddingX={3}
          paddingBottom={2}
        >
          <HStack spacing={1}>
            <Text fontSize="xs" color="gray.400">
              Enter to send • Shift + Enter for new line
            </Text>
          </HStack>
          {isLoading ? (
            <HStack spacing={2}>
              <Spinner size="sm" color="#6366f1" />
              <Text fontSize="xs" color="gray.400">Processing...</Text>
            </HStack>
          ) : (
            <IconButton
              alignSelf="flex-end"
              variant="ghost"
              size="sm"
              borderRadius="lg"
              onClick={handleSubmit}
              isDisabled={!message || !message.trim()}
              icon={<Icon as={TbSend} color={message && message.trim() ? buttonColor : iconColor} />}
              _hover={{
                backgroundColor: useColorModeValue("gray.100", "gray.650"),
              }}
              transition="all 0.2s"
            />
          )}
        </HStack>
      </Box>
    </Box>
  );
}

ChatInput.propTypes = {
  isLoading: PropTypes.bool,
  onSubmit: PropTypes.func,
};
