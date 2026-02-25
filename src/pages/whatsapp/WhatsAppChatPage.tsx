/**
 * WhatsAppChatPage - Página de chat WhatsApp
 */
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Heading, Text, Button } from '@chakra-ui/react';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { useAccountStore } from '../../stores/accountStore';
import { whatsappService } from '../../services';

export const WhatsAppChatPage: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { accounts, setAccounts, selectedAccount, setSelectedAccount } = useAccountStore();
  
  // Tenta encontrar a conta no store ou busca da API
  useEffect(() => {
    if (!accountId) return;
    
    // Se já temos a conta selecionada, usa ela
    if (selectedAccount?.id === accountId) return;
    
    // Tenta encontrar no store
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      setSelectedAccount(account);
      return;
    }
    
    // Se não encontrou, busca da API
    const fetchAccount = async () => {
      try {
        const accountData = await whatsappService.getAccount(accountId);
        setSelectedAccount(accountData);
        setAccounts([...accounts, accountData]);
      } catch (error) {
        console.error('Erro ao carregar conta:', error);
      }
    };
    
    fetchAccount();
  }, [accountId, accounts, selectedAccount, setAccounts, setSelectedAccount]);

  const account = selectedAccount?.id === accountId ? selectedAccount : accounts.find(a => a.id === accountId);

  if (!account) {
    return (
      <Box p={4} h="100vh">
        <Heading mb={4}>WhatsApp Chat</Heading>
        <Box textAlign="center" mt={10}>
          <Text mb={4}>Conta não encontrada ou carregando...</Text>
          <Button onClick={() => navigate('/whatsapp/accounts')} colorPalette="green">
            Ver Contas WhatsApp
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box p={4} h="100vh">
      <Heading mb={4}>WhatsApp Chat</Heading>
      <ChatWindow accountId={accountId!} accountName={account.name} />
    </Box>
  );
};

export default WhatsAppChatPage;
