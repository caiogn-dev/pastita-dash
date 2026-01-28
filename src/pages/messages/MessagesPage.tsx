import React, { useState } from 'react';
import { PaperAirplaneIcon, TableCellsIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Header } from '../../components/layout';
import { Card, Button, Input, Textarea, Select, Modal, PageLoading } from '../../components/common';
import { ChatWindow } from '../../components/chat';
import { whatsappService, getErrorMessage } from '../../services';
import { useAccountStore } from '../../stores/accountStore';
import { Conversation } from '../../types';

type ViewMode = 'chat' | 'table';

export const MessagesPage: React.FC = () => {
  const { accounts, selectedAccount } = useAccountStore();
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [sendModal, setSendModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageForm, setMessageForm] = useState({
    account_id: '',
    to: '',
    text: '',
    type: 'text',
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await whatsappService.sendTextMessage({
        account_id: messageForm.account_id,
        to: messageForm.to,
        text: messageForm.text,
      });
      toast.success('Mensagem enviada com sucesso!');
      setSendModal(false);
      setMessageForm({ account_id: '', to: '', text: '', type: 'text' });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const handleConversationSelect = (conversation: Conversation | null) => {
    setSelectedConversation(conversation);
  };

  // Show loading if no account selected
  if (!selectedAccount) {
    return (
      <div>
        <Header
          title="Mensagens"
          subtitle="Selecione uma conta WhatsApp"
        />
        <div className="p-6">
          <Card className="flex flex-col items-center justify-center py-12">
            <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhuma conta selecionada
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              Selecione uma conta WhatsApp no menu superior para visualizar e gerenciar suas conversas.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Mensagens"
        subtitle={selectedConversation 
          ? `Conversa com ${selectedConversation.contact_name || selectedConversation.phone_number}`
          : `${selectedAccount.name}`
        }
        actions={
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('chat')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'chat'
                    ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <TableCellsIcon className="w-4 h-4" />
                Tabela
              </button>
            </div>

            <Button
              leftIcon={<PaperAirplaneIcon className="w-5 h-5" />}
              onClick={() => {
                setMessageForm({ ...messageForm, account_id: selectedAccount.id });
                setSendModal(true);
              }}
            >
              Nova Mensagem
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 overflow-hidden">
        {viewMode === 'chat' ? (
          <div className="h-full" style={{ minHeight: 'calc(100vh - 200px)' }}>
            <ChatWindow
              accountId={selectedAccount.id}
              accountName={selectedAccount.name}
              onConversationSelect={handleConversationSelect}
            />
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-12">
            <TableCellsIcon className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Visualização em Tabela
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
              A visualização em tabela está disponível para exportação e análise de dados.
              Use o modo Chat para interagir com seus clientes em tempo real.
            </p>
            <Button variant="secondary" onClick={() => setViewMode('chat')}>
              Voltar para Chat
            </Button>
          </Card>
        )}
      </div>

      {/* Send Message Modal */}
      <Modal
        isOpen={sendModal}
        onClose={() => setSendModal(false)}
        title="Enviar Nova Mensagem"
        size="md"
      >
        <form onSubmit={handleSendMessage} className="space-y-4">
          <Select
            label="Conta WhatsApp"
            required
            value={messageForm.account_id}
            onChange={(e) => setMessageForm({ ...messageForm, account_id: e.target.value })}
            options={[
              { value: '', label: 'Selecione uma conta' },
              ...accounts.map((acc) => ({ value: acc.id, label: acc.name })),
            ]}
          />
          <Input
            label="Número de Destino"
            required
            value={messageForm.to}
            onChange={(e) => setMessageForm({ ...messageForm, to: e.target.value })}
            placeholder="5511999999999"
            helperText="Digite o número com código do país (ex: 5511999999999)"
          />
          <Textarea
            label="Mensagem"
            required
            rows={4}
            value={messageForm.text}
            onChange={(e) => setMessageForm({ ...messageForm, text: e.target.value })}
            placeholder="Digite sua mensagem..."
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setSendModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSending}>
              Enviar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
