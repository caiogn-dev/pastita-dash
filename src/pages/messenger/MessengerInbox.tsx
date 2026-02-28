import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Input,
  Badge,
  Spinner,
  Grid,
  Separator,
  Stack,
} from '@chakra-ui/react';
import {
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  RobotIcon,
} from '@heroicons/react/24/outline';
import { useStore } from '../../hooks';
import { conversationsService } from '../../services';
import type { MessengerConversation } from '../../types';

export default function MessengerInbox() {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<MessengerConversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (currentStore) {
      loadConversations();
    }
  }, [currentStore]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await conversationsService.getMessengerConversations(currentStore!.id);
      setConversations(response.data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !messageText.trim()) return;
    
    try {
      await conversationsService.sendMessengerMessage(selectedConversation.id, messageText);
      setMessageText('');
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Flex justify="center" align="center" h="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box h="calc(100vh - 64px)">
      <Grid templateColumns="350px 1fr" h="full">
        {/* Sidebar */}
        <Box borderRight="1px" borderColor="gray.200" bg="gray.50">
          <Stack p={4} gap={4}>
            <Heading size="md">Messenger</Heading>
            
            {/* Search */}
            <Box position="relative">
              <Box position="absolute" left={3} top="50%" transform="translateY(-50%)">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
              </Box>
              <Input
                placeholder="Buscar conversas..."
                pl={10}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Box>

            {/* Conversations List */}
            <Stack overflow="auto" maxH="calc(100vh - 200px)">
              {filteredConversations.map((conversation) => (
                <Box
                  key={conversation.id}
                  p={3}
                  bg={selectedConversation?.id === conversation.id ? 'blue.50' : 'white'}
                  borderRadius="md"
                  cursor="pointer"
                  onClick={() => setSelectedConversation(conversation)}
                  border="1px"
                  borderColor={selectedConversation?.id === conversation.id ? 'blue.200' : 'gray.200'}
                >
                  <Flex justify="space-between" align="start">
                    <Box flex={1} minW={0}>
                      <Text fontWeight="semibold" truncate>
                        {conversation.customer_name || 'Cliente'}
                      </Text>
                      <Text fontSize="sm" color="gray.500" truncate>
                        {conversation.last_message || 'Sem mensagens'}
                      </Text>
                    </Box>
                    {conversation.unread_count > 0 && (
                      <Badge colorScheme="blue" borderRadius="full" ml={2}>
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </Flex>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Box>

        {/* Chat Area */}
        <Box bg="white" display="flex" flexDirection="column">
          {selectedConversation ? (
            <>
              {/* Header */}
              <Flex p={4} borderBottom="1px" borderColor="gray.200" align="center">
                <Box flex={1}>
                  <Text fontWeight="semibold">{selectedConversation.customer_name}</Text>
                  <Text fontSize="sm" color="gray.500">
                    {selectedConversation.customer_id}
                  </Text>
                </Box>
              </Flex>

              {/* Messages */}
              <Box flex={1} p={4} overflow="auto" bg="gray.50">
                <Stack gap={3}>
                  {selectedConversation.messages?.map((message) => (
                    <Flex
                      key={message.id}
                      justify={message.sent_by === 'business' ? 'flex-end' : 'flex-start'}
                    >
                      <Box
                        maxW="70%"
                        p={3}
                        borderRadius="lg"
                        bg={message.sent_by === 'business' ? 'blue.500' : 'white'}
                        color={message.sent_by === 'business' ? 'white' : 'gray.800'}
                        boxShadow="sm"
                      >
                        <Text>{message.content}</Text>
                      </Box>
                    </Flex>
                  ))}
                </Stack>
              </Box>

              {/* Input Area */}
              <Flex p={4} gap={2} borderTop="1px" borderColor="gray.200">
                <Input
                  flex={1}
                  placeholder="Digite sua mensagem..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button
                  colorScheme="blue"
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </Button>
              </Flex>
            </>
          ) : (
            <Flex flex={1} align="center" justify="center" direction="column" gap={4} color="gray.400">
              <RobotIcon className="w-16 h-16" />
              <Text>Selecione uma conversa para começar</Text>
            </Flex>
          )}
        </Box>
      </Grid>
    </Box>
  );
}
