import React, { useEffect, useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Header } from '../../components/layout';
import { Card, Button, Input, Textarea, Select, Table, StatusBadge, Modal, PageLoading } from '../../components/common';
import { whatsappService, getErrorMessage } from '../../services';
import { useAccountStore } from '../../stores/accountStore';
import { Message, WhatsAppAccount } from '../../types';

export const MessagesPage: React.FC = () => {
  const { accounts, selectedAccount } = useAccountStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendModal, setSendModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageForm, setMessageForm] = useState({
    account_id: '',
    to: '',
    text: '',
    type: 'text',
  });

  useEffect(() => {
    loadMessages();
  }, [selectedAccount]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedAccount) {
        params.account = selectedAccount.id;
      }
      const response = await whatsappService.getMessages(params);
      setMessages(response.results);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

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
      loadMessages();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const columns = [
    {
      key: 'direction',
      header: 'Direção',
      render: (msg: Message) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          msg.direction === 'inbound' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
        }`}>
          {msg.direction === 'inbound' ? '← Recebida' : '→ Enviada'}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Contato',
      render: (msg: Message) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {msg.direction === 'inbound' ? msg.from_number : msg.to_number}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{msg.account_name}</p>
        </div>
      ),
    },
    {
      key: 'content',
      header: 'Conteúdo',
      render: (msg: Message) => (
        <div className="max-w-md">
          <p className="text-sm text-gray-900 dark:text-white truncate">
            {msg.text_body || `[${msg.message_type}]`}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (msg: Message) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{msg.message_type}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (msg: Message) => <StatusBadge status={msg.status} />,
    },
    {
      key: 'created_at',
      header: 'Data',
      render: (msg: Message) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div>
      <Header
        title="Mensagens"
        subtitle={`${messages.length} mensagem(ns)`}
        actions={
          <Button
            leftIcon={<PaperAirplaneIcon className="w-5 h-5" />}
            onClick={() => setSendModal(true)}
          >
            Nova Mensagem
          </Button>
        }
      />

      <div className="p-6">
        <Card noPadding>
          <Table
            columns={columns}
            data={messages}
            keyExtractor={(msg) => msg.id}
            emptyMessage="Nenhuma mensagem encontrada"
          />
        </Card>
      </div>

      {/* Send Message Modal */}
      <Modal
        isOpen={sendModal}
        onClose={() => setSendModal(false)}
        title="Enviar Mensagem"
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
