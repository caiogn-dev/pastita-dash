/**
 * MessengerInbox - Inbox do Facebook Messenger
 */
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { messengerService, MessengerConversation, MessengerMessage } from '../../services/messenger';
import { normalizePaginatedResponse } from '../../services/api';

export default function MessengerInbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<MessengerConversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, [searchParams.toString()]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = () => {
    setLoading(true);
    messengerService.getConversations(searchParams.get('account') || undefined)
      .then((r: any) => {
        const list = normalizePaginatedResponse<MessengerConversation>(r.data);
        setConversations(list);
        const requestedConversationId = searchParams.get('conversation');
        if (requestedConversationId) {
          const conversation = list.find((item) => item.id === requestedConversationId);
          if (conversation) {
            void selectConversation(conversation);
          }
        }
      })
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  };

  const selectConversation = async (conv: MessengerConversation) => {
    setSelectedConversation(conv);
    const next = new URLSearchParams(searchParams);
    if (conv.account) {
      next.set('account', conv.account);
    }
    next.set('conversation', conv.id);
    setSearchParams(next, { replace: true });
    setLoadingMessages(true);
    try {
      const r: any = await messengerService.getMessages(conv.id);
      const msgs = normalizePaginatedResponse<MessengerMessage>(r.data);
      setMessages(msgs);
      // Mark as read
      if (conv.unread_count > 0) {
        await messengerService.markAsRead(conv.id);
        setConversations(prev =>
          prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
        );
      }
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    if (!selectedConversation || !messageText.trim() || sending) return;
    const content = messageText.trim();
    setMessageText('');
    setSending(true);
    try {
      const r: any = await messengerService.sendMessage(selectedConversation.id, {
        content,
        message_type: 'text',
      });
      const newMsg: MessengerMessage = r.data;
      setMessages(prev => [...prev, newMsg]);
    } catch {
      setMessageText(content);
    } finally {
      setSending(false);
    }
  };

  const filtered = conversations.filter((c) => {
    const name = (c.participant_name || c.psid || '').toLowerCase();
    const preview = (c.last_message as any)?.content?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    return name.includes(q) || preview.includes(q);
  });

  return (
    <div className="h-[calc(100vh-64px)] grid grid-cols-[350px_1fr]">
      {/* Sidebar */}
      <div className="border-r border-border-primary bg-bg-subtle flex flex-col">
        <div className="p-4 border-b border-border-primary flex items-center justify-between">
          <h2 className="text-lg font-bold text-fg-primary">Messenger</h2>
          <button onClick={loadConversations} className="p-1 text-fg-muted hover:text-fg-primary">
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm border border-border-primary rounded-lg bg-bg-card text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-1">
          {loading ? (
            <p className="text-fg-muted text-sm text-center py-8">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-fg-muted text-sm text-center py-8">Nenhuma conversa.</p>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedConversation?.id === conv.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-bg-card border-border-primary hover:bg-bg-hover'
                }`}
              >
                <div className="flex items-center gap-3">
                  {conv.participant_profile_pic ? (
                    <img
                      src={conv.participant_profile_pic}
                      alt={conv.participant_name || ''}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-300 text-sm font-bold">
                        {(conv.participant_name || conv.psid || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-fg-primary text-sm truncate">
                        {conv.participant_name || conv.psid}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="ml-2 flex-shrink-0 min-w-[20px] h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium px-1">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-fg-muted truncate mt-0.5">
                      {(conv.last_message as any)?.content || '—'}
                    </p>
                  </div>
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
            <div className="px-5 py-3 border-b border-border-primary flex items-center gap-3">
              {selectedConversation.participant_profile_pic ? (
                <img
                  src={selectedConversation.participant_profile_pic}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-300 text-sm font-bold">
                    {(selectedConversation.participant_name || selectedConversation.psid || '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-semibold text-fg-primary text-sm">
                  {selectedConversation.participant_name || selectedConversation.psid}
                </p>
                <p className="text-xs text-fg-muted">Messenger</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {loadingMessages ? (
                <p className="text-fg-muted text-sm text-center py-8">Carregando mensagens...</p>
              ) : messages.length === 0 ? (
                <p className="text-fg-muted text-sm text-center py-8">Nenhuma mensagem ainda.</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.is_from_page ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                        msg.is_from_page
                          ? 'bg-blue-500 text-white rounded-br-sm'
                          : 'bg-bg-subtle text-fg-primary rounded-bl-sm border border-border-primary'
                      }`}
                    >
                      {msg.attachment_url ? (
                        <img src={msg.attachment_url} alt="attachment" className="max-w-full rounded" />
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                      <div className={`flex items-center gap-1 mt-1 ${msg.is_from_page ? 'justify-end' : 'justify-start'}`}>
                        <span className={`text-xs ${msg.is_from_page ? 'text-blue-100' : 'text-fg-muted'}`}>
                          {new Date(msg.sent_at || msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.is_from_page && (
                          msg.is_read
                            ? <CheckCircleIcon className="w-3 h-3 text-blue-100" />
                            : <CheckIcon className="w-3 h-3 text-blue-100" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border-primary flex gap-2 items-end">
              <input
                className="flex-1 px-3 py-2 text-sm border border-border-primary rounded-lg bg-bg-subtle text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Digite sua mensagem..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <button
                onClick={handleSend}
                disabled={!messageText.trim() || sending}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <PaperAirplaneIcon className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-fg-muted text-sm">Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
