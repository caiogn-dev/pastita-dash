import React, { useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Input,
  Badge,
  Grid,
} from '@chakra-ui/react';
import {
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface Conversation {
  id: string;
  customer_name: string;
  last_message: string;
  unread_count: number;
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    customer_name: 'João Silva',
    last_message: 'Olá, gostaria de fazer um pedido',
    unread_count: 2,
  },
  {
    id: '2',
    customer_name: 'Maria Santos',
    last_message: 'Obrigado pelo atendimento!',
    unread_count: 0,
  },
];

export default function MessengerInbox() {
  const [conversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((conv) =>
    conv.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box h="calc(100vh - 64px)">
      <Grid templateColumns="350px 1fr" h="full">
        {/* Sidebar */}
        <Box borderRight="1px" borderColor="gray.200" bg="gray.50" p={4}>
          <Heading size="md" mb={4}>Messenger</Heading>
          
          {/* Search */}
          <Box mb={4} position="relative">
            <Input
              placeholder="Buscar conversas..."
              pl={10}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Box position="absolute" left={3} top="50%" transform="translateY(-50%)">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
            </Box>
          </Box>

          {/* Conversations List */}
          <Box>
            {filteredConversations.map((conversation) => (
              <Box
                key={conversation.id}
                p={3}
                mb={2}
                bg={selectedConversation?.id === conversation.id ? 'blue.50' : 'white'}
                borderRadius="md"
                cursor="pointer"
                onClick={() => setSelectedConversation(conversation)}
                border="1px"
                borderColor={selectedConversation?.id === conversation.id ? 'blue.200' : 'gray.200'}
              >
                <Flex justify="space-between" align="start">
                  <Box flex={1}>
                    <Text fontWeight="semibold" mb={1}>
                      {conversation.customer_name}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {conversation.last_message}
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
          </Box>
        </Box>

        {/* Chat Area */}
        <Box bg="white" p={4}>
          {selectedConversation ? (
            <Flex direction="column" h="full">
              {/* Header */}
              <Box pb={4} mb={4} borderBottom="1px" borderColor="gray.200">
                <Text fontWeight="semibold">{selectedConversation.customer_name}</Text>
              </Box>

              {/* Messages */}
              <Box flex={1} mb={4}>
                <Text color="gray.500">Histórico de mensagens...</Text>
              </Box>

              {/* Input */}
              <Flex gap={2}>
                <Input
                  flex={1}
                  placeholder="Digite sua mensagem..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                <Button colorScheme="blue">
                  <PaperAirplaneIcon className="w-4 h-4" />
                </Button>
              </Flex>
            </Flex>
          ) : (
            <Flex h="full" align="center" justify="center">
              <Text color="gray.400">Selecione uma conversa para começar</Text>
            </Flex>
          )}
        </Box>
      </Grid>
    </Box>
  );
}
