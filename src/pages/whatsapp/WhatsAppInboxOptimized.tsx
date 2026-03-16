/**
 * WhatsApp Inbox - Consolidated & Optimized
 * 
 * Consolidates WhatsAppInboxPage + ChatWindow + ConversationsPage
 * With proper error handling and type safety
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  Box,
  Flex,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Stack,
  Text,
  Avatar,
  Badge,
  IconButton,
  Spinner,
  Button,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
  HStack,
  VStack,
  Tabs,
} from '@chakra-ui/react';
import {
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PlusIcon,
  CheckIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckSolidIcon } from '@heroicons/react/24/solid';

import { conversationsService, getErrorMessage } from '../../services';
import { useWhatsAppWS } from '../../hooks/useWhatsAppWS';
import { useDebounce } from '../../hooks/useDebounce';
import { useAccountStore } from '../../stores/accountStore';
import { useStore } from '../../hooks';
import { Conversation, Message as ConversationMessage, ConversationNote } from '../../types';

interface ConversationWithUI extends Conversation {
  isSelected?: boolean;
}

interface MessageUI extends ConversationMessage {
  isOptimistic?: boolean;
}

interface ChatState {
  conversations: ConversationWithUI[];
  selectedConversation: ConversationWithUI | null;
  messages: MessageUI[];
  notes: ConversationNote[];
  typingUsers: Set<string>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  searchQuery: string;
  selectedTab: 'all' | 'active' | 'auto' | 'human';
}

const initialState: ChatState = {
  conversations: [],
  selectedConversation: null,
  messages: [],
  notes: [],
  typingUsers: new Set(),
  isLoadingConversations: true,
  isLoadingMessages: false,
  isSending: false,
  searchQuery: '',
  selectedTab: 'all',
};

/**
 * Safely ensure value is an array
 */
function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export const WhatsAppInboxOptimized: React.FC = () => {
  const { selectedAccount } = useAccountStore();
  const { storeSlug } = useStore();
  
  const [state, setState] = useState<ChatState>(initialState);
  const [messageText, setMessageText] = useState('');
  const [newNote, setNewNote] = useState('');
  
  const { isOpen: isNoteModalOpen, onOpen: onNoteModalOpen, onClose: onNoteModalClose } = useDisclosure();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(state.searchQuery, 300);

  const {
    isConnected,
    subscribeToConversation,
    unsubscribeFromConversation,
    sendMessage,
  } = useWhatsAppWS({
    accountId: selectedAccount?.id || '',
    enabled: !!selectedAccount?.id,
    onMessageReceived: handleMessageReceived,
    onStatusUpdated: handleStatusUpdated,
    onTyping: handleTyping,
    onConversationUpdated: handleConversationUpdated,
    onError: (event) => {
      toast.error(`Erro: ${event.error_message}`);
    },
  });

  useEffect(() => {
    loadConversations();
  }, [selectedAccount?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  useEffect(() => {
    if (state.selectedConversation) {
      loadMessages(state.selectedConversation.id);
      loadNotes(state.selectedConversation.id);
      subscribeToConversation(state.selectedConversation.id);

      return () => {
        if (state.selectedConversation) {
          unsubscribeFromConversation(state.selectedConversation.id);
        }
      };
    }
  }, [state.selectedConversation?.id]);

  async function loadConversations() {
    if (!selectedAccount?.id) return;

    setState(prev => ({ ...prev, isLoadingConversations: true }));
    try {
      const response = await conversationsService.getConversations({
        account: selectedAccount.id,
      });
      
      const conversations = ensureArray<ConversationWithUI>(response?.results || response);
      setState(prev => ({ ...prev, conversations }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setState(prev => ({ ...prev, isLoadingConversations: false }));
    }
  }

  async function loadMessages(conversationId: string) {
    if (!selectedAccount?.id) return;

    setState(prev => ({ ...prev, isLoadingMessages: true }));
    try {
      const response = await conversationsService.getMessages(conversationId);
      const messages = ensureArray<MessageUI>(response);
      setState(prev => ({ ...prev, messages }));
    } catch (error) {
      toast.error('Erro ao carregar mensagens');
    } finally {
      setState(prev => ({ ...prev, isLoadingMessages: false }));
    }
  }

  async function loadNotes(conversationId: string) {
    try {
      const response = await conversationsService.getNotes(conversationId);
      const notes = ensureArray<ConversationNote>(response);
      setState(prev => ({ ...prev, notes }));
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
    }
  }

  function handleMessageReceived(event: any) {
    const { message, conversation_id } = event;

    setState(prev => {
      const conversations = ensureArray<ConversationWithUI>(prev.conversations);
      const updated = conversations.map(conv => 
        conv.id === conversation_id 
          ? { ...conv, last_message_at: message.created_at }
          : conv
      ).sort((a, b) => {
        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return bTime - aTime;
      });

      return { ...prev, conversations: updated };
    });

    if (state.selectedConversation?.id === conversation_id) {
      setState(prev => ({
        ...prev,
        messages: [...ensureArray<MessageUI>(prev.messages), message],
      }));
    } else {
      const contact = state.conversations.find(c => c.id === conversation_id);
      if (contact) {
        toast(`💬 ${contact.contact_name || contact.phone_number}`);
      }
    }
  }

  function handleStatusUpdated(event: any) {
    setState(prev => ({
      ...prev,
      messages: ensureArray<MessageUI>(prev.messages).map(msg =>
        msg.id === event.message_id || msg.whatsapp_message_id === event.whatsapp_message_id
          ? { ...msg, status: event.status }
          : msg
      ),
    }));
  }

  function handleTyping(event: any) {
    setState(prev => {
      const typingUsers = new Set(prev.typingUsers);
      event.is_typing 
        ? typingUsers.add(event.conversation_id)
        : typingUsers.delete(event.conversation_id);
      return { ...prev, typingUsers };
    });
  }

  function handleConversationUpdated(event: any) {
    const { conversation } = event;
    setState(prev => ({
      ...prev,
      conversations: ensureArray<ConversationWithUI>(prev.conversations).map(c =>
        c.id === conversation.id ? { ...c, ...conversation } : c
      ),
      selectedConversation:
        prev.selectedConversation?.id === conversation.id
          ? { ...prev.selectedConversation, ...conversation }
          : prev.selectedConversation,
    }));
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !state.selectedConversation) return;

    const text = messageText.trim();
    setMessageText('');

    const optimisticMessage: MessageUI = {
      id: `temp-${Date.now()}`,
      content: text,
      text_body: text,
      direction: 'outbound',
      message_type: 'text',
      status: 'pending',
      created_at: new Date().toISOString(),
      conversation_id: state.selectedConversation.id,
      conversation: state.selectedConversation.id,
      account: selectedAccount?.id || '',
      isOptimistic: true,
      whatsapp_message_id: '',
      from_number: '',
      to_number: '',
      timestamp: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      messages: [...ensureArray<MessageUI>(prev.messages), optimisticMessage],
    }));

    setState(prev => ({ ...prev, isSending: true }));

    try {
      await sendMessage(state.selectedConversation.id, text);
      toast.success('Mensagem enviada');
      setTimeout(() => {
        if (state.selectedConversation) {
          loadMessages(state.selectedConversation.id);
        }
      }, 500);
    } catch (error) {
      toast.error('Erro ao enviar');
      setState(prev => ({
        ...prev,
        messages: ensureArray<MessageUI>(prev.messages).filter(m => m.id !== optimisticMessage.id),
      }));
    } finally {
      setState(prev => ({ ...prev, isSending: false }));
    }
  }

  async function handleAddNote() {
    if (!newNote.trim() || !state.selectedConversation) return;

    try {
      const note = await conversationsService.addNote(
        state.selectedConversation.id,
        newNote.trim()
      );
      setState(prev => ({
        ...prev,
        notes: [note, ...ensureArray<ConversationNote>(prev.notes)],
      }));
      setNewNote('');
      onNoteModalClose();
      toast.success('Nota adicionada');
    } catch (error) {
      toast.error('Erro ao adicionar nota');
    }
  }

  async function handleSwitchMode(mode: 'auto' | 'human') {
    if (!state.selectedConversation) return;

    try {
      const updated =
        mode === 'auto'
          ? await conversationsService.switchToAuto(state.selectedConversation.id)
          : await conversationsService.switchToHuman(state.selectedConversation.id);

      setState(prev => ({
        ...prev,
        selectedConversation: { ...prev.selectedConversation!, ...updated },
      }));
      toast.success(`Modo: ${mode === 'auto' ? '🤖 Automático' : '👤 Humano'}`);
    } catch (error) {
      toast.error('Erro ao alternar modo');
    }
  }

  const filteredConversations = useMemo(() => {
    let filtered = ensureArray<ConversationWithUI>(state.conversations);

    if (debouncedSearch) {
      filtered = filtered.filter(conv =>
        conv.contact_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        conv.phone_number.includes(debouncedSearch)
      );
    }

    switch (state.selectedTab) {
      case 'active':
        return filtered.filter(c => c.status !== 'closed');
      case 'auto':
        return filtered.filter(c => c.mode === 'auto');
      case 'human':
        return filtered.filter(c => c.mode === 'human');
      default:
        return filtered;
    }
  }, [state.conversations, state.selectedTab, debouncedSearch]);

  const getMessageStatusIcon = (message: MessageUI) => {
    if (message.direction === 'inbound') return null;
    if (message.status === 'read') return <CheckSolidIcon className="w-4 h-4 text-blue-500" />;
    if (message.status === 'delivered' || message.status === 'sent') 
      return <CheckIcon className="w-4 h-4 text-gray.400" />;
    return <ClockIcon className="w-4 h-4 text-gray.300" />;
  };

  if (!selectedAccount) {
    return (
      <Box p={6} textAlign="center">
        <Heading mb={4}>WhatsApp Inbox</Heading>
        <Text color="gray.600">Selecione uma conta para começar</Text>
      </Box>
    );
  }

  return (
    <Box h="100vh" display="flex" flexDirection="column">
      <Box p={4} borderBottom="1px solid" borderColor="gray.200" bg="white">
        <Heading size="lg">WhatsApp Inbox</Heading>
      </Box>

      <Flex flex={1} overflow="hidden">
        {/* Sidebar */}
        <Box w="360px" borderRight="1px" borderColor="gray.200" display="flex" flexDir="column" bg="gray.50">
          <Box p={4} borderBottom="1px" borderColor="gray.200">
            <InputGroup size="sm">
              <InputLeftElement pointerEvents="none">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Buscar..."
                value={state.searchQuery}
                onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
              />
            </InputGroup>
          </Box>

          <Box p={4} borderBottom="1px" borderColor="gray.200">
            <Tabs.Root value={state.selectedTab} onValueChange={(d) => setState(prev => ({ ...prev, selectedTab: d.value as any }))} variant="soft" size="sm">
              <Tabs.List>
                <Tabs.Trigger value="all">Todas</Tabs.Trigger>
                <Tabs.Trigger value="active">Ativas</Tabs.Trigger>
                <Tabs.Trigger value="auto">🤖</Tabs.Trigger>
                <Tabs.Trigger value="human">👤</Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
          </Box>

          <Box flex={1} overflowY="auto">
            {state.isLoadingConversations ? (
              <Box display="flex" justifyContent="center" h="full"><Spinner /></Box>
            ) : filteredConversations.length === 0 ? (
              <Box p={4} textAlign="center"><Text color="gray.500">Sem conversas</Text></Box>
            ) : (
              <Stack gap={0}>
                {filteredConversations.map((conv) => (
                  <Box
                    key={conv.id}
                    p={4}
                    cursor="pointer"
                    bg={state.selectedConversation?.id === conv.id ? 'white' : 'transparent'}
                    borderBottom="1px"
                    borderColor="gray.200"
                    _hover={{ bg: 'gray.100' }}
                    onClick={() => setState(prev => ({ ...prev, selectedConversation: conv }))}
                  >
                    <HStack gap={3} mb={2}>
                      <Avatar name={conv.contact_name || conv.phone_number} size="sm" />
                      <VStack flex={1} gap={0} align="start">
                        <HStack gap={2}>
                          <Text fontWeight="600" fontSize="sm">
                            {conv.contact_name || conv.phone_number}
                          </Text>
                          <Badge size="sm" colorPalette={conv.mode === 'auto' ? 'blue' : 'orange'}>
                            {conv.mode === 'auto' ? '🤖' : '👤'}
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" color="gray.600" noOfLines={1}>
                          {conv.phone_number}
                        </Text>
                      </VStack>
                    </HStack>
                    {conv.last_message_at && (
                      <Text fontSize="xs" color="gray.500">
                        {formatDistanceToNow(new Date(conv.last_message_at), { locale: ptBR, addSuffix: true })}
                      </Text>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Box>

        {/* Chat */}
        <Box flex={1} display="flex" flexDir="column" bg="white">
          {state.selectedConversation ? (
            <>
              <Box p={4} borderBottom="1px" borderColor="gray.200" display="flex" justifyContent="space-between" alignItems="center">
                <HStack gap={3}>
                  <Avatar name={state.selectedConversation.contact_name || state.selectedConversation.phone_number} />
                  <VStack gap={0} align="start">
                    <Heading size="sm">{state.selectedConversation.contact_name || state.selectedConversation.phone_number}</Heading>
                    <Text fontSize="xs" color="gray.600">{state.selectedConversation.phone_number}</Text>
                  </VStack>
                </HStack>
                <HStack gap={2}>
                  <Button size="sm" variant={state.selectedConversation.mode === 'auto' ? 'solid' : 'outline'} colorPalette="blue" onClick={() => handleSwitchMode('auto')}>
                    🤖 Auto
                  </Button>
                  <Button size="sm" variant={state.selectedConversation.mode === 'human' ? 'solid' : 'outline'} colorPalette="orange" onClick={() => handleSwitchMode('human')}>
                    👤 Humano
                  </Button>
                  <IconButton variant="ghost" onClick={onNoteModalOpen}><PlusIcon className="w-5 h-5" /></IconButton>
                </HStack>
              </Box>

              {state.notes.length > 0 && (
                <Box p={4} borderBottom="1px" borderColor="gray.200" bg="blue.50">
                  <Text fontSize="xs" fontWeight="600" mb={2}>📝 Notas</Text>
                  <Stack gap={2}>
                    {ensureArray<ConversationNote>(state.notes).slice(0, 3).map((note) => (
                      <Box key={note.id} fontSize="xs" color="gray.700">
                        <Text>{note.content}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {format(new Date(note.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </Text>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              <Box flex={1} overflowY="auto" p={4} display="flex" flexDir="column" gap={2}>
                {state.isLoadingMessages ? (
                  <Box display="flex" justifyContent="center" h="full"><Spinner /></Box>
                ) : ensureArray<MessageUI>(state.messages).length === 0 ? (
                  <Box display="flex" justifyContent="center" alignItems="center" h="full">
                    <VStack gap={2}>
                      <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray.300" />
                      <Text color="gray.500">Nenhuma mensagem</Text>
                    </VStack>
                  </Box>
                ) : (
                  ensureArray<MessageUI>(state.messages).map((msg) => (
                    <Flex key={msg.id} justify={msg.direction === 'inbound' ? 'flex-start' : 'flex-end'} mb={2}>
                      <Box maxW="70%" bg={msg.direction === 'inbound' ? 'gray.100' : 'green.500'} color={msg.direction === 'inbound' ? 'black' : 'white'} rounded="lg" p={3} opacity={msg.isOptimistic ? 0.7 : 1}>
                        <Text fontSize="sm">{msg.text_body || msg.content}</Text>
                        <HStack gap={1} mt={1} justify="flex-end">
                          <Text fontSize="xs" opacity={0.7}>{format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}</Text>
                          {msg.direction === 'outbound' && getMessageStatusIcon(msg)}
                        </HStack>
                      </Box>
                    </Flex>
                  ))
                )}
                {state.typingUsers.has(state.selectedConversation.id) && (
                  <Flex justify="flex-start">
                    <Text fontSize="xs" color="gray.500" fontStyle="italic">Digitando...</Text>
                  </Flex>
                )}
                <div ref={messagesEndRef} />
              </Box>

              <Box p={4} borderTop="1px" borderColor="gray.200">
                <form onSubmit={handleSendMessage}>
                  <HStack gap={2}>
                    <Input
                      placeholder="Mensagem..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      disabled={state.isSending}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e as any);
                        }
                      }}
                    />
                    <IconButton type="submit" disabled={!messageText.trim() || state.isSending} loading={state.isSending} colorPalette="green">
                      <PaperAirplaneIcon className="w-5 h-5" />
                    </IconButton>
                  </HStack>
                </form>
              </Box>
            </>
          ) : (
            <Box flex={1} display="flex" flexDir="column" justifyContent="center" alignItems="center" gap={4}>
              <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray.300" />
              <VStack gap={1} textAlign="center">
                <Heading size="md">Selecione uma conversa</Heading>
                <Text color="gray.500">Escolha uma conversa para começar</Text>
              </VStack>
            </Box>
          )}
        </Box>
      </Flex>

      <Modal isOpen={isNoteModalOpen} onClose={onNoteModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Adicionar Nota</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Digite uma nota..." size="sm" />
          </ModalBody>
          <ModalFooter>
            <HStack gap={2}>
              <Button variant="outline" onClick={onNoteModalClose}>Cancelar</Button>
              <Button colorPalette="blue" onClick={handleAddNote} disabled={!newNote.trim()}>Adicionar</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default WhatsAppInboxOptimized;
