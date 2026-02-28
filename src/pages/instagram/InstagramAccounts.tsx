import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  Button,
  Flex,
  Grid,
  Badge,
  Spinner,
} from '@chakra-ui/react';
import {
  PlusIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { 
  instagramAccountService,
  InstagramAccount,
} from '../../services/instagram';

export default function InstagramAccounts() {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await instagramAccountService.list();
      // Handle both paginated and non-paginated responses
      const data = (response.data as any).results || response.data || [];
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  };

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
        <Box bg="red.50" border="1px" borderColor="red.200" borderRadius="md" p={4} mb={4}>
          <Flex align="center" gap={2}>
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <Text color="red.700">{error}</Text>
          </Flex>
        </Box>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" mb={2}>Contas do Instagram</Heading>
          <Text color="gray.500">Gerencie suas contas do Instagram</Text>
        </Box>
        <Button colorScheme="blue">
          <Flex align="center" gap={2}>
            <PlusIcon className="w-4 h-4" />
            <span>Adicionar Conta</span>
          </Flex>
        </Button>
      </Flex>

      <Grid templateColumns="repeat(3, 1fr)" gap={6}>
        {accounts.map((account) => (
          <Box
            key={account.id}
            borderWidth="1px"
            borderRadius="lg"
            p={6}
            bg="white"
            boxShadow="sm"
          >
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="md">@{account.username}</Heading>
              <Badge colorScheme={account.is_active ? 'green' : 'red'}>
                {account.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </Flex>
            
            <Text mb={4} color="gray.600">{account.biography || 'Sem biografia'}</Text>
            
            <Flex gap={6}>
              <Box>
                <Text fontWeight="bold" fontSize="lg">{account.followers_count}</Text>
                <Text fontSize="sm" color="gray.500">Seguidores</Text>
              </Box>
              <Box>
                <Text fontWeight="bold" fontSize="lg">{account.media_count}</Text>
                <Text fontSize="sm" color="gray.500">Posts</Text>
              </Box>
            </Flex>
          </Box>
        ))}
      </Grid>

      {accounts.length === 0 && (
        <Flex direction="column" align="center" justify="center" py={20}>
          <ExclamationTriangleIcon className="w-16 h-16 text-gray-400 mb-4" />
          <Text fontSize="lg" color="gray.500" mb={4}>
            Nenhuma conta do Instagram conectada
          </Text>
          <Button colorScheme="blue">
            <Flex align="center" gap={2}>
              <PlusIcon className="w-4 h-4" />
              <span>Conectar Conta</span>
            </Flex>
          </Button>
        </Flex>
      )}
    </Box>
  );
}
