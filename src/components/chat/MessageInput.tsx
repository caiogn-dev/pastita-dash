/**
 * MessageInput - Chat message input with send button
 * 
 * Features:
 * - Auto-expanding textarea
 * - Send on Enter (Shift+Enter for new line)
 * - Typing indicator support
 * - Emoji picker (optional)
 * - Attachment button (optional)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline';

export interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  showAttachment?: boolean;
  showEmoji?: boolean;
  onAttachmentClick?: () => void;
  maxLength?: number;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onTyping,
  placeholder = 'Digite uma mensagem...',
  disabled = false,
  isLoading = false,
  showAttachment = false,
  showEmoji = false,
  onAttachmentClick,
  maxLength = 4096,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<number | undefined>(undefined);
  const wasTypingRef = useRef(false);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!onTyping) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    // Send typing start if not already typing
    if (!wasTypingRef.current) {
      wasTypingRef.current = true;
      onTyping(true);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = window.setTimeout(() => {
      wasTypingRef.current = false;
      onTyping(false);
    }, 2000);
  }, [onTyping]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (wasTypingRef.current && onTyping) {
        onTyping(false);
      }
    };
  }, [onTyping]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setText(value);
      handleTyping();
    }
  };

  const handleSend = () => {
    const trimmedText = text.trim();
    if (trimmedText && !disabled && !isLoading) {
      onSend(trimmedText);
      setText('');
      
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (wasTypingRef.current && onTyping) {
        wasTypingRef.current = false;
        onTyping(false);
      }

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = text.trim().length > 0 && !disabled && !isLoading;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-end gap-2">
        {/* Attachment button */}
        {showAttachment && (
          <button
            type="button"
            onClick={onAttachmentClick}
            disabled={disabled}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 transition-colors"
            title="Anexar arquivo"
          >
            <PaperClipIcon className="w-6 h-6" />
          </button>
        )}

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={`
              w-full resize-none rounded-2xl border border-gray-300 dark:border-gray-600
              bg-gray-50 dark:bg-gray-700 px-4 py-3 pr-12
              text-sm text-gray-900 dark:text-white
              placeholder-gray-400 dark:placeholder-gray-500
              focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all
            `}
            style={{ maxHeight: '150px' }}
          />
          
          {/* Character count (shown when near limit) */}
          {text.length > maxLength * 0.8 && (
            <span className={`absolute right-14 bottom-3 text-xs ${text.length >= maxLength ? 'text-red-500' : 'text-gray-400'}`}>
              {text.length}/{maxLength}
            </span>
          )}
        </div>

        {/* Emoji button */}
        {showEmoji && (
          <button
            type="button"
            disabled={disabled}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 transition-colors"
            title="Emoji"
          >
            <FaceSmileIcon className="w-6 h-6" />
          </button>
        )}

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={`
            p-3 rounded-full transition-all
            ${canSend
              ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-md hover:shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }
          `}
          title="Enviar mensagem"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <PaperAirplaneIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Hint text */}
      <p className="text-xs text-gray-400 mt-2 text-center">
        Pressione Enter para enviar, Shift+Enter para nova linha
      </p>
    </div>
  );
};

export default MessageInput;
