import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  UserIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

import {
  InstagramAccount,
  InstagramConversation,
  InstagramMessage,
  instagramAccountService,
  instagramDirectService,
} from '../../services/instagram';
import { getErrorMessage, normalizePaginatedResponse } from '../../services/api';

const inputCls =
  'w-full rounded-xl border border-border-primary bg-bg-card px-3 py-2 text-sm text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-500';

const messageStatusIcon: Record<string, React.ElementType> = {
  pending: ClockIcon,
  sent: CheckIcon,
  delivered: CheckIcon,
  read: CheckCircleIcon,
  received: CheckCircleIcon,
  failed: XCircleIcon,
};

function sortByLatest<T extends { last_message_at?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const right = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return right - left;
  });
}

export default function InstagramInbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [conversations, setConversations] = useState<InstagramConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState<InstagramMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const markingConversationIdRef = useRef<string | null>(null);

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;

  useEffect(() => {
    void loadAccounts();
  }, []);

  useEffect(() => {
    if (!selectedAccountId) {
      return;
    }

    void loadConversations(false);
    const interval = window.setInterval(() => {
      void loadConversations(true);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [selectedAccountId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    void loadMessages(selectedConversationId, false);
    const interval = window.setInterval(() => {
      void loadMessages(selectedConversationId, true);
    }, 12000);

    return () => window.clearInterval(interval);
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId || !selectedConversation || selectedConversation.unread_count <= 0) {
      return;
    }

    void markConversationAsRead(selectedConversationId);
  }, [selectedConversationId, selectedConversation?.unread_count]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const haystack = [
        conversation.participant_name,
        conversation.participant_username,
        conversation.participant_id,
        conversation.last_message_preview,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [conversations, searchQuery]);

  async function loadAccounts() {
    setLoadingAccounts(true);
    try {
      const response = await instagramAccountService.list();
      const accountList = normalizePaginatedResponse<InstagramAccount>(response.data);
      setAccounts(accountList);

      const requestedAccountId = searchParams.get('account');
      const nextAccountId =
        (requestedAccountId && accountList.find((account) => account.id === requestedAccountId)?.id) ||
        accountList[0]?.id ||
        '';
      setSelectedAccountId(nextAccountId);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function loadConversations(isBackgroundRefresh: boolean) {
    if (!selectedAccountId) {
      return;
    }

    if (isBackgroundRefresh) {
      setRefreshing(true);
    } else {
      setLoadingConversations(true);
    }

    try {
      const response = await instagramDirectService.getConversations(selectedAccountId);
      const conversationList = sortByLatest(
        normalizePaginatedResponse<InstagramConversation>(response.data)
      );
      setConversations(conversationList);

      const requestedConversationId = searchParams.get('conversation');
      const fallbackConversationId =
        selectedConversationId && conversationList.some((item) => item.id === selectedConversationId)
          ? selectedConversationId
          : '';
      const nextConversationId =
        (requestedConversationId &&
          conversationList.find((conversation) => conversation.id === requestedConversationId)?.id) ||
        fallbackConversationId ||
        conversationList[0]?.id ||
        '';

      setSelectedConversationId(nextConversationId);
      setError(null);
    } catch (err) {
      if (!isBackgroundRefresh) {
        setError(getErrorMessage(err));
      }
      setConversations([]);
      setSelectedConversationId('');
    } finally {
      setLoadingConversations(false);
      setRefreshing(false);
    }
  }

  async function loadMessages(conversationId: string, isBackgroundRefresh: boolean) {
    if (!conversationId) {
      return;
    }

    if (!isBackgroundRefresh) {
      setLoadingMessages(true);
    }

    try {
      const response = await instagramDirectService.getMessages(conversationId);
      const nextMessages = normalizePaginatedResponse<InstagramMessage>(response.data);
      setMessages(nextMessages);

      setError(null);
    } catch (err) {
      if (!isBackgroundRefresh) {
        setError(getErrorMessage(err));
      }
      if (!isBackgroundRefresh) {
        setMessages([]);
      }
    } finally {
      setLoadingMessages(false);
    }
  }

  async function markConversationAsRead(conversationId: string) {
    if (markingConversationIdRef.current === conversationId) {
      return;
    }

    markingConversationIdRef.current = conversationId;
    try {
      const markResponse = await instagramDirectService.markAsRead(conversationId);
      const updatedConversation = markResponse.data;
      setConversations((previous) =>
        sortByLatest(
          previous.map((item) => (item.id === conversationId ? { ...item, ...updatedConversation } : item))
        )
      );
      setMessages((previous) =>
        previous.map((message) =>
          message.direction === 'inbound'
            ? {
                ...message,
                is_read: true,
                status: 'read',
              }
            : message
        )
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      markingConversationIdRef.current = null;
    }
  }

  function handleSelectAccount(accountId: string) {
    setSelectedAccountId(accountId);
    setSelectedConversationId('');
    setMessages([]);
    const next = new URLSearchParams(searchParams);
    next.set('account', accountId);
    next.delete('conversation');
    setSearchParams(next, { replace: true });
  }

  function handleSelectConversation(conversation: InstagramConversation) {
    setSelectedConversationId(conversation.id);
    const next = new URLSearchParams(searchParams);
    next.set('account', conversation.account);
    next.set('conversation', conversation.id);
    setSearchParams(next, { replace: true });
  }

  async function handleSendMessage() {
    if (!selectedConversation || !messageText.trim() || sending) {
      return;
    }

    const content = messageText.trim();
    setSending(true);
    try {
      const response = await instagramDirectService.sendMessage(selectedConversation.id, {
        content,
        message_type: 'TEXT',
      });

      const sentMessage = response.data;
      setMessages((previous) => [...previous, sentMessage]);
      setMessageText('');
      setConversations((previous) =>
        sortByLatest(
          previous.map((item) =>
            item.id === selectedConversation.id
              ? {
                  ...item,
                  unread_count: 0,
                  last_message_at: sentMessage.created_at,
                  last_message_preview: sentMessage.content || item.last_message_preview,
                  last_message: {
                    type: sentMessage.message_type || 'TEXT',
                    content: sentMessage.content || '',
                    created_at: sentMessage.created_at,
                  },
                }
              : item
          )
        )
      );
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  function formatConversationTime(value?: string | null) {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) {
      return 'Ontem';
    }
    if (diffDays < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  function renderStatusIcon(message: InstagramMessage) {
    const StatusIcon = messageStatusIcon[message.status ?? ''];
    if (!StatusIcon || message.direction !== 'outbound') {
      return null;
    }
    return <StatusIcon className="h-3.5 w-3.5 opacity-75" />;
  }

  return (
    <div className="flex h-[calc(100vh-88px)] gap-4 p-4">
      <section className="flex w-[360px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-card">
        <div className="border-b border-border-primary p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-2 text-white">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-fg-primary">Instagram Inbox</h1>
              <p className="text-xs text-fg-muted">
                {loadingAccounts ? 'Carregando contas...' : `${conversations.length} conversa(s)`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadConversations(false)}
              className="ml-auto rounded-lg p-2 text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg-primary"
              title="Atualizar conversas"
            >
              <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            <select
              value={selectedAccountId}
              onChange={(event) => handleSelectAccount(event.target.value)}
              className={inputCls}
              disabled={loadingAccounts || accounts.length === 0}
            >
              {accounts.length === 0 ? (
                <option value="">Nenhuma conta conectada</option>
              ) : (
                accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    @{account.username}
                  </option>
                ))
              )}
            </select>

            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar por nome, @usuario ou mensagem"
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingConversations ? (
            <div className="py-10 text-center text-sm text-fg-muted">Carregando conversas...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-10 text-center text-sm text-fg-muted">
              {searchQuery ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa disponivel.'}
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const isSelected = conversation.id === selectedConversationId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => handleSelectConversation(conversation)}
                  className={`mb-2 w-full rounded-2xl border p-3 text-left transition-colors ${
                    isSelected
                      ? 'border-pink-300 bg-pink-50 dark:border-pink-700 dark:bg-pink-900/20'
                      : 'border-border-primary bg-bg-card hover:bg-bg-hover'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                      {conversation.participant_profile_pic ? (
                        <img
                          src={conversation.participant_profile_pic}
                          alt={conversation.participant_name || conversation.participant_username || 'Perfil'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                          {(conversation.participant_name ||
                            conversation.participant_username ||
                            conversation.participant_id ||
                            '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-fg-primary">
                          {conversation.participant_name ||
                            `@${conversation.participant_username || conversation.participant_id}`}
                        </p>
                        <span className="shrink-0 text-xs text-fg-muted">
                          {formatConversationTime(conversation.last_message_at)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-fg-muted">
                        {conversation.participant_username
                          ? `@${conversation.participant_username}`
                          : conversation.participant_id}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm text-fg-primary">
                          {conversation.last_message_preview || 'Sem mensagens ainda'}
                        </p>
                        {conversation.unread_count > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-pink-500 px-1 text-[11px] font-semibold text-white">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border-primary bg-bg-card">
        {!selectedConversation ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 rounded-3xl bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-4 text-white/90">
              <UserIcon className="h-10 w-10" />
            </div>
            <h2 className="text-lg font-semibold text-fg-primary">Selecione uma conversa</h2>
            <p className="mt-2 max-w-md text-sm text-fg-muted">
              As mensagens que ja chegaram no backend vao aparecer aqui assim que voce abrir a conversa.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-border-primary px-5 py-4">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                {selectedConversation.participant_profile_pic ? (
                  <img
                    src={selectedConversation.participant_profile_pic}
                    alt={selectedConversation.participant_name || 'Perfil'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                    {(selectedConversation.participant_name ||
                      selectedConversation.participant_username ||
                      selectedConversation.participant_id ||
                      '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg-primary">
                  {selectedConversation.participant_name ||
                    `@${selectedConversation.participant_username || selectedConversation.participant_id}`}
                </p>
                <p className="truncate text-xs text-fg-muted">
                  {selectedConversation.participant_username
                    ? `@${selectedConversation.participant_username}`
                    : selectedConversation.participant_id}
                </p>
              </div>
              <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-medium text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
                Instagram DM
              </span>
            </header>

            <div className="flex-1 overflow-y-auto bg-bg-subtle px-5 py-4">
              {loadingMessages ? (
                <div className="py-10 text-center text-sm text-fg-muted">Carregando mensagens...</div>
              ) : messages.length === 0 ? (
                <div className="py-10 text-center text-sm text-fg-muted">
                  Nenhuma mensagem sincronizada nesta conversa ainda.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((message) => {
                    const isOutbound = message.direction === 'outbound';
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[72%] rounded-2xl px-4 py-3 shadow-sm ${
                            isOutbound
                              ? 'rounded-br-sm bg-pink-500 text-white'
                              : 'rounded-bl-sm border border-border-primary bg-bg-card text-fg-primary'
                          }`}
                        >
                          {message.media_url && (
                            <div className="mb-2 overflow-hidden rounded-xl">
                              {message.message_type?.toUpperCase() === 'IMAGE' ? (
                                <img src={message.media_url} alt="Midia" className="max-h-72 w-full object-cover" />
                              ) : (
                                <div className="flex items-center gap-2 rounded-xl bg-black/10 px-3 py-2 text-sm">
                                  <PhotoIcon className="h-4 w-4" />
                                  <span>{message.message_type || 'Midia'}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {message.content && (
                            <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                          )}
                          <div
                            className={`mt-2 flex items-center gap-1 text-xs ${
                              isOutbound ? 'justify-end text-white/80' : 'justify-end text-fg-muted'
                            }`}
                          >
                            <span>
                              {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {renderStatusIcon(message)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <footer className="border-t border-border-primary px-5 py-4">
              <div className="flex gap-3">
                <input
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder="Digite uma mensagem para responder no Instagram..."
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={!messageText.trim() || sending}
                  className="rounded-xl bg-pink-500 p-3 text-white transition-colors hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      {error && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
