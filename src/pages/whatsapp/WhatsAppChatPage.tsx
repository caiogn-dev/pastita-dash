/**
 * WhatsAppChatPage - Página de chat WhatsApp
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { useAccountStore } from '../../stores/accountStore';
import { Button } from '../../components/common';

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
      <div className="p-4 h-screen">
        <h1 className="text-2xl font-bold mb-4">WhatsApp Chat</h1>
        <div className="text-center mt-10">
          <p className="mb-4">Nenhuma conta selecionada</p>
          <p className="text-gray-500 mb-4">
            Selecione uma conta no dropdown acima ou cadastre uma nova conta.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate('/accounts')}>
              Ver Contas
            </Button>
            <Button onClick={() => navigate('/accounts/new')} variant="outline">
              Nova Conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-screen">
      <h1 className="text-2xl font-bold mb-4">WhatsApp Chat - {selectedAccount.name}</h1>
      <ChatWindow
        accountId={selectedAccount.id}
        accountName={selectedAccount.name}
      />
    </div>
  );
};

export default WhatsAppChatPage;
