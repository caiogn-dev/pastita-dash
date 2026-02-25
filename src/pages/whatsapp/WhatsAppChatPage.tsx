/**
 * WhatsAppChatPage - Página de chat WhatsApp
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Heading, Text, Spinner, Center, Stack, Button, Link } from '@chakra-ui/react';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { useAccountStore } from '../../stores/accountStore';
import { whatsappService } from '../../services';
import toast from 'react-hot-toast';

export const WhatsAppChatPage: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { accounts, setAccounts } = useAccountStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState(accounts.find(a => a.id === accountId));

  const loadAccount = async () => {
    if (!accountId) {
      setError('ID da conta não fornecido');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Primeiro tenta encontrar no store
      let foundAccount = accounts.find(a => a.id === accountId);
      
      // Se não encontrou, busca da API
      if (!foundAccount) {
        try {
          console.log('Buscando conta da API:', accountId);
          const accountData = await whatsappService.getAccount(accountId);
          console.log('Conta encontrada:', accountData);
          foundAccount = accountData;
          // Atualiza o store
          const updatedAccounts = [...accounts.filter(a => a.id !== accountId), accountData];
          setAccounts(updatedAccounts);
        } catch (apiError: any) {
          console.error('Erro ao carregar conta da API:', apiError);
          setError(apiError?.response?.data?.detail || 'Erro ao carregar conta da API');
        }
      } else {
        console.log('Conta encontrada no store:', foundAccount);
      }
      
      setAccount(foundAccount);
    } catch (error) {
      console.error('Erro geral:', error);
      setError('Erro ao carregar dados da conta');
      toast.error('Erro ao carregar dados da conta');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccount();
  }, [accountId]);

  if (isLoading) {
    return (
      <Box p={4} h="100vh">
        <Heading mb={4}>WhatsApp Chat</Heading>
        <Center h="60vh">
          <Stack align="center" gap={4}>
            <Spinner size="xl" color="green.500" />
            <Text color="fg.muted">Carregando conta...</Text>
          </Stack>
        </Center>
      </Box>
    );
  }

  if (error || !account) {
    return (
      <Box p={4} h="100vh">
        <Heading mb={4}>WhatsApp Chat</Heading>
        <Center h="60vh">
          <Stack align="center" gap={4}>
            <Text fontSize="4xl">📱</Text>
            <Text fontSize="lg" fontWeight="medium">Conta não encontrada</Text>
            <Text color="fg.muted" textAlign="center" maxW="400px">
              {error || 'A conta WhatsApp solicitada não existe ou você não tem permissão para acessá-la.'}
            </Text>
            <Stack direction="row" gap={2} mt={4}>
              <Button onClick={loadAccount} variant="outline">
                🔄 Tentar novamente
              </Button>
              <Button onClick={() => navigate('/whatsapp/accounts')} colorPalette="green">
                📋 Ver contas
              </Button>
            </Stack>
            
            {accountId && (
              <Text fontSize="xs" color="fg.muted" mt={4}>
                ID da conta: {accountId}
              </Text>
            )}
          </Stack>
        </Center>
      </Box>
    );
  }

  return (
    <Box p={4} h="100vh">
      <Heading mb={4}>WhatsApp Chat</Heading>
      <ChatWindow 
        accountId={accountId!} 
        accountName={account.name} 
      />
    </Box>
  );
};

export default WhatsAppChatPage;
