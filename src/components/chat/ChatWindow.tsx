/**
 * ChatWindow - Interface de Chat WhatsApp com Chakra UI v3
 * Versão melhorada com UX/UI aprimorada
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  Box,
  Flex,
  Text,
  IconButton,
  Badge,
  Spinner,
  Stack,
  Separator,
  Avatar,
} from '@chakra-ui/react';

import { ContactList, Contact } from './ContactList';
import { MessageBubble, MessageBubbleProps } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { useWhatsAppWS, MessageReceivedEvent, StatusUpdatedEvent, TypingEvent, ConversationUpdatedEvent } from '../../hooks/useWhatsAppWS';
import { whatsappService, conversationsService, getErrorMessage } from '../../services';
import { handoverService } from '../../services/handover';
import { Message, Conversation } from '../../types';

// Type-safe helper to ensure value is array
function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export interface ChatWindowProps {
  accountId: string;
  accountName?: string;
  onConversationSelect?: (conversation: Conversation | null) => void;
}

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

const conversationToContact = (conv: Conversation): Contact => ({
  id: conv.id,
  phoneNumber: conv.phone_number,
  contactName: conv.contact_name || '',
  lastMessagePreview: '',
  lastMessageAt: conv.last_message_at ?? undefined,
  unreadCount: 0,
  status: conv.status,
  mode: conv.mode as 'auto' | 'human' | 'hybrid',
});

export const ChatWindow: React.FC<ChatWindowProps> = ({
  accountId,
  accountName,
  onConversationSelect,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingContacts, setTypingContacts] = useState<Set<string>>(new Set());
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom - only when needed
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const {
    isConnected,
    connectionError,
    subscribeToConversation,
    unsubscribeFromConversation,
    sendTypingIndicator,
    sendMessage,
  } = useWhatsAppWS({
    accountId,
    enabled: !!accountId,
    onMessageReceived: handleMessageReceived,
    onMessage: (msg) => {
      const convertedMsg: Message = {
        ...msg,
        timestamp: msg.created_at,
        account: accountId,
        updated_at: msg.created_at,
      } as unknown as Message;
      handleNewMessage(convertedMsg);
    },
    onStatusUpdated: handleStatusUpdated,
    onTyping: handleTyping,
    onConversationUpdated: handleConversationUpdated,
    onError: (event) => {
      toast.error(`Erro: ${event.error_message}`);
    },
  });

  const loadConversations = useCallback(async () => {
    if (!accountId) return;
    
    setIsLoadingConversations(true);
    try {
      const response = await conversationsService.getConversations({ account: accountId });
      setConversations(ensureArray<Conversation>(response?.results || response));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoadingConversations(false);
    }
  }, [accountId]);

  const loadMessages = useCallback(async () => {
    if (!selectedConversation || !accountId) return;
    
    setIsLoadingMessages(true);
    try {
      const historyRes = await whatsappService.getConversationHistory(
        accountId,
        selectedConversation.phone_number,
        100
      );
      const history = ensureArray<Message>((historyRes.data as { results?: Message[] })?.results || historyRes.data);
      setMessages(history.reverse());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoadingMessages(false);
    }
  }, [accountId, selectedConversation]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

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

  // Auto-scroll only for received messages, not for sent messages
  const handleAutoScroll = useCallback((isReceivedMessage: boolean = true) => {
    if (isReceivedMessage && shouldAutoScrollRef.current) {
      setTimeout(() => scrollToBottom(), 100);
    }
  }, [scrollToBottom]);

  // Detect user scroll to enable/disable auto-scroll
  const handleContainerScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      // If user scrolls up, disable auto-scroll. If at bottom, enable
      shouldAutoScrollRef.current = scrollHeight - (scrollTop + clientHeight) < 100;
    }
  }, []);

  function handleMessageReceived(event: MessageReceivedEvent) {
    const newMessage = event.message;
    
    if (selectedConversation && event.conversation_id === selectedConversation.id) {
      setMessages(prev => {
        if (prev.some(m => m.id === newMessage.id || m.whatsapp_message_id === newMessage.whatsapp_message_id)) {
          return prev;
        }
        return [...prev, newMessage as unknown as Message];
      });
      // Auto-scroll when receiving a message
      handleAutoScroll(true);
    }

    setConversations(prev => {
      const updated = prev.map(conv => {
        if (conv.id === event.conversation_id) {
          return {
            ...conv,
            last_message_at: newMessage.created_at,
          };
        }
        return conv;
      });
      return updated.sort((a, b) => {
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
    });

    if (!selectedConversation || event.conversation_id !== selectedConversation.id) {
      const contactName = event.contact?.name || newMessage.from_number;
      toast(`Nova mensagem de ${contactName}`, { icon: '💬' });
    }
  }

  function handleNewMessage(newMessage: Message) {
    if (selectedConversation && newMessage.conversation_id === selectedConversation.id) {
      setMessages(prev => {
        if (prev.some(m => m.id === newMessage.id || m.whatsapp_message_id === newMessage.whatsapp_message_id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
      // Auto-scroll for received messages
      if (newMessage.direction === 'inbound') {
        handleAutoScroll(true);
      }
    }
  }

  function handleStatusUpdated(event: StatusUpdatedEvent) {
    setMessages(prev => prev.map(msg => {
      if (msg.id === event.message_id || msg.whatsapp_message_id === event.whatsapp_message_id) {
        return {
          ...msg,
          status: event.status,
        };
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
      loadConversations();
      return prev;
    });
  }

  const handleSendMessage = async (text: string) => {
    if (!selectedConversation || !accountId) return;

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedConversation.id,
      account: accountId,
      text_body: text,
      direction: 'outbound',
      message_type: 'text',
      status: 'pending',
      created_at: new Date().toISOString(),
      whatsapp_message_id: '',
      from_number: '',
      to_number: selectedConversation.phone_number,
      timestamp: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as Message;

    // Add optimistic message without auto-scroll
    setMessages(prev => [...prev, optimisticMessage]);

    setIsSending(true);
    try {
      const messageRes = await whatsappService.sendTextMessage({
        account_id: accountId,
        to: selectedConversation.phone_number,
        text,
      });
      
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === optimisticMessage.id ? messageRes.data : m));
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      toast.error(getErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const handleTypingIndicator = (isTyping: boolean) => {
    if (selectedConversation) {
      sendTypingIndicator(selectedConversation.id, isTyping);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    const conversation = conversations.find(c => c.id === contact.id);
    setSelectedConversation(conversation || null);
  };

  const handleSwitchMode = async () => {
    if (!selectedConversation) return;

    try {
      const currentStatus = selectedConversation.mode === 'human' ? 'human' : 'bot';
      const res = await handoverService.toggle(selectedConversation.id, currentStatus);
      const newMode = res.handover_status === 'human' ? 'human' : 'auto';

      setSelectedConversation(prev => prev ? { ...prev, mode: newMode } : prev);
      setConversations(prev =>
        prev.map(c => c.id === selectedConversation.id ? { ...c, mode: newMode } : c)
      );
      toast.success(`Modo alterado para ${newMode === 'human' ? 'humano' : 'automático'}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const contacts: Contact[] = ensureArray<Conversation>(conversations).map(conv => ({
    ...conversationToContact(conv),
    isTyping: typingContacts.has(conv.id),
  }));

  const groupedMessages = ensureArray<Message>(messages).reduce((groups, message) => {
    // Verifica se created_at é válido antes de formatar
    if (!message.created_at) return groups;
    
    try {
      const date = format(new Date(message.created_at), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    } catch (e) {
      // Ignora mensagens com data inválida
      console.warn('Data inválida na mensagem:', message.id, message.created_at);
    }
    return groups;
  }, {} as Record<string, Message[]>);

  // Get initials for avatar
  const getInitials = (name?: string, phone?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return phone?.slice(-2) || '?';
  };

  return (
    <Flex 
      h="calc(100vh - 64px)"
      maxH="900px"
      w="100%"
      maxW="1400px"
      mx="auto"
      bg="bg.subtle"
      borderRadius="xl"
      overflow="hidden"
      boxShadow="xl"
      borderWidth="1px"
      borderColor="border.default"
    >
      {/* Contact list sidebar */}
      <Box 
        w={{ base: '100%', md: '360px' }}
        h="100%"
        bg="bg.default"
        borderRightWidth="1px"
        borderColor="border.default"
        display={{ base: selectedConversation ? 'none' : 'flex', md: 'flex' }}
        flexDirection="column"
      >
        <ContactList
          contacts={contacts}
          selectedContactId={selectedConversation?.id}
          onSelectContact={handleSelectContact}
          isLoading={isLoadingConversations}
          emptyMessage="Nenhuma conversa encontrada"
        />
      </Box>

      {/* Chat area */}
      <Flex 
        flex={1} 
        flexDirection="column"
        bg="bg.muted"
        display={{ base: selectedConversation ? 'flex' : 'none', md: 'flex' }}
      >
        {!selectedConversation ? (
          // Empty state
          <Flex 
            flex={1} 
            align="center" 
            justify="center" 
            direction="column"
            gap={6}
            p={8}
            bg="bg.default"
          >
            <Box 
              p={8}
              borderRadius="full"
              bg="green.50"
              _dark={{ bg: 'green.900' }}
            >
              <Text fontSize="6xl">💬</Text>
            </Box>
            
            <Stack gap={2} textAlign="center">
              <Text fontSize="2xl" fontWeight="bold">
                {accountName || 'WhatsApp Business'}
              </Text>
              <Text color="fg.muted" maxW="400px">
                Selecione uma conversa ao lado para começar a atender seus clientes
              </Text>
            </Stack>
            
            {!isConnected && (
              <Badge colorPalette="red" variant="solid" size="lg">
                ⚠️ Desconectado
              </Badge>
            )}
          </Flex>
        ) : (
          <>
            {/* Chat Header */}
            <Flex 
              px={4}
              py={3}
              bg="bg.default"
              borderBottomWidth="1px"
              borderColor="border.default"
              justify="space-between"
              align="center"
            >
              <Flex gap={3} align="center">
                <Avatar.Root 
                  size="md"
                  colorPalette={selectedConversation.mode === 'human' ? 'blue' : 'green'}
                >
                  <Avatar.Fallback>
                    {getInitials(
                      selectedConversation.contact_name,
                      selectedConversation.phone_number
                    )}
                  </Avatar.Fallback>
                </Avatar.Root>
                
                <Stack gap={0} align="flex-start">
                  <Text fontWeight="semibold" fontSize="md">
                    {selectedConversation.contact_name || selectedConversation.phone_number}
                  </Text>
                  <Flex gap={2} align="center">
                    {typingContacts.has(selectedConversation.id) ? (
                      <Text fontSize="sm" color="green.500" fontWeight="medium">
                        digitando...
                      </Text>
                    ) : (
                      <Text fontSize="sm" color="fg.muted">
                        {isConnected ? '🟢 Online' : '🔴 Offline'}
                      </Text>
                    )}
                  </Flex>
                </Stack>
              </Flex>

              <Flex gap={2} align="center">
                <Badge 
                  colorPalette={selectedConversation.mode === 'human' ? 'blue' : 'green'}
                  variant="subtle"
                  size="md"
                  cursor="pointer"
                  onClick={handleSwitchMode}
                  _hover={{ opacity: 0.8 }}
                >
                  {selectedConversation.mode === 'human' ? '👤 Humano' : '🤖 Auto'}
                </Badge>

                <IconButton
                  aria-label="Atualizar"
                  variant="ghost"
                  size="sm"
                  onClick={loadMessages}
                  loading={isLoadingMessages}
                >
                  🔄
                </IconButton>
              </Flex>
            </Flex>

            {/* Connection Error Banner */}
            {connectionError && (
              <Flex 
                px={4}
                py={2}
                bg="yellow.50"
                _dark={{ bg: 'yellow.900' }}
                borderBottomWidth="1px"
                borderColor="yellow.200"
                align="center"
                gap={2}
              >
                <Text fontSize="sm" color="yellow.700">
                  ⚠️ {connectionError}
                </Text>
              </Flex>
            )}

            {/* Messages Area */}
            <Stack
              ref={messagesContainerRef}
              flex={1}
              overflowY="auto"
              onScroll={handleContainerScroll}
              p={4}
              gap={4}
              bg="bg.muted"
            >
              {isLoadingMessages ? (
                <Flex flex={1} align="center" justify="center">
                  <Spinner size="xl" color="green.500" />
                </Flex>
              ) : messages.length === 0 ? (
                <Flex 
                  flex={1}
                  direction="column"
                  align="center"
                  justify="center"
                  gap={4}
                  color="fg.muted"
                >
                  <Text fontSize="5xl">👋</Text>
                  <Text fontSize="lg">Inicie a conversa</Text>
                  <Text fontSize="sm" textAlign="center" maxW="300px">
                    Envie uma mensagem para começar o atendimento
                  </Text>
                </Flex>
              ) : (
                Object.entries(groupedMessages).map(([date, dayMessages]) => (
                  <Stack key={date} gap={4}>
                    {/* Date separator */}
                    <Flex align="center" justify="center">
                      <Badge 
                        variant="subtle" 
                        size="sm"
                        borderRadius="full"
                        px={3}
                      >
                        {(() => {
                          try {
                            return format(new Date(date), "d 'de' MMMM", { locale: ptBR });
                          } catch (e) {
                            return date;
                          }
                        })()}
                      </Badge>
                    </Flex>
                    
                    {/* Messages */}
                    <Stack gap={2}>
                      {dayMessages.map((message) => (
                        <MessageBubble 
                          key={message.id} 
                          {...messageToBubbleProps(message)} 
                        />
                      ))}
                    </Stack>
                  </Stack>
                ))
              )}
              <div ref={messagesEndRef} />
            </Stack>

            {/* Message Input */}
            <Box 
              p={4}
              bg="bg.default"
              borderTopWidth="1px"
              borderColor="border.default"
            >
              <MessageInput
                onSend={handleSendMessage}
                onTyping={handleTypingIndicator}
                disabled={!isConnected}
                isLoading={isSending}
                placeholder={isConnected ? 'Digite uma mensagem...' : 'Conectando...'}
              />
            </Box>
          </>
        )}
      </Flex>
    </Flex>
  );
};

export default ChatWindow;
