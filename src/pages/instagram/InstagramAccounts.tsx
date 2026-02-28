import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  Button,
  Flex,
  Grid,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  PlusIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { 
  instagramAccountService,
  InstagramAccount,
} from '../../services/instagram';

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: 'green', label: 'Ativo' },
  inactive: { color: 'gray', label: 'Inativo' },
  pending: { color: 'yellow', label: 'Pendente' },
  error: { color: 'red', label: 'Erro' },
};

export default function InstagramAccounts() {
  const [searchParams, setSearchParams] = useSearchParams();
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
      setAccounts(response.data.results || []);
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
      <Alert status="error" mb={4}>
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" mb={2}>Contas do Instagram</Heading>
          <Text color="gray.500">Gerencie suas contas do Instagram</Text>
        </Box>
        <Button leftIcon={<PlusIcon className="w-4 h-4" />} colorScheme="blue">
          Adicionar Conta
        </Button>
      </Flex>

      <Grid templateColumns="repeat(3, 1fr)" gap={6}>
        {accounts.map((account) => (
          <Card key={account.id} variant="outline">
            <CardHeader>
              <Flex justify="space-between" align="center">
                <Heading size="md">@{account.username}</Heading>
                <Badge colorScheme={account.is_active ? 'green' : 'red'}>
                  {account.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </Flex>
            </CardHeader>
            <CardBody>
              <Text mb={2}>{account.biography || 'Sem biografia'}</Text>
              <Flex gap={4} mt={4}>
                <Box>
                  <Text fontWeight="bold">{account.followers_count}</Text>
                  <Text fontSize="sm" color="gray.500">Seguidores</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">{account.media_count}</Text>
                  <Text fontSize="sm" color="gray.500">Posts</Text>
                </Box>
              </Flex>
            </CardBody>
          </Card>
        ))}
      </Grid>

      {accounts.length === 0 && (
        <Flex direction="column" align="center" justify="center" py={20}>
          <ExclamationTriangleIcon className="w-16 h-16 text-gray-400 mb-4" />
          <Text fontSize="lg" color="gray.500" mb={4}>
            Nenhuma conta do Instagram conectada
          </Text>
          <Button leftIcon={<PlusIcon className="w-4 h-4" />} colorScheme="blue">
            Conectar Conta
          </Button>
        </Flex>
      )}
    </Box>
  );
}
