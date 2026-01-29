/**
 * ChatWindow - Main chat interface component
 * 
 * Combines ContactList, MessageBubble, and MessageInput into a complete
 * WhatsApp-style chat interface with real-time updates.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  UserIcon,
  CpuChipIcon,
  WifiIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import { ContactList, Contact } from './ContactList';
import { MessageBubble, MessageBubbleProps } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { useWhatsAppWS, MessageReceivedEvent, StatusUpdatedEvent, TypingEvent, ConversationUpdatedEvent } from '../../hooks/useWhatsAppWS';
import { whatsappService, conversationsService, getErrorMessage } from '../../services';
import { Message, Conversation } from '../../types';

export interface ChatWindowProps {
  accountId: string;
  accountName?: string;
  onConversationSelect?: (conversation: Conversation | null) => void;
}

// Convert API message to bubble props
const messageToBubbleProps = (msg: Message): MessageBubbleProps => ({
  id: msg.id,
  direction: msg.direction as 'inbound' | 'outbound',
  messageType: msg.message_type,
  status: msg.status as 'pending' | 'sent' | 'delivered' | 'read' | 'failed',
  textBody: msg.text_body,
  content: msg.content,
  mediaUrl: msg.media_url,
  createdAt: msg.created_at,
  sentAt: msg.sent_at ?? undefined,
  deliveredAt: msg.delivered_at ?? undefined,
  readAt: msg.read_at ?? undefined,
  errorMessage: msg.error_message,
});

// Convert API conversation to contact
const conversationToContact = (conv: Conversation): Contact => ({
  id: conv.id,
  phoneNumber: conv.phone_number,
  contactName: conv.contact_name || '',
  lastMessagePreview: '', // Will be updated from messages
  lastMessageAt: conv.last_message_at ?? undefined,
  unreadCount: 0, // TODO: Calculate from messages
  status: conv.status,
  mode: conv.mode as 'auto' | 'human' | 'hybrid',
});

export const ChatWindow: React.FC<ChatWindowProps> = ({
  accountId,
  accountName,
  onConversationSelect,
}) => {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingContacts, setTypingContacts] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // WebSocket connection
  const {
    isConnected,
    connectionError,
    subscribeToConversation,
    unsubscribeFromConversation,
    sendTypingIndicator,
  } = useWhatsAppWS({
    accountId,
    enabled: !!accountId,
    onMessageReceived: handleMessageReceived,
    onStatusUpdated: handleStatusUpdated,
    onTyping: handleTyping,
    onConversationUpdated: handleConversationUpdated,
    onError: (event) => {
      toast.error(`Erro: ${event.error_message}`);
    },
  });

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!accountId) return;
    
    setIsLoadingConversations(true);
    try {
      const response = await conversationsService.getConversations({ account: accountId });
      setConversations(response.results);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoadingConversations(false);
    }
  }, [accountId]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async () => {
    if (!selectedConversation || !accountId) return;
    
    setIsLoadingMessages(true);
    try {
      const history = await whatsappService.getConversationHistory(
        accountId,
        selectedConversation.phone_number,
        100
      );
      // Reverse to show oldest first
      setMessages(history.reverse());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoadingMessages(false);
    }
  }, [accountId, selectedConversation]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      subscribeToConversation(selectedConversation.id);
      onConversationSelect?.(selectedConversation);
    } else {
      setMessages([]);
      onConversationSelect?.(null);
    }

    return () => {
      if (selectedConversation) {
        unsubscribeFromConversation(selectedConversation.id);
      }
    };
  }, [selectedConversation, loadMessages, subscribeToConversation, unsubscribeFromConversation, onConversationSelect]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket event handlers
  function handleMessageReceived(event: MessageReceivedEvent) {
    const newMessage = event.message;
    
    console.log('[ChatWindow] Message received via WebSocket:', {
      message_id: newMessage.id,
      conversation_id: event.conversation_id,
      from: newMessage.from_number,
      direction: newMessage.direction,
      text: newMessage.text_body?.substring(0, 50),
    });

    // Add to messages if it's for the current conversation
    if (selectedConversation && event.conversation_id === selectedConversation.id) {
      setMessages(prev => {
        // Check for duplicate by id or whatsapp_message_id
        const isDuplicate = prev.some(m => 
          m.id === newMessage.id || 
          (m.whatsapp_message_id && m.whatsapp_message_id === newMessage.whatsapp_message_id)
        );
        
        if (isDuplicate) {
          console.log('[ChatWindow] Duplicate message ignored:', newMessage.id);
          return prev;
        }
        
        console.log('[ChatWindow] Adding new message to current conversation');
        return [...prev, newMessage as unknown as Message];
      });
    }

    // Update conversation list
    setConversations(prev => {
      const conversationExists = prev.some(c => c.id === event.conversation_id);
      
      if (!conversationExists && event.conversation_id) {
        // New conversation - reload the list to get full data
        console.log('[ChatWindow] New conversation detected, reloading list');
        loadConversations();
        return prev;
      }
      
      const updated = prev.map(conv => {
        if (conv.id === event.conversation_id) {
          return {
            ...conv,
            last_message_at: newMessage.created_at,
          };
        }
        return conv;
      });
      
      // Sort by last message
      return updated.sort((a, b) => {
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
    });

    // Show notification if not current conversation
    if (!selectedConversation || event.conversation_id !== selectedConversation.id) {
      const contactName = event.contact?.name || newMessage.from_number;
      toast(`Nova mensagem de ${contactName}`, { icon: '💬' });
    }
  }

  function handleStatusUpdated(event: StatusUpdatedEvent) {
    console.log('[ChatWindow] Status update received:', {
      message_id: event.message_id,
      whatsapp_message_id: event.whatsapp_message_id,
      status: event.status,
      timestamp: event.timestamp,
    });
    
    setMessages(prev => prev.map(msg => {
      // Match by internal id or whatsapp_message_id
      const isMatch = msg.id === event.message_id || 
        (event.whatsapp_message_id && msg.whatsapp_message_id === event.whatsapp_message_id);
      
      if (isMatch) {
        console.log('[ChatWindow] Updating message status:', msg.id, '->', event.status);
        
        // Update status and relevant timestamp
        const updates: Partial<Message> = { status: event.status };
        
        if (event.status === 'delivered' && event.timestamp) {
          updates.delivered_at = event.timestamp;
        } else if (event.status === 'read' && event.timestamp) {
          updates.read_at = event.timestamp;
        }
        
        return { ...msg, ...updates };
      }
      return msg;
    }));
  }

  function handleTyping(event: TypingEvent) {
    setTypingContacts(prev => {
      const next = new Set(prev);
      if (event.is_typing) {
        next.add(event.conversation_id);
      } else {
        next.delete(event.conversation_id);
      }
      return next;
    });
  }

  function handleConversationUpdated(event: ConversationUpdatedEvent) {
    // Convert WhatsAppConversation to Conversation-like object
    const wsConv = event.conversation;
    
    setConversations(prev => {
      const exists = prev.some(c => c.id === wsConv.id);
      if (exists) {
        return prev.map(c => {
          if (c.id === wsConv.id) {
            return {
              ...c,
              phone_number: wsConv.phone_number,
              contact_name: wsConv.contact_name,
              status: wsConv.status as Conversation['status'],
              mode: wsConv.mode as Conversation['mode'],
            };
          }
          return c;
        });
      }
      // For new conversations, we need to reload to get full data
      loadConversations();
      return prev;
    });
  }

  // Send message
  const handleSendMessage = async (text: string) => {
    if (!selectedConversation || !accountId) return;

    setIsSending(true);
    try {
      const message = await whatsappService.sendTextMessage({
        account_id: accountId,
        to: selectedConversation.phone_number,
        text,
      });
      
      // Add to messages (optimistic update)
      setMessages(prev => [...prev, message]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  // Handle typing indicator
  const handleTypingIndicator = (isTyping: boolean) => {
    if (selectedConversation) {
      sendTypingIndicator(selectedConversation.id, isTyping);
    }
  };

  // Select contact
  const handleSelectContact = (contact: Contact) => {
    const conversation = conversations.find(c => c.id === contact.id);
    setSelectedConversation(conversation || null);
  };

  // Switch conversation mode
  const handleSwitchMode = async () => {
    if (!selectedConversation) return;

    try {
      const newMode = selectedConversation.mode === 'human' ? 'auto' : 'human';
      const updated = newMode === 'human'
        ? await conversationsService.switchToHuman(selectedConversation.id)
        : await conversationsService.switchToAuto(selectedConversation.id);
      
      setSelectedConversation(updated);
      setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
      toast.success(`Modo alterado para ${newMode === 'human' ? 'humano' : 'automático'}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // Convert conversations to contacts
  const contacts: Contact[] = conversations.map(conv => ({
    ...conversationToContact(conv),
    isTyping: typingContacts.has(conv.id),
  }));

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className="flex h-full bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg">
      {/* Contact list sidebar */}
      <div className="w-80 flex-shrink-0">
        <ContactList
          contacts={contacts}
          selectedContactId={selectedConversation?.id}
          onSelectContact={handleSelectContact}
          isLoading={isLoadingConversations}
          emptyMessage="Nenhuma conversa encontrada"
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {!selectedConversation ? (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white dark:bg-gray-800">
            <ChatBubbleLeftRightIcon className="w-20 h-20 mb-4 opacity-50" />
            <h3 className="text-xl font-medium mb-2">Selecione uma conversa</h3>
            <p className="text-sm">Escolha uma conversa da lista para começar</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {selectedConversation.contact_name || selectedConversation.phone_number}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedConversation.phone_number}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Connection status */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  isConnected 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  <WifiIcon className="w-3 h-3" />
                  {isConnected ? 'Online' : 'Offline'}
                </div>

                {/* Mode toggle */}
                <button
                  onClick={handleSwitchMode}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedConversation.mode === 'human'
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                  }`}
                >
                  {selectedConversation.mode === 'human' ? (
                    <>
                      <UserIcon className="w-4 h-4" />
                      Humano
                    </>
                  ) : (
                    <>
                      <CpuChipIcon className="w-4 h-4" />
                      Auto
                    </>
                  )}
                </button>

                {/* Refresh button */}
                <button
                  onClick={loadMessages}
                  disabled={isLoadingMessages}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 transition-colors"
                  title="Atualizar mensagens"
                >
                  <ArrowPathIcon className={`w-5 h-5 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Connection error banner */}
            {connectionError && (
              <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-sm">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {connectionError}
              </div>
            )}

            {/* Messages area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
            >
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <ChatBubbleLeftRightIcon className="w-12 h-12 mb-2" />
                  <p>Nenhuma mensagem ainda</p>
                  <p className="text-sm">Envie a primeira mensagem!</p>
                </div>
              ) : (
                Object.entries(groupedMessages).map(([date, dayMessages]) => (
                  <div key={date}>
                    {/* Date separator */}
                    <div className="flex items-center justify-center my-4">
                      <span className="px-3 py-1 bg-white dark:bg-gray-700 rounded-full text-xs text-gray-500 dark:text-gray-400 shadow-sm">
                        {format(new Date(date), "d 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                    {/* Messages for this date */}
                    {dayMessages.map((message) => (
                      <MessageBubble key={message.id} {...messageToBubbleProps(message)} />
                    ))}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <MessageInput
              onSend={handleSendMessage}
              onTyping={handleTypingIndicator}
              disabled={!isConnected}
              isLoading={isSending}
              placeholder={isConnected ? 'Digite uma mensagem...' : 'Conectando...'}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
