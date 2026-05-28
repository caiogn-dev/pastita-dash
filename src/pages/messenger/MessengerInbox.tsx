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
  DocumentTextIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { messengerService, MessengerConversation, MessengerMessage } from '../../services/messenger';
import { normalizePaginatedResponse } from '../../services/api';
import { ChatToolsPanel } from '../../components/chat/ChatToolsPanel';
import '../whatsapp/WhatsAppInbox.css';

const inputCls =
  'w-full rounded-xl border border-border-primary bg-bg-card px-3 py-2 text-sm text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-500';

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
  const [activePanel, setActivePanel] = useState<'templates' | 'tools' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setActivePanel(null);
    const next = new URLSearchParams(searchParams);
    if (conv.account) next.set('account', conv.account);
    next.set('conversation', conv.id);
    setSearchParams(next, { replace: true });
    setLoadingMessages(true);
    try {
      const r: any = await messengerService.getMessages(conv.id);
      const msgs = normalizePaginatedResponse<MessengerMessage>(r.data);
      setMessages(msgs);
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

  const handleToolsSend = async (message: string) => {
    if (!selectedConversation || !message.trim()) return;
    setSending(true);
    try {
      const r: any = await messengerService.sendMessage(selectedConversation.id, {
        content: message.trim(),
        message_type: 'text',
      });
      setMessages(prev => [...prev, r.data]);
    } finally {
      setSending(false);
    }
  };

  function togglePanel(panel: 'templates' | 'tools') {
    setActivePanel(prev => prev === panel ? null : panel);
  }

  function handleInsertText(text: string) {
    setMessageText(text);
  }

  const filtered = conversations.filter((c) => {
    const name = (c.participant_name || c.psid || '').toLowerCase();
    const preview = (c.last_message as any)?.content?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    return name.includes(q) || preview.includes(q);
  });

  return (
    <div className="whatsapp-inbox">
      {/* Conversations panel */}
      <div className="conversations-panel">
        <div className="border-b border-border-primary p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-500 p-2 text-white">
              <PaperAirplaneIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-fg-primary">Messenger</h1>
              <p className="text-xs text-fg-muted">{conversations.length} conversa(s)</p>
            </div>
            <button
              type="button"
              onClick={loadConversations}
              className="ml-auto rounded-lg p-2 text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg-primary"
              title="Atualizar"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="py-8 text-center text-sm text-fg-muted">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-fg-muted">Nenhuma conversa.</p>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => selectConversation(conv)}
                className={`mb-2 w-full rounded-2xl border p-3 text-left transition-colors ${
                  selectedConversation?.id === conv.id
                    ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                    : 'border-[var(--dark-border,#2a2a2a)] bg-bg-card hover:bg-bg-hover'
                }`}
              >
                <div className="flex items-start gap-3">
                  {conv.participant_profile_pic ? (
                    <img
                      src={conv.participant_profile_pic}
                      alt={conv.participant_name || ''}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-300">
                        {(conv.participant_name || conv.psid || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-fg-primary">
                        {conv.participant_name || conv.psid}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-500 px-1 text-[11px] font-semibold text-white">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-fg-muted">
                      {(conv.last_message as any)?.content || '—'}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className={`chat-panel ${activePanel ? 'panel-open' : ''}`}>
        {!selectedConversation ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 rounded-3xl bg-blue-500 p-4 text-white/90">
              <PaperAirplaneIcon className="h-10 w-10" />
            </div>
            <h2 className="text-lg font-semibold text-fg-primary">Selecione uma conversa</h2>
            <p className="mt-2 max-w-md text-sm text-fg-muted">
              As mensagens do Messenger vão aparecer aqui assim que você selecionar uma conversa.
            </p>
          </div>
        ) : (
          <>
            <div className="chat-header">
              {selectedConversation.participant_profile_pic ? (
                <img
                  src={selectedConversation.participant_profile_pic}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-300">
                    {(selectedConversation.participant_name || selectedConversation.psid || '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg-primary">
                  {selectedConversation.participant_name || selectedConversation.psid}
                </p>
                <p className="text-xs text-fg-muted">Messenger</p>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                Facebook
              </span>
              <button
                type="button"
                className={`tools-toggle-btn ${activePanel === 'templates' ? 'active' : ''}`}
                onClick={() => togglePanel('templates')}
                title="Templates"
              >
                <DocumentTextIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                className={`tools-toggle-btn ${activePanel === 'tools' ? 'active' : ''}`}
                onClick={() => togglePanel('tools')}
                title="Ferramentas"
              >
                <BoltIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="messages-container">
              {loadingMessages ? (
                <p className="py-10 text-center text-sm text-fg-muted">Carregando mensagens...</p>
              ) : messages.length === 0 ? (
                <p className="py-10 text-center text-sm text-fg-muted">Nenhuma mensagem ainda.</p>
              ) : (
                <div className="messages-list">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_from_page ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[72%] rounded-2xl px-4 py-3 shadow-sm ${
                          msg.is_from_page
                            ? 'rounded-br-sm bg-blue-500 text-white'
                            : 'rounded-bl-sm border border-border-primary bg-bg-card text-fg-primary'
                        }`}
                      >
                        {msg.attachment_url ? (
                          <img src={msg.attachment_url} alt="attachment" className="max-w-full rounded-xl" crossOrigin="anonymous" />
                        ) : (
                          <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                        )}
                        <div className={`mt-2 flex items-center gap-1 text-xs ${msg.is_from_page ? 'justify-end text-blue-100' : 'justify-end text-fg-muted'}`}>
                          <span>
                            {new Date(msg.sent_at || msg.created_at).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {msg.is_from_page && (
                            msg.is_read
                              ? <CheckCircleIcon className="h-3.5 w-3.5 opacity-75" />
                              : <CheckIcon className="h-3.5 w-3.5 opacity-75" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-border-primary px-5 py-4">
              <div className="flex gap-3">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="Digite sua mensagem..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!messageText.trim() || sending}
                  className="rounded-xl bg-blue-500 p-3 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedConversation && activePanel && (
        <ChatToolsPanel
          key={activePanel}
          accountId={(selectedConversation.account as string) || ''}
          conversation={selectedConversation as any}
          onInsertText={handleInsertText}
          onSendMessage={handleToolsSend}
          onAfterSend={() => selectedConversation && void selectConversation(selectedConversation)}
          onClose={() => setActivePanel(null)}
          defaultTab={activePanel}
        />
      )}
    </div>
  );
}
