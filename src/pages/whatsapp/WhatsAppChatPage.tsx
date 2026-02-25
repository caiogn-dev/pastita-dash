/**
 * WhatsAppChatPage - Página de chat WhatsApp
 */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Heading, Text, Spinner, Center, Stack } from '@chakra-ui/react';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { useAccountStore } from '../../stores/accountStore';
import { whatsappService } from '../../services';
import toast from 'react-hot-toast';

export const WhatsAppChatPage: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const { accounts, setAccounts } = useAccountStore();
  const [isLoading, setIsLoading] = useState(true);
  const [account, setAccount] = useState(accounts.find(a => a.id === accountId));

  useEffect(() => {
    const loadAccount = async () => {
      setIsLoading(true);
      try {
        // Primeiro tenta encontrar no store
        let foundAccount = accounts.find(a => a.id === accountId);
        
        // Se não encontrou, busca da API
        if (!foundAccount && accountId) {
          try {
            const accountData = await whatsappService.getAccount(accountId);
            foundAccount = accountData;
            // Atualiza o store
            const updatedAccounts = [...accounts.filter(a => a.id !== accountId), accountData];
            setAccounts(updatedAccounts);
          } catch (error) {
            console.error('Erro ao carregar conta:', error);
          }
        }
        
        setAccount(foundAccount);
      } catch (error) {
        toast.error('Erro ao carregar dados da conta');
      } finally {
        setIsLoading(false);
      }
    };

    loadAccount();
  }, [accountId, accounts, setAccounts]);

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

  return (
    <Box p={4} h="100vh">
      <Heading mb={4}>WhatsApp Chat</Heading>
      {account ? (
        <ChatWindow 
          accountId={accountId!} 
          accountName={account.name} 
        />
      ) : (
        <Center h="60vh">
          <Stack align="center" gap={4}>
            <Text fontSize="4xl">📱</Text>
            <Text fontSize="lg" fontWeight="medium">Conta não encontrada</Text>
            <Text color="fg.muted" textAlign="center" maxW="400px">
              A conta WhatsApp solicitada não existe ou você não tem permissão para acessá-la.
            </Text>
          </Stack>
        </Center>
      )}
    </Box>
  );
};

export default WhatsAppChatPage;
