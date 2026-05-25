/**
 * WhatsAppChatPage - Página de chat WhatsApp
 */
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { useAccountStore } from '../../stores/accountStore';
import { Button } from '../../components/common';
import { Conversation } from '../../types';

export const WhatsAppChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const phoneFromUrl = searchParams.get('phone')?.replace(/\D/g, '') || null;
  const { accounts, selectedAccount, setSelectedAccount } = useAccountStore();

  useEffect(() => {
    if (!selectedAccount && accounts.length > 0) {
      setSelectedAccount(accounts[0]);
    }
  }, [selectedAccount, accounts, setSelectedAccount]);

  if (!selectedAccount) {
    return (
      <div className="p-4 h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">WhatsApp Chat</h1>
        <p className="text-[var(--fg-secondary)]">Nenhuma conta selecionada</p>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/accounts')}>Ver Contas</Button>
          <Button onClick={() => navigate('/accounts/new')} variant="outline">Nova Conta</Button>
        </div>
      </div>
    );
  }

  const handleConversationSelect = (conv: Conversation | null) => {
    if (conv && phoneFromUrl) {
      navigate('/whatsapp/chat', { replace: true });
    }
  };

  return (
    <div className="h-[calc(100vh-56px)]">
      <ChatWindow
        accountId={selectedAccount.id}
        accountName={selectedAccount.name}
        initialPhone={phoneFromUrl || undefined}
        onConversationSelect={handleConversationSelect}
      />
    </div>
  );
};

export default WhatsAppChatPage;
