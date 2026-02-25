/**
 * ChatWindow - Interface de Chat WhatsApp com Chakra UI v3
 * 
 * Baseado na versão estável original, migrado para Chakra UI v3
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
} from '@chakra-ui/react';

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  const loadMessages = useCallback(async () => {
    if (!selectedConversation || !accountId) return;
    
    setIsLoadingMessages(true);
    try {
      const history = await whatsappService.getConversationHistory(
        accountId,
        selectedConversation.phone_number,
        100
      );
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleMessageReceived(event: MessageReceivedEvent) {
    const newMessage = event.message;
    
    if (selectedConversation && event.conversation_id === selectedConversation.id) {
      setMessages(prev => {
        if (prev.some(m => m.id === newMessage.id || m.whatsapp_message_id === newMessage.whatsapp_message_id)) {
          return prev;
        }
        return [...prev, newMessage as unknown as Message];
      });
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

    setIsSending(true);
    try {
      const message = await whatsappService.sendTextMessage({
        account_id: accountId,
        to: selectedConversation.phone_number,
        text,
      });
      
      setMessages(prev => [...prev, message]);
    } catch (error) {
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

  const contacts: Contact[] = conversations.map(conv => ({
    ...conversationToContact(conv),
    isTyping: typingContacts.has(conv.id),
  }));

  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <Flex 
      h="full" 
      bg="gray.50" 
      borderRadius="lg" 
      overflow="hidden" 
      boxShadow="lg"
    >
      {/* Contact list sidebar */}
      <Box w="320px" flexShrink={0}>
        <ContactList
          contacts={contacts}
          selectedContactId={selectedConversation?.id}
          onSelectContact={handleSelectContact}
          isLoading={isLoadingConversations}
          emptyMessage="Nenhuma conversa encontrada"
        />
      </Box>

      {/* Chat area */}
      <Flex flex={1} flexDirection="column">
        {!selectedConversation ? (
          // Empty state
          <Flex 
            flex={1} 
            align="center" 
            justify="center" 
            direction="column"
            bg="white"
            color="gray.400"
          >
            <Text fontSize="6xl" mb={4}>💬</Text>
            <Text fontSize="xl" fontWeight="medium" mb={2}>Selecione uma conversa</Text>
            <Text fontSize="sm">Escolha uma conversa da lista para começar</Text>
          </Flex>
        ) : (
          <>
            {/* Chat header */}
            <Flex 
              align="center" 
              justify="space-between" 
              px={4} 
              py={3} 
              bg="white"
              borderBottom="1px solid"
              borderColor="gray.200"
            >
              <Flex align="center" gap={3}>
                <Box 
                  w="40px" 
                  h="40px" 
                  borderRadius="full" 
                  bg="green.100"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color="green.600" fontWeight="bold">
                    {selectedConversation.contact_name?.[0] || selectedConversation.phone_number[0]}
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="semibold">
                    {selectedConversation.contact_name || selectedConversation.phone_number}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    {selectedConversation.phone_number}
                  </Text>
                </Box>
              </Flex>

              <Flex align="center" gap={2}>
                {/* Connection status */}
                <Badge 
                  colorScheme={isConnected ? 'green' : 'red'}
                  variant="subtle"
                  px={2}
                  py={1}
                  borderRadius="full"
                >
                  {isConnected ? 'Online' : 'Offline'}
                </Badge>

                {/* Mode toggle */}
                <IconButton
                  aria-label="Toggle mode"
                  onClick={handleSwitchMode}
                  colorScheme={selectedConversation.mode === 'human' ? 'blue' : 'green'}
                  size="sm"
                >
                  {selectedConversation.mode === 'human' ? '👤' : '🤖'}
                </IconButton>

                {/* Refresh button */}
                <IconButton
                  aria-label="Atualizar"
                  onClick={loadMessages}
                  loading={isLoadingMessages}
                  size="sm"
                  variant="ghost"
                >
                  ↻
                </IconButton>
              </Flex>
            </Flex>

            {/* Connection error banner */}
            {connectionError && (
              <Flex 
                px={4} 
                py={2} 
                bg="yellow.50"
                borderBottom="1px solid"
                borderColor="yellow.200"
                align="center"
                gap={2}
                color="yellow.700"
                fontSize="sm"
              >
                ⚠️ {connectionError}
              </Flex>
            )}

            {/* Messages area */}
            <Box
              ref={messagesContainerRef}
              flex={1}
              overflowY="auto"
              p={4}
              bg="gray.50"
            >
              {isLoadingMessages ? (
                <Flex align="center" justify="center" h="full">
                  <Spinner size="lg" color="green.500" />
                </Flex>
              ) : messages.length === 0 ? (
                <Flex 
                  direction="column" 
                  align="center" 
                  justify="center" 
                  h="full"
                  color="gray.400"
                >
                  <Text fontSize="5xl" mb={2}>💬</Text>
                  <Text>Nenhuma mensagem ainda</Text>
                  <Text fontSize="sm">Envie a primeira mensagem!</Text>
                </Flex>
              ) : (
                Object.entries(groupedMessages).map(([date, dayMessages]) => (
                  <Box key={date}>
                    {/* Date separator */}
                    <Flex align="center" justify="center" my={4}>
                      <Text 
                        px={3} 
                        py={1} 
                        bg="white" 
                        borderRadius="full" 
                        fontSize="xs"
                        color="gray.500"
                        boxShadow="sm"
                      >
                        {format(new Date(date), "d 'de' MMMM", { locale: ptBR })}
                      </Text>
                    </Flex>
                    {/* Messages for this date */}
                    {dayMessages.map((message) => (
                      <MessageBubble key={message.id} {...messageToBubbleProps(message)} />
                    ))}
                  </Box>
                ))
              )}
              <div ref={messagesEndRef} />
            </Box>

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
      </Flex>
    </Flex>
  );
};

export default ChatWindow;
