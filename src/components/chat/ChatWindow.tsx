/**
 * ChatWindow - Interface de Chat WhatsApp com Chakra UI
 * 
 * Melhorias:
 * - Layout desktop maior e mais espaçoso
 * - Chakra UI components
 * - Tema consistente
 * - Responsividade otimizada
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  IconButton,
  Avatar,
  Badge,
  Divider,
  useColorModeValue,
  Spinner,
  Tooltip,
  Input,
  InputGroup,
  InputLeftElement,
  Slide,
} from '@chakra-ui/react';
import {
  ChatIcon,
  RepeatIcon,
  PhoneIcon,
  AttachmentIcon,
  SearchIcon,
  ArrowBackIcon,
  HamburgerIcon,
  InfoIcon,
} from '@chakra-ui/icons';
import toast from 'react-hot-toast';

import { ContactList, Contact } from './ContactList';
import { MessageBubble, MessageBubbleProps } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { MediaViewer } from './MediaViewer';
import { useWhatsAppWS } from '../../hooks/useWhatsAppWS';
import { whatsappService, conversationsService, getErrorMessage } from '../../services';
import { Message, Conversation } from '../../types';

export interface ChatWindowProps {
  accountId: string;
  accountName?: string;
  onConversationSelect?: (conversation: Conversation | null) => void;
}

// Converter mensagem da API para props do bubble
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

// Converter conversa da API para contato
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
  // Theme colors
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const sidebarBg = useColorModeValue('white', 'gray.800');
  const chatBg = useColorModeValue('gray.100', 'gray.700');
  const headerBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingContacts, setTypingContacts] = useState<Set<string>>(new Set());
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string; fileName?: string; mimeType?: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Detectar mobile
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

  // WebSocket
  const {
    isConnected,
    connectionStatus,
    error: wsError,
    sendMessage,
    sendTypingIndicator,
  } = useWhatsAppWS({
    accountId,
    onMessage: handleNewMessage,
    onTyping: handleTyping,
  });

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, [accountId]);

  async function loadConversations() {
    try {
      setIsLoadingConversations(true);
      const response = await conversationsService.getConversations(accountId);
      setConversations(response.results || []);
    } catch (error) {
      toast.error('Erro ao carregar conversas');
    } finally {
      setIsLoadingConversations(false);
    }
  }

  // Handle new message
  async function handleNewMessage(newMessage: Message) {
    if (!selectedConversation) return;
    
    const messageConversationId = newMessage.conversation;
    
    if (typeof messageConversationId === 'string' 
        ? messageConversationId === selectedConversation.id
        : messageConversationId?.id === selectedConversation.id) {
      
      setMessages(prev => {
        const isDuplicate = prev.some(m => 
          m.id === newMessage.id || 
          (m.whatsapp_message_id && m.whatsapp_message_id === newMessage.whatsapp_message_id)
        );
        if (isDuplicate) return prev;
        
        return [...prev, newMessage];
      });
      
      if (newMessage.direction === 'inbound' && selectedConversation.unread_count > 0) {
        conversationsService.markAsRead(selectedConversation.id).catch(console.error);
      }
    }
    
    loadConversations();
  }

  // Handle typing
  function handleTyping(data: { phone_number: string; is_typing: boolean }) {
    setTypingContacts(prev => {
      const next = new Set(prev);
      if (data.is_typing) {
        next.add(data.phone_number);
      } else {
        next.delete(data.phone_number);
      }
      return next;
    });
  }

  // Select conversation
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

  // Send message
  async function handleSendMessage(text: string) {
    if (!selectedConversation || !text.trim()) return;
    
    try {
      setIsSending(true);
      await sendMessage(selectedConversation.phone_number, text);
      
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        whatsapp_message_id: '',
        conversation: selectedConversation.id,
        direction: 'outbound',
        message_type: 'text',
        status: 'pending',
        text_body: text,
        content: {},
        from_number: '',
        to_number: selectedConversation.phone_number,
        created_at: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, tempMessage]);
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  }

  // Filter conversations
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
      bg={bgColor}
      borderRadius="xl"
      overflow="hidden"
      boxShadow="xl"
    >
      {/* Sidebar */}
      <Slide direction="left" in={showSidebar || !isMobile} style={{ zIndex: 10 }}>
        <Box
          w={{ base: '100%', md: '380px', lg: '420px' }}
          h="100%"
          bg={sidebarBg}
          borderRight="1px"
          borderColor={borderColor}
          display={showSidebar || !isMobile ? 'flex' : 'none'}
          flexDirection="column"
        >
          {/* Header */}
          <VStack spacing={0} p={4} borderBottom="1px" borderColor={borderColor}>
            <HStack w="100%" justify="space-between">
              <Text fontSize="xl" fontWeight="bold">
                Conversas
              </Text>
              <HStack>
                <Tooltip label="Atualizar">
                  <IconButton
                    aria-label="Atualizar"
                    icon={<RepeatIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={loadConversations}
                    isLoading={isLoadingConversations}
                  />
                </Tooltip>
              </HStack>
            </HStack>
            
            {/* Search */}
            <InputGroup size="sm" mt={3}>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Buscar conversa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                borderRadius="full"
              />
            </InputGroup>
          </VStack>

          {/* Contact List */}
          <Box flex={1} overflowY="auto">
            <ContactList
              contacts={contacts}
              selectedId={selectedContact?.id}
              onSelect={(contact) => {
                const conv = conversations.find(c => c.id === contact.id);
                if (conv) handleSelectConversation(conv);
              }}
              loading={isLoadingConversations}
              typingContacts={typingContacts}
            />
          </Box>
        </Box>
      </Slide>

      {/* Chat Area */}
      <Flex 
        flex={1} 
        flexDirection="column"
        bg={chatBg}
        display={!isMobile || !showSidebar ? 'flex' : 'none'}
      >
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <HStack 
              p={4} 
              bg={headerBg} 
              borderBottom="1px" 
              borderColor={borderColor}
              spacing={4}
            >
              {isMobile && (
                <IconButton
                  aria-label="Voltar"
                  icon={<ArrowBackIcon />}
                  variant="ghost"
                  onClick={() => setShowSidebar(true)}
                />
              )}
              
              <Avatar 
                size="md" 
                name={selectedContact?.contactName || selectedContact?.phoneNumber}
                bg="green.500"
              />
              
              <VStack spacing={0} align="start" flex={1}>
                <Text fontWeight="semibold" fontSize="lg">
                  {selectedContact?.contactName || selectedContact?.phoneNumber}
                </Text>
                <HStack spacing={2}>
                  {typingContacts.has(selectedConversation.phone_number) ? (
                    <Text fontSize="sm" color="green.500">
                      digitando...
                    </Text>
                  ) : (
                    <Text fontSize="sm" color="gray.500">
                      {connectionStatus === 'connected' ? 'Online' : 'Offline'}
                    </Text>
                  )}
                </HStack>
              </VStack>
              
              <HStack spacing={2}>
                <Tooltip label="Ligar">
                  <IconButton
                    aria-label="Ligar"
                    icon={<PhoneIcon />}
                    variant="ghost"
                    colorScheme="green"
                  />
                </Tooltip>
                <Tooltip label="Mais opções">
                  <IconButton
                    aria-label="Mais"
                    icon={<InfoIcon />}
                    variant="ghost"
                  />
                </Tooltip>
              </HStack>
            </HStack>

            {/* Messages */}
            <VStack 
              flex={1} 
              overflowY="auto" 
              p={4} 
              spacing={4}
              ref={messagesContainerRef}
            >
              {isLoadingMessages ? (
                <Flex flex={1} align="center" justify="center">
                  <Spinner size="xl" color="green.500" />
                </Flex>
              ) : messages.length === 0 ? (
                <Flex flex={1} align="center" justify="center" direction="column" gap={4}>
                  <ChatIcon boxSize={16} color="gray.300" />
                  <Text color="gray.500">Nenhuma mensagem ainda</Text>
                  <Text fontSize="sm" color="gray.400">
                    Envie uma mensagem para iniciar a conversa
                  </Text>
                </Flex>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    {...messageToBubbleProps(msg)}
                    onMediaClick={(url, type, fileName, mimeType) => 
                      setSelectedMedia({ url, type, fileName, mimeType })
                    }
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </VStack>

            {/* Input */}
            <Box p={4} bg={headerBg} borderTop="1px" borderColor={borderColor}>
              <MessageInput
                onSend={handleSendMessage}
                disabled={!isConnected || isSending}
                isLoading={isSending}
                onTyping={() => sendTypingIndicator(selectedConversation.phone_number)}
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
              bg={useColorModeValue('green.50', 'green.900')}
            >
              <ChatIcon boxSize={20} color="green.500" />
            </Box>
            
            <VStack spacing={2} textAlign="center">
              <Text fontSize="2xl" fontWeight="bold">
                {accountName || 'WhatsApp Business'}
              </Text>
              <Text color="gray.500" maxW="400px">
                Selecione uma conversa ao lado para começar a atender seus clientes
              </Text>
            </VStack>
            
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
