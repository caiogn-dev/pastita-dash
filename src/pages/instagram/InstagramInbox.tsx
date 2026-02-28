import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  Heading,
  Text,
  Input,
  IconButton,
  Avatar,
  Badge,
  Separator,
  Flex,
  VStack,
  HStack,
  Field,
  Select,
  createListCollection,
  Spinner,
  Icon,
} from '@chakra-ui/react';
import {
  UserIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  ArrowPathIcon,
  ClockIcon,
  CheckIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import {
  instagramDirectService,
  instagramAccountService,
  InstagramAccount,
} from '../../services/instagram';

// Types para conversas e mensagens
interface InstagramConversation {
  id: string;
  account: string;
  participant_id: string;
  participant_username?: string;
  participant_name?: string;
  participant_profile_pic?: string;
  last_message_preview?: string;
  last_message_at?: string;
  unread_count: number;
  status: 'active' | 'closed';
}

interface InstagramMessage {
  id: string;
  conversation: string;
  content: string;
  direction: 'inbound' | 'outbound';
  message_type?: string;
  media_url?: string;
  status?: string;
  created_at: string;
}

const MotionFlex = motion(Flex);

const messageStatusIcon: Record<string, React.ElementType> = {
  pending: ClockIcon,
  sent: CheckIcon,
  delivered: CheckIcon,
  seen: CheckCircleIcon,
  failed: XCircleIcon,
};

export default function InstagramInbox() {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [conversations, setConversations] = useState<InstagramConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<InstagramConversation | null>(null);
  const [messages, setMessages] = useState<InstagramMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadConversations();
    }
  }, [selectedAccountId]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAccounts = async () => {
    try {
      const response = await instagramAccountService.list();
      const results = response.data || [];
      setAccounts(results);
      if (results.length > 0) {
        setSelectedAccountId(results[0].id);
      }
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    if (!selectedAccountId) return;
    
    try {
      setLoading(true);
      const response = await instagramDirectService.getConversations(selectedAccountId);
      // @ts-ignore
      setConversations(response.data?.results || response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedConversation) return;
    
    try {
      setLoadingMessages(true);
      const response = await instagramDirectService.getMessages(selectedConversation.id);
      // @ts-ignore
      const results = response.data?.results || response.data || [];
      setMessages(results.reverse());
      
      // Mark as read
      try {
        await instagramDirectService.markAsRead(selectedConversation.id);
      } catch {
        // Silently ignore
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const response = await instagramDirectService.sendMessage(
        selectedConversation.id,
        newMessage.trim()
      );
      
      // @ts-ignore
      const sentMessage = response.data;
      if (sentMessage) {
        setMessages((prev) => [...prev, sentMessage]);
      }
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.participant_username?.toLowerCase().includes(query) ||
      conv.participant_name?.toLowerCase().includes(query) ||
      conv.last_message_preview?.toLowerCase().includes(query)
    );
  });

  const formatTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  // Helper para pegar o ícone de status com fallback
  const getStatusIcon = (status: string | undefined): React.ElementType | null => {
    if (!status) return null;
    return messageStatusIcon[status] || null;
  };

  const accountOptions = createListCollection({
    items: accounts.map((acc) => ({ 
      label: acc.username, 
      value: acc.id,
      imageUrl: acc.profile_picture_url,
    })),
  });

  return (
    <Flex h="calc(100vh - 100px)" gap={4} p={4}>
      {/* Sidebar - Conversations List */}
      <Card.Root w="360px" display="flex" flexDirection="column">
        {/* Header */}
        <Box p={4} borderBottomWidth={1} borderColor="border">
          <Flex align="center" gap={3} mb={3}>
            <Box 
              p={2} 
              bgGradient="linear(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" 
              borderRadius="lg"
              color="white"
            >
              <Icon as={UserIcon} boxSize={5} />
            </Box>
            <Heading size="md">Instagram DM</Heading>
            <Box flex={1} />
            <IconButton 
              size="sm" 
              variant="ghost"
              onClick={loadConversations}
              title="Atualizar"
            >
              <Icon as={ArrowPathIcon} boxSize={4} />
            </IconButton>
          </Flex>
          
          {/* Account Selector */}
          {accounts.length > 1 && (
            <Field.Root mb={3}>
              <Select.Root
                collection={accountOptions}
                value={[selectedAccountId]}
                onValueChange={(e) => setSelectedAccountId(e.value[0])}
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="Selecione uma conta" />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Select.Positioner>
                  <Select.Content>
                    {accountOptions.items.map((account) => (
                      <Select.Item item={account} key={account.value}>
                        <HStack gap={2}>
                          <Avatar.Root size="xs">
                            <Avatar.Image src={account.imageUrl} />
                            <Avatar.Fallback>@{account.label?.[0]}</Avatar.Fallback>
                          </Avatar.Root>
                          @{account.label}
                        </HStack>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Select.Root>
            </Field.Root>
          )}
          
          {/* Search */}
          <Field.Root>
            <Input
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Field.Root>
        </Box>

        {/* Conversations List */}
        <VStack flex={1} overflow="auto" py={0} align="stretch">
          {loading ? (
            <Flex justify="center" py={8}>
              <Spinner size="lg" />
            </Flex>
          ) : filteredConversations.length === 0 ? (
            <Box textAlign="center" py={8} px={4}>
              <Box color="fg.muted" mb={2}>
                <Icon as={UserIcon} boxSize={12} />
              </Box>
              <Text color="fg.muted">
                {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </Text>
            </Box>
          ) : (
            filteredConversations.map((conv) => (
              <React.Fragment key={conv.id}>
                <Box
                  py={3}
                  px={4}
                  cursor="pointer"
                  bg={selectedConversation?.id === conv.id ? 'bg.active' : 'transparent'}
                  _hover={{ bg: 'bg.hover' }}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <Flex align="center" gap={3}>
                    <Avatar.Root>
                      <Avatar.Fallback>{conv.participant_username?.[0]?.toUpperCase() || 'U'}</Avatar.Fallback>
                      <Avatar.Image src={conv.participant_profile_pic} />
                    </Avatar.Root>
                    <Box flex={1} minW={0}>
                      <Flex justify="space-between" align="center">
                        <Text 
                          fontWeight={conv.unread_count > 0 ? 'bold' : 'normal'}
                          truncate
                        >
                          @{conv.participant_username || conv.participant_id}
                        </Text>
                        <Text fontSize="xs" color="fg.muted">
                          {formatTime(conv.last_message_at)}
                        </Text>
                      </Flex>
                      <Text
                        fontSize="sm"
                        color={conv.unread_count > 0 ? 'fg.primary' : 'fg.muted'}
                        fontWeight={conv.unread_count > 0 ? 500 : 400}
                        truncate
                      >
                        {conv.last_message_preview || 'Nenhuma mensagem'}
                      </Text>
                    </Box>
                    {conv.unread_count > 0 && (
                      <Badge colorPalette="red" size="sm">{conv.unread_count}</Badge>
                    )}
                  </Flex>
                </Box>
                <Separator />
              </React.Fragment>
            ))
          )}
        </VStack>
      </Card.Root>

      {/* Main - Chat Area */}
      <Card.Root flex={1} display="flex" flexDirection="column">
        {!selectedConversation ? (
          <Flex
            flexDirection="column"
            align="center"
            justify="center"
            flex={1}
            color="fg.muted"
          >
            <Box 
              p={4} 
              bgGradient="linear(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" 
              borderRadius="2xl"
              color="white"
              opacity={0.5}
              mb={4}
            >
              <Icon as={UserIcon} boxSize={12} />
            </Box>
            <Heading size="md">Selecione uma conversa</Heading>
            <Text>Escolha uma conversa da lista para ver as mensagens</Text>
          </Flex>
        ) : (
          <>
            {/* Chat Header */}
            <Flex
              p={4}
              borderBottomWidth={1}
              borderColor="border"
              align="center"
              gap={3}
            >
              <Avatar.Root size="lg">
                <Avatar.Fallback>{selectedConversation.participant_username?.[0]?.toUpperCase()}</Avatar.Fallback>
                <Avatar.Image src={selectedConversation.participant_profile_pic} />
              </Avatar.Root>
              <Box flex={1}>
                <Text fontWeight="bold">
                  {selectedConversation.participant_name || `@${selectedConversation.participant_username}`}
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  @{selectedConversation.participant_username || selectedConversation.participant_id}
                </Text>
              </Box>
              <Badge colorPalette={selectedConversation.status === 'active' ? 'green' : 'gray'}>
                {selectedConversation.status === 'active' ? 'Ativo' : 'Fechado'}
              </Badge>
            </Flex>

            {/* Messages Area */}
            <VStack
              flex={1}
              overflow="auto"
              p={4}
              gap={2}
              bg="gray.50"
              align="stretch"
            >
              {loadingMessages ? (
                <Flex justify="center" py={8}>
                  <Spinner size="lg" />
                </Flex>
              ) : messages.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Text color="fg.muted">Nenhuma mensagem ainda. Envie a primeira!</Text>
                </Box>
              ) : (
                messages.map((msg) => (
                  <MotionFlex
                    key={msg.id}
                    justify={msg.direction === 'outbound' ? 'flex-end' : 'flex-start'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Box
                      p={3}
                      maxW="70%"
                      bg={msg.direction === 'outbound' ? 'blue.500' : 'white'}
                      color={msg.direction === 'outbound' ? 'white' : 'fg.primary'}
                      borderRadius="lg"
                      borderTopRightRadius={msg.direction === 'outbound' ? 0 : 'lg'}
                      borderTopLeftRadius={msg.direction === 'inbound' ? 0 : 'lg'}
                      shadow="sm"
                    >
                      {msg.media_url && (
                        <Box mb={2}>
                          {msg.message_type === 'image' ? (
                            <img
                              src={msg.media_url}
                              alt="Imagem"
                              style={{ maxWidth: '100%', borderRadius: 8 }}
                            />
                          ) : msg.message_type === 'video' ? (
                            <video
                              src={msg.media_url}
                              controls
                              style={{ maxWidth: '100%', borderRadius: 8 }}
                            />
                          ) : (
                            <Badge>
                              <Icon as={PhotoIcon} mr={1} />
                              {msg.message_type}
                            </Badge>
                          )}
                        </Box>
                      )}
                      {msg.content && (
                        <Text>{msg.content}</Text>
                      )}
                      <Flex justify="flex-end" align="center" gap={1} mt={1}>
                        <Text fontSize="xs" opacity={0.7}>
                          {formatTime(msg.created_at)}
                        </Text>
                        {msg.direction === 'outbound' && msg.status && (
                          <Icon as={getStatusIcon(msg.status)!} boxSize={3} />
                        )}
                      </Flex>
                    </Box>
                  </MotionFlex>
                ))
              )}
              <div ref={messagesEndRef} />
            </VStack>

            {/* Message Input */}
            <Flex
              p={4}
              borderTopWidth={1}
              borderColor="border"
              gap={2}
            >
              <Input
                flex={1}
                placeholder="Digite uma mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <IconButton
                colorPalette="blue"
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                loading={sending}
              >
                <Icon as={PaperAirplaneIcon} boxSize={5} />
              </IconButton>
            </Flex>
          </>
        )}
      </Card.Root>

      {error && (
        <Box
          position="fixed"
          bottom={4}
          right={4}
          p={4}
          bg="red.50"
          color="red.700"
          borderRadius="lg"
          shadow="lg"
          borderLeft="4px solid"
          borderLeftColor="red.500"
        >
          <HStack gap={2}>
            <Icon as={XCircleIcon} color="red.500" />
            <Text fontWeight="medium">{error}</Text>
          </HStack>
        </Box>
      )}
    </Flex>
  );
}
