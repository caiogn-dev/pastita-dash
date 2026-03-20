import React, { useState, useEffect, useRef } from 'react';
import {
  UserIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  ArrowPathIcon,
  ClockIcon,
  CheckIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import {
  instagramDirectService,
  instagramAccountService,
  InstagramAccount,
} from '../../services/instagram';

interface InstagramConversation {
  id: string;
  account: string;
  participant_id: string;
  participant_username?: string;
  participant_name?: string;
  participant_profile_pic?: string;
  last_message_preview?: string;
  last_message_at?: string;
  unread_count: number;
  status: 'active' | 'closed';
}

interface InstagramMessage {
  id: string;
  conversation: string;
  content: string;
  direction: 'inbound' | 'outbound';
  message_type?: string;
  media_url?: string;
  status?: string;
  created_at: string;
}

const messageStatusIcon: Record<string, React.ElementType> = {
  pending: ClockIcon,
  sent: CheckIcon,
  delivered: CheckIcon,
  seen: CheckCircleIcon,
  failed: XCircleIcon,
};

const inputCls = 'w-full px-3 py-2 text-sm border border-border-primary rounded-lg bg-bg-card text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-500';

export default function InstagramInbox() {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [conversations, setConversations] = useState<InstagramConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<InstagramConversation | null>(null);
  const [messages, setMessages] = useState<InstagramMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { if (selectedAccountId) loadConversations(); }, [selectedAccountId]);
  useEffect(() => { if (selectedConversation) loadMessages(); }, [selectedConversation]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadAccounts = async () => {
    try {
      const response = await instagramAccountService.list();
      const results = response.data || [];
      setAccounts(results);
      if (results.length > 0) setSelectedAccountId(results[0].id);
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Erro ao carregar contas');
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    if (!selectedAccountId) return;
    try {
      setLoading(true);
      const response = await instagramDirectService.getConversations(selectedAccountId);
      // @ts-ignore
      setConversations(response.data?.results || response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedConversation) return;
    try {
      setLoadingMessages(true);
      const response = await instagramDirectService.getMessages(selectedConversation.id);
      // @ts-ignore
      const results = response.data?.results || response.data || [];
      setMessages(results.reverse());
      try { await instagramDirectService.markAsRead(selectedConversation.id); } catch { /* ignore */ }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    try {
      setSending(true);
      const response = await instagramDirectService.sendMessage(selectedConversation.id, newMessage.trim());
      // @ts-ignore
      const sentMessage = response.data;
      if (sentMessage) setMessages((prev) => [...prev, sentMessage]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.participant_username?.toLowerCase().includes(q) ||
      conv.participant_name?.toLowerCase().includes(q) ||
      conv.last_message_preview?.toLowerCase().includes(q)
    );
  });

  const formatTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getStatusIcon = (status?: string) => messageStatusIcon[status ?? ''] ?? null;

  const Avatar = ({ name, src }: { name?: string; src?: string }) => (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden">
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : (name?.[0]?.toUpperCase() || 'U')}
    </div>
  );

  const Spinner = () => (
    <svg className="animate-spin w-6 h-6 text-brand-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  return (
    <div className="flex gap-4 p-4" style={{ height: 'calc(100vh - 100px)' }}>
      {/* Sidebar */}
      <div className="w-80 shrink-0 flex flex-col bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border-primary">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 text-white">
              <UserIcon className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-fg-primary">Instagram DM</h2>
            <div className="flex-1" />
            <button
              onClick={loadConversations}
              title="Atualizar"
              className="p-1.5 rounded hover:bg-bg-hover text-fg-muted transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>

          {accounts.length > 1 && (
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className={`${inputCls} mb-3`}
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>@{acc.username}</option>
              ))}
            </select>
          )}

          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${inputCls} pl-9`}
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <UserIcon className="w-12 h-12 text-fg-muted mx-auto mb-2" />
              <p className="text-sm text-fg-muted">
                {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div key={conv.id}>
                <div
                  onClick={() => setSelectedConversation(conv)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    selectedConversation?.id === conv.id
                      ? 'bg-bg-active'
                      : 'hover:bg-bg-hover'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={conv.participant_username} src={conv.participant_profile_pic} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className={`text-sm truncate ${conv.unread_count > 0 ? 'font-bold text-fg-primary' : 'text-fg-primary'}`}>
                          @{conv.participant_username || conv.participant_id}
                        </span>
                        <span className="text-xs text-fg-muted shrink-0 ml-2">{formatTime(conv.last_message_at)}</span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? 'text-fg-primary font-medium' : 'text-fg-muted'}`}>
                        {conv.last_message_preview || 'Nenhuma mensagem'}
                      </p>
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="shrink-0 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
                <div className="border-b border-border-primary" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        {!selectedConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center text-fg-muted">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 text-white opacity-50 mb-4">
              <UserIcon className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-semibold text-fg-primary mb-1">Selecione uma conversa</h3>
            <p className="text-sm text-fg-muted">Escolha uma conversa da lista para ver as mensagens</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-border-primary flex items-center gap-3">
              <Avatar name={selectedConversation.participant_username} src={selectedConversation.participant_profile_pic} />
              <div className="flex-1">
                <p className="text-sm font-bold text-fg-primary">
                  {selectedConversation.participant_name || `@${selectedConversation.participant_username}`}
                </p>
                <p className="text-xs text-fg-muted">
                  @{selectedConversation.participant_username || selectedConversation.participant_id}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                selectedConversation.status === 'active'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {selectedConversation.status === 'active' ? 'Ativo' : 'Fechado'}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-bg-subtle flex flex-col gap-2">
              {loadingMessages ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-fg-muted py-8">Nenhuma mensagem ainda. Envie a primeira!</p>
              ) : (
                messages.map((msg) => {
                  const isOut = msg.direction === 'outbound';
                  const StatusIcon = getStatusIcon(msg.status);
                  return (
                    <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-3 py-2 rounded-lg shadow-sm ${
                        isOut
                          ? 'bg-blue-500 text-white rounded-tr-none'
                          : 'bg-bg-card text-fg-primary rounded-tl-none border border-border-primary'
                      }`}>
                        {msg.media_url && (
                          <div className="mb-2">
                            {msg.message_type === 'image' ? (
                              <img src={msg.media_url} alt="Imagem" className="max-w-full rounded-lg" />
                            ) : msg.message_type === 'video' ? (
                              <video src={msg.media_url} controls className="max-w-full rounded-lg" />
                            ) : (
                              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-black/10 rounded">
                                <PhotoIcon className="w-4 h-4" />{msg.message_type}
                              </span>
                            )}
                          </div>
                        )}
                        {msg.content && <p className="text-sm">{msg.content}</p>}
                        <div className="flex justify-end items-center gap-1 mt-1">
                          <span className="text-xs opacity-70">{formatTime(msg.created_at)}</span>
                          {isOut && StatusIcon && <StatusIcon className="w-3 h-3 opacity-70" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border-primary flex gap-2">
              <input
                type="text"
                placeholder="Digite uma mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className={`${inputCls} flex-1`}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending
                  ? <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  : <PaperAirplaneIcon className="w-5 h-5" />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg shadow-lg border-l-4 border-red-500">
          <XCircleIcon className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}
    </div>
  );
}
