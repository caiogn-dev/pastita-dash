/**
 * ChatWindow - Interface de Chat WhatsApp com Chakra UI v3
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Box,
  Flex,
  Text,
  IconButton,
  AvatarRoot,
  AvatarFallback,
  Badge,
  Spinner,
  Input,
  Stack,
} from '@chakra-ui/react';
import toast from 'react-hot-toast';

import { ContactList, Contact } from './ContactList';
import { MessageBubble, MessageBubbleProps } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { MediaViewer } from './MediaViewer';
import { useWhatsAppWS, WhatsAppMessage } from '../../hooks/useWhatsAppWS';
import { conversationsService } from '../../services';
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
  mediaType: msg.media_type,
  fileName: msg.file_name,
  mimeType: msg.media_mime_type,
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
  lastMessagePreview: conv.last_message_preview || '',
  lastMessageAt: conv.last_message_at ?? undefined,
  unreadCount: conv.unread_count || 0,
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
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string; fileName?: string; mimeType?: string } | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setShowSidebar(!mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const {
    isConnected,
    sendMessage,
    sendTypingIndicator,
  } = useWhatsAppWS({
    accountId,
    onMessage: handleNewMessage,
    onTyping: handleTyping,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    loadConversations();
  }, [accountId]);

  async function loadConversations() {
    try {
      setIsLoadingConversations(true);
      const response = await conversationsService.getConversations({ account: accountId });
      setConversations(response.results || []);
    } catch (error) {
      toast.error('Erro ao carregar conversas');
    } finally {
      setIsLoadingConversations(false);
    }
  }

  async function handleNewMessage(newMessage: WhatsAppMessage) {
    if (!selectedConversation) return;
    
    const messageConversationId = newMessage.conversation_id;
    
    if (messageConversationId === selectedConversation.id) {
      const typedMessage: Message = {
        ...newMessage,
        timestamp: newMessage.created_at,
        account: accountId,
        updated_at: newMessage.created_at,
      } as Message;
      
      setMessages(prev => {
        const isDuplicate = prev.some(m => 
          m.id === typedMessage.id || 
          (m.whatsapp_message_id && m.whatsapp_message_id === typedMessage.whatsapp_message_id)
        );
        if (isDuplicate) return prev;
        return [...prev, typedMessage];
      });
      
      if (typedMessage.direction === 'inbound' && selectedConversation.unread_count > 0) {
        conversationsService.markAsRead(selectedConversation.id).catch(console.error);
      }
    }
    
    loadConversations();
  }

  function handleTyping(data: { conversation_id: string; is_typing: boolean }) {
    const conv = conversations.find(c => c.id === data.conversation_id);
    if (conv) {
      setTypingContacts(prev => {
        const next = new Set(prev);
        if (data.is_typing) {
          next.add(conv.phone_number);
        } else {
          next.delete(conv.phone_number);
        }
        return next;
      });
    }
  }

  async function handleSelectConversation(conversation: Conversation) {
    setSelectedConversation(conversation);
    onConversationSelect?.(conversation);
    
    if (isMobile) {
      setShowSidebar(false);
    }
    
    try {
      setIsLoadingMessages(true);
      const history = await conversationsService.getMessages(conversation.id);
      
      if (Array.isArray(history)) {
        const sortedMessages = [...history].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(sortedMessages);
      } else {
        setMessages([]);
      }

      if (conversation.unread_count > 0) {
        await conversationsService.markAsRead(conversation.id);
        loadConversations();
      }
    } catch (error) {
      toast.error('Erro ao carregar mensagens');
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function handleSendMessage(text: string) {
    if (!selectedConversation || !text.trim()) return;
    
    try {
      setIsSending(true);
      await sendMessage(selectedConversation.phone_number, text);
      
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        whatsapp_message_id: '',
        conversation_id: selectedConversation.id,
        direction: 'outbound',
        message_type: 'text',
        status: 'pending',
        text_body: text,
        content: '',
        from_number: '',
        to_number: selectedConversation.phone_number,
        created_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        account: accountId,
        updated_at: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, tempMessage]);
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  }

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      conv.contact_name?.toLowerCase().includes(search) ||
      conv.phone_number?.includes(search)
    );
  });

  const contacts = filteredConversations.map(conversationToContact);
  const selectedContact = selectedConversation ? conversationToContact(selectedConversation) : null;

  return (
    <Flex 
      h="calc(100vh - 64px)" 
      maxH="900px"
      w="100%"
      maxW="1600px"
      mx="auto"
      bg="gray.50"
      borderRadius="xl"
      overflow="hidden"
      boxShadow="xl"
    >
      {/* Sidebar */}
      {(!isMobile || showSidebar) && (
        <Box
          w={{ base: '100%', md: '380px', lg: '420px' }}
          h="100%"
          bg="white"
          borderRight="1px solid"
          borderColor="gray.200"
          display="flex"
          flexDirection="column"
        >
          {/* Header */}
          <Stack p={4} borderBottom="1px solid" borderColor="gray.200" gap={3}>
            <Flex justify="space-between" align="center">
              <Text fontSize="xl" fontWeight="bold">Conversas</Text>
              <IconButton
                aria-label="Atualizar"
                onClick={loadConversations}
                loading={isLoadingConversations}
                size="sm"
                variant="ghost"
              >↻</IconButton>
            </Flex>
            
            <Input
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              borderRadius="full"
              size="sm"
            />
          </Stack>

          {/* Contact List */}
          <Box flex={1} overflowY="auto">
            <ContactList
              contacts={contacts}
              selectedId={selectedContact?.id}
              onSelect={(contact: Contact) => {
                const conv = conversations.find(c => c.id === contact.id);
                if (conv) handleSelectConversation(conv);
              }}
              loading={isLoadingConversations}
              typingContacts={typingContacts}
            />
          </Box>
        </Box>
      )}

      {/* Chat Area */}
      <Flex 
        flex={1} 
        flexDirection="column"
        bg="gray.100"
        display={!isMobile || !showSidebar ? 'flex' : 'none'}
      >
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <Flex 
              p={4} 
              bg="white" 
              borderBottom="1px solid" 
              borderColor="gray.200"
              gap={4}
              align="center"
            >
              {isMobile && (
                <IconButton
                  aria-label="Voltar"
                  variant="ghost"
                  onClick={() => setShowSidebar(true)}
                >←</IconButton>
              )}
              
              <AvatarRoot size="md">
                <AvatarFallback name={selectedContact?.contactName || selectedContact?.phoneNumber} />
              </AvatarRoot>
              
              <Stack gap={0} align="flex-start" flex={1}>
                <Text fontWeight="semibold" fontSize="lg">
                  {selectedContact?.contactName || selectedContact?.phoneNumber}
                </Text>
                <Flex gap={2}>
                  {typingContacts.has(selectedConversation.phone_number) ? (
                    <Text fontSize="sm" color="green.500">digitando...</Text>
                  ) : (
                    <Text fontSize="sm" color="gray.500">
                      {isConnected ? 'Online' : 'Offline'}
                    </Text>
                  )}
                </Flex>
              </Stack>
              
              <Flex gap={2}>
                <IconButton aria-label="Ligar" variant="ghost" colorScheme="green">📞</IconButton>
                <IconButton aria-label="Mais" variant="ghost">ℹ</IconButton>
              </Flex>
            </Flex>

            {/* Messages */}
            <Stack 
              flex={1} 
              overflowY="auto" 
              p={4} 
              gap={4}
              ref={messagesContainerRef}
            >
              {isLoadingMessages ? (
                <Flex flex={1} align="center" justify="center">
                  <Spinner size="xl" color="green.500" />
                </Flex>
              ) : messages.length === 0 ? (
                <Flex flex={1} align="center" justify="center" direction="column" gap={4}>
                  <Text fontSize="6xl">💬</Text>
                  <Text color="gray.500">Nenhuma mensagem ainda</Text>
                </Flex>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    {...messageToBubbleProps(msg)}
                    onMediaClick={(url: string, type: string, fileName?: string) => 
                      setSelectedMedia({ url, type, fileName, mimeType: msg.media_mime_type })
                    }
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </Stack>

            {/* Input */}
            <Box p={4} bg="white" borderTop="1px solid" borderColor="gray.200">
              <MessageInput
                onSend={handleSendMessage}
                disabled={!isConnected || isSending}
                isLoading={isSending}
                onTyping={() => sendTypingIndicator(selectedConversation.id, true)}
              />
            </Box>
          </>
        ) : (
          /* Empty State */
          <Flex 
            flex={1} 
            align="center" 
            justify="center" 
            direction="column" 
            gap={6}
            p={8}
          >
            <Box 
              p={8} 
              borderRadius="full" 
              bg="green.50"
            >
              <Text fontSize="6xl">💬</Text>
            </Box>
            
            <Stack gap={2} textAlign="center">
              <Text fontSize="2xl" fontWeight="bold">
                {accountName || 'WhatsApp Business'}
              </Text>
              <Text color="gray.500" maxW="400px">
                Selecione uma conversa ao lado para começar
              </Text>
            </Stack>
            
            {!isConnected && (
              <Badge colorScheme="red" variant="solid" px={4} py={2} borderRadius="full">
                Desconectado
              </Badge>
            )}
          </Flex>
        )}
      </Flex>

      {/* Media Viewer */}
      {selectedMedia && (
        <MediaViewer
          url={selectedMedia.url}
          type={selectedMedia.type}
          fileName={selectedMedia.fileName}
          mimeType={selectedMedia.mimeType}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </Flex>
  );
};

export default ChatWindow;
