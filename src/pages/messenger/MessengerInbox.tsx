/**
 * MessengerInbox - Inbox do Messenger (sem Chakra UI)
 */
import React, { useState, useEffect } from 'react';
import { PaperAirplaneIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { conversationsService } from '../../services/conversations';
import { Conversation } from '../../types';

export default function MessengerInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    conversationsService.getConversations({ status: 'open' })
      .then((res) => setConversations(res.results ?? (res as unknown as Conversation[])))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = conversations.filter((c) => {
    const name = (c.contact_name || c.phone_number).toLowerCase();
    const preview = (c.last_message_preview || c.last_message || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || preview.includes(q);
  });

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
        <div className="flex flex-col gap-2 overflow-y-auto">
          {loading ? (
            <p className="text-fg-muted text-sm text-center py-4">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-fg-muted text-sm text-center py-4">Nenhuma conversa encontrada.</p>
          ) : (
            filtered.map((conv) => (
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
                    <p className="font-semibold text-fg-primary text-sm">
                      {conv.contact_name || conv.phone_number}
                    </p>
                    <p className="text-xs text-fg-muted truncate mt-0.5">
                      {conv.last_message_preview || conv.last_message || '—'}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="ml-2 flex-shrink-0 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="bg-bg-card flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="px-5 py-4 border-b border-border-primary">
              <p className="font-semibold text-fg-primary">
                {selectedConversation.contact_name || selectedConversation.phone_number}
              </p>
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
