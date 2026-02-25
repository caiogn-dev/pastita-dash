/**
 * WhatsAppChatPage - Página de chat WhatsApp
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Heading, Text } from '@chakra-ui/react';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { useAccountStore } from '../../stores/accountStore';
export const WhatsAppChatPage: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const { accounts } = useAccountStore();
  const account = accounts.find(a => a.id === accountId);
  return (
    <Box p={4} h="100vh">
      <Heading mb={4}>WhatsApp Chat</Heading>
      {account ? (
        <ChatWindow accountId={accountId!} accountName={account.name} />
      ) : (
        <Text>Conta não encontrada</Text>
      )}
    </Box>
  );
};
export default WhatsAppChatPage;
