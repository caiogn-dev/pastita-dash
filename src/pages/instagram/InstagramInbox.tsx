// @ts-nocheck
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
} from '@chakra-ui/react';
import {
  InstagramLogoIcon,
  PaperPlaneIcon,
  MagnifyingGlassIcon,
  ImageIcon,
  ReloadIcon,
  ClockIcon,
  CheckIcon,
  CheckCircledIcon,
  CrossCircledIcon,
} from '@radix-ui/react-icons';
import {
  instagramService,
  InstagramAccount,
  InstagramConversation,
  InstagramMessage,
} from '../../services/instagram';

const messageStatusIcon: Record<string, React.ReactNode> = {
  pending: <ClockIcon />,
  sent: <CheckIcon />,
  delivered: <CheckIcon />,
  seen: <CheckCircledIcon />,
  failed: <CrossCircledIcon />,
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
      const response = await instagramService.getAccounts();
      // PaginatedResponse: response.data.results
      const results = response.data?.results || [];
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
      const response = await instagramService.getConversations({
        account_id: selectedAccountId,
      });
      // PaginatedResponse: response.data.results
      setConversations(response.data?.results || []);
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
      const response = await instagramService.getMessages({
        conversation_id: selectedConversation.id,
      });
      // PaginatedResponse: response.data.results
      const results = response.data?.results || [];
      setMessages(results.reverse());
      
      // Mark as seen - usa sender_id (quem enviou a última mensagem)
      if (selectedAccountId && selectedConversation.participant_id) {
        await instagramService.markSeen(selectedAccountId, selectedConversation.participant_id);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !selectedAccountId) return;

    try {
      setSending(true);
      
      // Typing indicator (best effort - não falha se der erro)
      try {
        await instagramService.sendTyping(selectedAccountId, selectedConversation.participant_id);
      } catch {
        // Silently ignore typing errors
      }
      
      // Send message
      const response = await instagramService.sendMessage({
        account_id: selectedAccountId,
        recipient_id: selectedConversation.participant_id,
        text: newMessage.trim(),
      });
      
      // Adiciona mensagem enviada à lista
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
  const getStatusIcon = (status: string | undefined) => {
    if (!status) return null;
    return messageStatusIcon[status] || null;
  };

  return (
    <Flex h="calc(100vh - 100px)" gap={4} p={4}>
      {/* Sidebar - Conversations List */}
      <Card.Root w="360px" display="flex" flexDirection="column">
        {/* Header */}
        <Box p={4} borderBottomWidth={1} borderColor="border">
          <Flex align="center" gap={3} mb={3}>
            <Box color="#E4405F"><InstagramLogoIcon width="28" height="28" /></Box>
            <Heading size="md">Instagram DM</Heading>
            <Box flex={1} />
            <IconButton 
              size="sm" 
              variant="ghost"
              onClick={loadConversations}
              title="Atualizar"
            >
              <ReloadIcon />
            </IconButton>
          </Flex>
          
          {/* Account Selector */}
          {accounts.length > 1 && (
            <Field.Root mb={3}>
              <Select.Root
                value={[selectedAccountId]}
                onValueChange={(e) => setSelectedAccountId(e.value[0])}
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText />
                  </Select.Trigger>
                </Select.Control>
                <Select.Positioner>
                  <Select.Content>
                    {accounts.map((account) => (
                      <Select.Item key={account.id} value={account.id}>
                        <HStack>
                          <Avatar.Root size="xs">
                            <Avatar.Image src={account.profile_picture_url} />
                            <Avatar.Fallback>@{account.username?.[0]}</Avatar.Fallback>
                          </Avatar.Root>
                          @{account.username}
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
            >
              <Input.ElementLeft pointerEvents="none">
                <MagnifyingGlassIcon />
              </Input.ElementLeft>
            </Input>
          </Field.Root>
        </Box>

        {/* Conversations List */}
        <VStack flex={1} overflow="auto" py={0} align="stretch">
          {loading ? (
            <Flex justify="center" py={8}>
              <Text>⏳</Text>
            </Flex>
          ) : filteredConversations.length === 0 ? (
            <Box textAlign="center" py={8} px={4}>
              <Box color="fg.muted" mb={2}><InstagramLogoIcon width="48" height="48" /></Box>
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
                          noOfLines={1}
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
                        noOfLines={1}
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
            <Box color="#E4405F" opacity={0.5} mb={4}>
              <InstagramLogoIcon width="80" height="80" />
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
                  <Text>⏳</Text>
                </Flex>
              ) : messages.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Text color="fg.muted">Nenhuma mensagem ainda. Envie a primeira!</Text>
                </Box>
              ) : (
                messages.map((msg) => (
                  <Flex
                    key={msg.id}
                    justify={msg.direction === 'outbound' ? 'flex-end' : 'flex-start'}
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
                            <Badge><ImageIcon /> {msg.message_type}</Badge>
                          )}
                        </Box>
                      )}
                      {msg.text_content && (
                        <Text>{msg.text_content}</Text>
                      )}
                      <Flex justify="flex-end" align="center" gap={1} mt={1}>
                        <Text fontSize="xs" opacity={0.7}>
                          {formatTime(msg.created_at)}
                        </Text>
                        {msg.direction === 'outbound' && (
                          <Box fontSize="sm">{getStatusIcon(msg.status)}</Box>
                        )}
                      </Flex>
                    </Box>
                  </Flex>
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
                onKeyPress={(e) => {
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
              >
                {sending ? '⏳' : <PaperPlaneIcon />}
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
          p={3}
          bg="red.50"
          color="red.700"
          borderRadius="md"
          shadow="lg"
        >
          {error}
        </Box>
      )}
    </Flex>
  );
}
