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
  ChatBubbleIcon,
  PaperPlaneIcon,
  MagnifyingGlassIcon,
  ReloadIcon,
  RobotIcon,
  PersonIcon,
} from '@radix-ui/react-icons';
import {
  messengerService,
  MessengerAccount,
  MessengerConversation,
  MessengerMessage,
} from '../../services/messenger';
import { handoverService } from '../../services/handover';

export default function MessengerInbox() {
  const [accounts, setAccounts] = useState<MessengerAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<MessengerConversation | null>(null);
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
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
      const response = await messengerService.getAccounts();
      const results = response.data || [];
      setAccounts(results);
      if (results.length > 0) {
        setSelectedAccountId(results[0].id);
      }
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Erro ao carregar contas do Messenger');
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    if (!selectedAccountId) return;
    
    try {
      setLoading(true);
      const response = await messengerService.getConversations(selectedAccountId);
      setConversations(response.data || []);
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
      const response = await messengerService.getMessages(selectedConversation.id);
      setMessages(response.data || []);
      
      // Mark as read
      try {
        await messengerService.markAsRead(selectedConversation.id);
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
      const response = await messengerService.sendMessage(selectedConversation.id, {
        content: newMessage.trim(),
        message_type: 'text',
      });
      
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

  const handleHandover = async (target: 'bot' | 'human') => {
    if (!selectedConversation) return;
    
    try {
      if (target === 'human') {
        await handoverService.transferToHuman(selectedConversation.id, {
          reason: 'Transferência manual pelo operador',
        });
      } else {
        await handoverService.transferToBot(selectedConversation.id, 'Transferência manual de volta para bot');
      }
      
      // Update conversation status locally
      setSelectedConversation({
        ...selectedConversation,
        handover_status: target,
      });
      
      // Refresh conversations list
      loadConversations();
    } catch (err) {
      console.error('Error transferring conversation:', err);
      setError(`Erro ao transferir conversa para ${target === 'human' ? 'atendimento humano' : 'bot'}`);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.sender_name?.toLowerCase().includes(query) ||
      conv.last_message?.toLowerCase().includes(query)
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

  const getHandoverIcon = (status: string) => {
    switch (status) {
      case 'bot':
        return <RobotIcon />;
      case 'human':
        return <PersonIcon />;
      default:
        return <RobotIcon />;
    }
  };

  return (
    <Flex h="calc(100vh - 100px)" gap={4} p={4}>
      {/* Sidebar - Conversations List */}
      <Card.Root w="360px" display="flex" flexDirection="column">
        {/* Header */}
        <Box p={4} borderBottomWidth={1} borderColor="border">
          <Flex align="center" gap={3} mb={3}>
            <Box color="#0084FF"><ChatBubbleIcon width="28" height="28" /></Box>
            <Heading size="md">Messenger</Heading>
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
                    <Select.ValueText placeholder="Página" />
                  </Select.Trigger>
                </Select.Control>
                <Select.Positioner>
                  <Select.Content>
                    {accounts.map((account) => (
                      <Select.Item key={account.id} value={account.id}>
                        {account.page_name}
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
              <Box color="fg.muted" mb={2}><ChatBubbleIcon width="48" height="48" /></Box>
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
                      <Avatar.Fallback>{conv.sender_name?.[0]?.toUpperCase() || 'U'}</Avatar.Fallback>
                    </Avatar.Root>
                    <Box flex={1} minW={0}>
                      <Flex justify="space-between" align="center">
                        <Text 
                          fontWeight={conv.unread_count > 0 ? 'bold' : 'normal'}
                          noOfLines={1}
                        >
                          {conv.sender_name || 'Usuário'}
                        </Text>
                        <HStack gap={1}>
                          <Box color={conv.handover_status === 'bot' ? 'blue.500' : 'green.500'}>
                            {getHandoverIcon(conv.handover_status)}
                          </Box>
                          <Text fontSize="xs" color="fg.muted">
                            {formatTime(conv.last_message_at)}
                          </Text>
                        </HStack>
                      </Flex>
                      <Text
                        fontSize="sm"
                        color={conv.unread_count > 0 ? 'fg.primary' : 'fg.muted'}
                        fontWeight={conv.unread_count > 0 ? 500 : 400}
                        noOfLines={1}
                      >
                        {conv.last_message || 'Nenhuma mensagem'}
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
            <Box color="#0084FF" opacity={0.5} mb={4}>
              <ChatBubbleIcon width="80" height="80" />
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
                <Avatar.Fallback>{selectedConversation.sender_name?.[0]?.toUpperCase()}</Avatar.Fallback>
              </Avatar.Root>
              <Box flex={1}>
                <Text fontWeight="bold">{selectedConversation.sender_name}</Text>
                <Text fontSize="sm" color="fg.muted">
                  {selectedConversation.handover_status === 'bot' ? 'Modo Bot' : 'Atendimento Humano'}
                </Text>
              </Box>
              
              {/* Handover Controls */}
              <HStack gap={2}>
                <Badge
                  colorPalette={selectedConversation.handover_status === 'bot' ? 'blue' : 'gray'}
                  cursor="pointer"
                  onClick={() => handleHandover('bot')}
                >
                  <HStack gap={1}>
                    <RobotIcon />
                    <span>Bot</span>
                  </HStack>
                </Badge>
                <Badge
                  colorPalette={selectedConversation.handover_status === 'human' ? 'green' : 'gray'}
                  cursor="pointer"
                  onClick={() => handleHandover('human')}
                >
                  <HStack gap={1}>
                    <PersonIcon />
                    <span>Humano</span>
                  </HStack>
                </Badge>
              </HStack>
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
                    justify={msg.is_from_bot ? 'flex-end' : 'flex-start'}
                  >
                    <Box
                      p={3}
                      maxW="70%"
                      bg={msg.is_from_bot ? 'blue.500' : 'white'}
                      color={msg.is_from_bot ? 'white' : 'fg.primary'}
                      borderRadius="lg"
                      borderTopRightRadius={msg.is_from_bot ? 0 : 'lg'}
                      borderTopLeftRadius={msg.is_from_bot ? 'lg' : 0}
                      shadow="sm"
                    >
                      {msg.attachments && msg.attachments.length > 0 && (
                        <Box mb={2}>
                          {msg.attachments.map((att, idx) => (
                            <Box key={idx}>
                              {att.type === 'image' ? (
                                <img
                                  src={att.url}
                                  alt="Attachment"
                                  style={{ maxWidth: '100%', borderRadius: 8 }}
                                />
                              ) : (
                                <Badge>{att.name || att.type}</Badge>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                      {msg.content && (
                        <Text>{msg.content}</Text>
                      )}
                      <Text fontSize="xs" opacity={0.7} textAlign="right" mt={1}>
                        {formatTime(msg.created_at)}
                      </Text>
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
