import React, { useState, useEffect } from 'react';
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
  GridItem,
} from '@chakra-ui/react';
import {
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// Mock data - replace with actual API integration
interface MessengerAccount {
  id: string;
  name: string;
  page_id: string;
  is_active: boolean;
}

interface Conversation {
  id: string;
  customer_name: string;
  last_message: string;
  unread_count: number;
  updated_at: string;
}

const mockAccounts: MessengerAccount[] = [
  { id: '1', name: 'Página Principal', page_id: '123456', is_active: true },
];

const mockConversations: Conversation[] = [
  {
    id: '1',
    customer_name: 'João Silva',
    last_message: 'Olá, gostaria de fazer um pedido',
    unread_count: 2,
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    customer_name: 'Maria Santos',
    last_message: 'Obrigado pelo atendimento!',
    unread_count: 0,
    updated_at: new Date().toISOString(),
  },
];

export default function MessengerInbox() {
  const [accounts] = useState<MessengerAccount[]>(mockAccounts);
  const [conversations] = useState<Conversation[]>(mockConversations);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  if (loading) {
    return (
      <Flex justify="center" align="center" h="400px">
        <Spinner size="xl" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Box p={6}>
        <Box bg="red.50" border="1px" borderColor="red.200" borderRadius="md" p={4}>
          <Text color="red.700">{error}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box h="calc(100vh - 64px)" overflow="hidden">
      <Grid templateColumns="300px 1fr" h="full">
        {/* Sidebar */}
        <GridItem borderRight="1px" borderColor="gray.200" p={4}>
          <Heading size="md" mb={4}>Messenger Inbox</Heading>
          
          {/* Account Selector */}
          <Box mb={4}>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
              }}
            >
              <option value="">Selecione uma página</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Box>

          {/* Search */}
          <Box mb={4}>
            <Flex align="center" bg="gray.100" borderRadius="md" px={3} py={2}>
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 mr-2" />
              <Input
                placeholder="Buscar conversas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                variant="unstyled"
                size="sm"
              />
            </Flex>
          </Box>

          {/* Conversations List */}
          <Box overflowY="auto" maxH="calc(100vh - 250px)">
            {conversations.map((conversation) => (
              <Box
                key={conversation.id}
                borderWidth="1px"
                borderRadius="md"
                p={3}
                mb={2}
                cursor="pointer"
                _hover={{ bg: 'gray.50' }}
              >
                <Flex justify="space-between" align="start">
                  <Box>
                    <Text fontWeight="bold" mb={1}>
                      {conversation.customer_name}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {conversation.last_message}
                    </Text>
                  </Box>
                  {conversation.unread_count > 0 && (
                    <Badge colorScheme="blue" borderRadius="full">
                      {conversation.unread_count}
                    </Badge>
                  )}
                </Flex>
              </Box>
            ))}
          </Box>
        </GridItem>

        {/* Chat Area */}
        <GridItem p={4}>
          <Flex direction="column" h="full">
            <Box borderBottom="1px" borderColor="gray.200" pb={4} mb={4}>
              <Heading size="md">Selecione uma conversa</Heading>
            </Box>

            <Flex flex={1} align="center" justify="center">
              <Text color="gray.500">
                Selecione uma conversa para começar
              </Text>
            </Flex>

            <Flex gap={2} mt={4}>
              <Input
                placeholder="Digite sua mensagem..."
                flex={1}
              />
              <Button colorScheme="blue">
                <Flex align="center" gap={2}>
                  <PaperAirplaneIcon className="w-4 h-4" />
                  <span>Enviar</span>
                </Flex>
              </Button>
            </Flex>
          </Flex>
        </GridItem>
      </Grid>
    </Box>
  );
}
