/**
 * MessageInput - Input de mensagens com Chakra UI
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  HStack,
  Input,
  IconButton,
  Tooltip,
  useColorModeValue,
  Badge,
  Text,
  Flex,
} from '@chakra-ui/react';
import {
  AttachmentIcon,
  ChatIcon,
} from '@chakra-ui/icons';

export interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
  onFileSelect?: (file: File) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  showAttachment?: boolean;
  onAttachmentClick?: () => void;
  maxLength?: number;
  selectedFile?: File | null;
  onClearFile?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTyping,
  onFileSelect,
  placeholder = 'Digite uma mensagem...',
  disabled = false,
  isLoading = false,
  showAttachment = true,
  maxLength = 4096,
  selectedFile,
  onClearFile,
}) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wasTypingRef = useRef(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Auto-focus
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!wasTypingRef.current) {
      wasTypingRef.current = true;
      onTyping?.(true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      wasTypingRef.current = false;
      onTyping?.(false);
    }, 2000);
  }, [onTyping]);

  // Send message
  const handleSend = () => {
    const trimmedText = text.trim();
    if (!trimmedText || disabled || isLoading) return;

    onSend(trimmedText);
    setText('');
    
    // Clear typing indicator
    clearTimeout(typingTimeoutRef.current);
    wasTypingRef.current = false;
    onTyping?.(false);
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect?.(file);
    }
    // Reset input
    e.target.value = '';
  };

  const charCount = text.length;
  const isNearLimit = charCount > maxLength * 0.9;

  return (
    <Box w="full">
      {/* Selected file preview */}
      {selectedFile && (
        <Flex 
          mb={2} 
          p={2} 
          bg={useColorModeValue('blue.50', 'blue.900')} 
          borderRadius="md"
          align="center"
          justify="space-between"
        >
          <HStack>
            <Text>📎</Text>
            <Text fontSize="sm" noOfLines={1}>
              {selectedFile.name}
            </Text>
            <Text fontSize="xs" color="gray.500">
              ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </Text>
          </HStack>
          <IconButton
            aria-label="Remover arquivo"
            icon={<Text>✕</Text>}
            size="xs"
            variant="ghost"
            onClick={onClearFile}
          />
        </Flex>
      )}

      <HStack spacing={2} align="center">
        {/* File attachment */}
        {showAttachment && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            />
            <Tooltip label="Anexar arquivo">
              <IconButton
                aria-label="Anexar arquivo"
                icon={<AttachmentIcon />}
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                isDisabled={disabled || isLoading}
              />
            </Tooltip>
          </>
        )}

        {/* Text input */}
        <Box flex={1} position="relative">
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            isDisabled={disabled || isLoading}
            bg={bgColor}
            borderColor={borderColor}
            borderRadius="full"
            pr={12}
            maxLength={maxLength}
          />
          
          {/* Character count */}
          {isNearLimit && (
            <Badge
              position="absolute"
              right={14}
              top="50%"
              transform="translateY(-50%)"
              colorScheme={charCount >= maxLength ? 'red' : 'orange'}
              fontSize="xs"
            >
              {charCount}/{maxLength}
            </Badge>
          )}
        </Box>

        {/* Send button */}
        <Tooltip label="Enviar">
          <IconButton
            aria-label="Enviar mensagem"
            icon={isLoading ? <Text>⏳</Text> : <Text>➤</Text>}
            colorScheme="green"
            onClick={handleSend}
            isDisabled={!text.trim() || disabled || isLoading}
            borderRadius="full"
            isLoading={isLoading}
          />
        </Tooltip>
      </HStack>
    </Box>
  );
};

export default MessageInput;
