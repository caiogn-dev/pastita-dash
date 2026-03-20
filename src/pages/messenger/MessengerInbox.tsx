/**
 * MessengerInbox - Inbox do Messenger (sem Chakra UI)
 */
import React, { useState } from 'react';
import { PaperAirplaneIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Conversation {
  id: string;
  customer_name: string;
  last_message: string;
  unread_count: number;
}

const mockConversations: Conversation[] = [
  { id: '1', customer_name: 'João Silva', last_message: 'Olá, gostaria de fazer um pedido', unread_count: 2 },
  { id: '2', customer_name: 'Maria Santos', last_message: 'Obrigado pelo atendimento!', unread_count: 0 },
];

export default function MessengerInbox() {
  const [conversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = conversations.filter((c) =>
    c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-64px)] grid grid-cols-[350px_1fr]">
      {/* Sidebar */}
      <div className="border-r border-border-primary bg-bg-subtle p-4 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-fg-primary">Messenger</h2>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-border-primary rounded-lg bg-bg-card text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Conversation list */}
        <div className="flex flex-col gap-2">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedConversation?.id === conv.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  : 'bg-bg-card border-border-primary hover:bg-bg-hover'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-fg-primary text-sm">{conv.customer_name}</p>
                  <p className="text-xs text-fg-muted truncate mt-0.5">{conv.last_message}</p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="ml-2 flex-shrink-0 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {conv.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="bg-bg-card flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-border-primary">
              <p className="font-semibold text-fg-primary">{selectedConversation.customer_name}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 p-5">
              <p className="text-fg-muted text-sm">Histórico de mensagens...</p>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border-primary flex gap-2">
              <input
                className="flex-1 px-3 py-2 text-sm border border-border-primary rounded-lg bg-bg-subtle text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Digite sua mensagem..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
              <button className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-fg-muted">Selecione uma conversa para começar</p>
          </div>
        )}
      </div>
    </div>
  );
}
