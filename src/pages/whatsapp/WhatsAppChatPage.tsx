/**
 * WhatsAppChatPage - Página de chat WhatsApp
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Heading, Text, Button } from '@chakra-ui/react';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { useAccountStore } from '../../stores/accountStore';

export const WhatsAppChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { accounts, selectedAccount, setSelectedAccount } = useAccountStore();

  // Se não tem conta selecionada mas tem contas disponíveis, seleciona a primeira
  useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0]);
    }
  }, [selectedAccount, accounts, setSelectedAccount]);

  if (!selectedAccount) {
    return (
      <Box p={4} h="100vh">
        <Heading mb={4}>WhatsApp Chat</Heading>
        <Box textAlign="center" mt={10}>
          <Text mb={4}>Nenhuma conta selecionada</Text>
          <Text color="gray.500" mb={4}>
            Selecione uma conta no dropdown acima ou cadastre uma nova conta.
          </Text>
          <Stack direction="row" gap={2} justify="center">
            <Button onClick={() => navigate('/accounts')} colorPalette="green">
              Ver Contas
            </Button>
            <Button onClick={() => navigate('/accounts/new')} variant="outline">
              Nova Conta
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box p={4} h="100vh">
      <Heading mb={4}>WhatsApp Chat - {selectedAccount.name}</Heading>
      <ChatWindow 
        accountId={selectedAccount.id} 
        accountName={selectedAccount.name} 
      />
    </Box>
  );
};

export default WhatsAppChatPage;
