/**
 * MessageInput - Input de mensagens com Chakra UI v3
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  HStack,
  Input,
  IconButton,
  Badge,
  Text,
  Flex,
} from '@chakra-ui/react';
import {
  Attachment,
} from '@chakra-ui/icons';

export interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
  onFileSelect?: (file: File) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  showAttachment?: boolean;
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
          bg="blue.50"
          borderRadius="md"
          align="center"
          justify="space-between"
        >
          <HStack>
            <Text>📎</Text>
            <Text fontSize="sm" truncate>{selectedFile.name}</Text>
            <Text fontSize="xs" color="gray.500">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</Text>
          </HStack>
          <IconButton
            aria-label="Remover arquivo"
            onClick={onClearFile}
            size="xs"
            variant="ghost"
          >
            ✕
          </IconButton>
        </Flex>
      )}

      <HStack gap={2} align="center">
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
            <IconButton
              aria-label="Anexar arquivo"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isLoading}
              variant="ghost"
            >
              <Attachment />
            </IconButton>
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
            disabled={disabled || isLoading}
            borderRadius="full"
            pr={isNearLimit ? 16 : 4}
            maxLength={maxLength}
          />
          
          {/* Character count */}
          {isNearLimit && (
            <Badge
              position="absolute"
              right={3}
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
        <IconButton
          aria-label="Enviar mensagem"
          onClick={handleSend}
          disabled={!text.trim() || disabled || isLoading}
          colorScheme="green"
          borderRadius="full"
          loading={isLoading}
        >
          ➤
        </IconButton>
      </HStack>
    </Box>
  );
};

export default MessageInput;
