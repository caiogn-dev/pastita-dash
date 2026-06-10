/**
 * ChatWindow - Interface de Chat WhatsApp estilo WhatsApp Web
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  BoltIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

import { MessageBubble, MessageBubbleProps } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { MediaViewer } from './MediaViewer';
import { ContactInfoPanel } from './ContactInfoPanel';
import { CustomerPanel } from './CustomerPanel';
import { NewConversationModal } from './NewConversationModal';
import { NewOrderDrawer } from '../orders/NewOrderDrawer';
import type { CustomerSearchResult } from '../../types/crm';
import { getAvatarColor, getInitials } from '../../utils/avatar';
import { useWhatsAppWS, MessageReceivedEvent, MessageSentEvent, StatusUpdatedEvent, TypingEvent, ConversationUpdatedEvent } from '../../hooks/useWhatsAppWS';
import { whatsappService, conversationsService, getErrorMessage } from '../../services';
import { sendFile as sendFileApi } from '../../services/whatsapp';
import { handoverService } from '../../services/handover';
import { Message, Conversation } from '../../types';
import { useStore } from '../../hooks/useStore';

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export interface ChatWindowProps {
  accountId: string;
  accountName?: string;
  initialPhone?: string;
  onConversationSelect?: (conversation: Conversation | null) => void;
}

const messageToBubbleProps = (msg: Message): MessageBubbleProps => ({
  id: msg.id,
  direction: msg.direction as 'inbound' | 'outbound',
  messageType: msg.message_type,
  status: msg.status as 'pending' | 'sent' | 'delivered' | 'read' | 'failed',
  textBody: msg.text_body || msg.media_caption || msg.caption,
  content: msg.content,
  mediaUrl: msg.media_url,
  mediaType: msg.media_mime_type || msg.media_type,
  mimeType: msg.media_mime_type,
  fileName: msg.media_filename || msg.file_name,
  createdAt: msg.created_at,
  sentAt: msg.sent_at ?? undefined,
  deliveredAt: msg.delivered_at ?? undefined,
  readAt: msg.read_at ?? undefined,
  errorMessage: msg.error_message,
});

const getStoreUrl = (metadata?: Record<string, unknown>) => {
  const value = metadata?.website_url || metadata?.store_url || metadata?.public_url;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ accountId, accountName, initialPhone, onConversationSelect }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [typingContacts, setTypingContacts] = useState<Set<string>>(new Set());
  const [mediaViewer, setMediaViewer] = useState<{ url: string; type: string; fileName?: string } | null>(null);
  const [rightPanel, setRightPanel] = useState<'info' | 'templates' | 'tools' | 'customer' | null>(null);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newOrderCustomer, setNewOrderCustomer] = useState<CustomerSearchResult | null>(null);
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'human' | 'bot'>('all');
  const [insertText, setInsertText] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const { storeId, storeSlug, storeName, store } = useStore();

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendLockRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const { isConnected, connectionError, subscribeToConversation, unsubscribeFromConversation, sendTypingIndicator } =
    useWhatsAppWS({
      accountId,
      enabled: !!accountId,
      onMessageReceived: handleMessageReceived,
      onMessageSent: handleMessageSent,
      onMessage: (msg) => {
        const converted: Message = { ...msg, timestamp: msg.created_at, account: accountId, updated_at: msg.created_at } as unknown as Message;
        handleNewMessage(converted);
      },
      onStatusUpdated: handleStatusUpdated,
      onTyping: handleTyping,
      onConversationUpdated: handleConversationUpdated,
      onError: (event) => { toast.error(`Erro: ${event.error_message}`); },
    });

  const conversationsFetchRef = useRef<AbortController | null>(null);

  const loadConversations = useCallback(async () => {
    if (!accountId) return;
    // Cancelar requisição anterior para evitar race condition com buscas rápidas
    conversationsFetchRef.current?.abort();
    const controller = new AbortController();
    conversationsFetchRef.current = controller;
    setIsLoadingConversations(true);
    try {
      const search = debouncedSearchTerm.trim();
      const response = await conversationsService.getConversations({
        account: accountId,
        page_size: search ? 100 : 50,
        search: search || undefined,
      }, controller.signal);
      setConversations(ensureArray<Conversation>(response?.results || response));
    } catch (error) {
      if ((error as Error).name !== 'CanceledError' && (error as Error).name !== 'AbortError') {
        toast.error(getErrorMessage(error));
      }
    }
    finally { setIsLoadingConversations(false); }
  }, [accountId, debouncedSearchTerm]);

  const loadMessages = useCallback(async () => {
    if (!selectedConversation || !accountId) return;
    setIsLoadingMessages(true);
    try {
      const historyRes = await conversationsService.getMessages(selectedConversation.id, 100);
      setMessages(ensureArray<Message>(historyRes.results));
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setIsLoadingMessages(false); }
  }, [accountId, selectedConversation]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!initialPhone || conversations.length === 0) return;
    const match = conversations.find(c =>
      c.phone_number.replace(/\D/g, '').includes(initialPhone) ||
      initialPhone.includes(c.phone_number.replace(/\D/g, ''))
    );
    if (match) {
      setSelectedConversation(match);
      onConversationSelect?.(match);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhone, conversations]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      subscribeToConversation(selectedConversation.id);
      onConversationSelect?.(selectedConversation);
    } else {
      setMessages([]);
      onConversationSelect?.(null);
    }
    return () => { if (selectedConversation) unsubscribeFromConversation(selectedConversation.id); };
  }, [selectedConversation, loadMessages, subscribeToConversation, unsubscribeFromConversation, onConversationSelect]);

  const handleAutoScroll = useCallback((isReceived = true) => {
    if (isReceived && shouldAutoScrollRef.current) setTimeout(() => scrollToBottom(), 100);
  }, [scrollToBottom]);

  const handleContainerScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      shouldAutoScrollRef.current = scrollHeight - (scrollTop + clientHeight) < 100;
    }
  }, []);

  function handleMessageReceived(event: MessageReceivedEvent) {
    const newMessage = event.message;
    if (selectedConversation && event.conversation_id === selectedConversation.id) {
      setMessages(prev => {
        const isDuplicate = prev.some(m =>
          m.id === newMessage.id ||
          (newMessage.whatsapp_message_id && m.whatsapp_message_id === newMessage.whatsapp_message_id)
        );
        if (isDuplicate) return prev;
        return [...prev, newMessage as unknown as Message];
      });
      handleAutoScroll(true);
    }
    setConversations(prev => prev.map(c => c.id === event.conversation_id ? { ...c, last_message_at: newMessage.created_at } : c)
      .sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()));
    if (!selectedConversation || event.conversation_id !== selectedConversation.id) {
      toast(`Nova mensagem de ${event.contact?.name || newMessage.from_number}`, { icon: '💬' });
    }
  }

  function handleNewMessage(msg: Message) {
    if (selectedConversation && msg.conversation_id === selectedConversation.id) {
      setMessages(prev => {
        const isDuplicate = prev.some(m =>
          m.id === msg.id ||
          (msg.whatsapp_message_id && m.whatsapp_message_id === msg.whatsapp_message_id)
        );
        if (isDuplicate) return prev;
        return [...prev, msg];
      });
      if (msg.direction === 'inbound') handleAutoScroll(true);
    }
  }

  function handleMessageSent(event: MessageSentEvent) {
    const msg = event.message;
    if (selectedConversation && event.conversation_id === selectedConversation.id) {
      const converted: Message = { ...msg, account: accountId, updated_at: msg.created_at } as unknown as Message;
      setMessages(prev => {
        const isDuplicate = prev.some(m =>
          m.id === converted.id ||
          (converted.whatsapp_message_id && m.whatsapp_message_id === converted.whatsapp_message_id)
        );
        if (isDuplicate) return prev;
        return [...prev, converted];
      });
    }
  }

  function handleStatusUpdated(event: StatusUpdatedEvent) {
    setMessages(prev => prev.map(m =>
      (m.id === event.message_id || m.whatsapp_message_id === event.whatsapp_message_id) ? { ...m, status: event.status } : m
    ));
  }

  function handleTyping(event: TypingEvent) {
    setTypingContacts(prev => {
      const next = new Set(prev);
      if (event.is_typing) next.add(event.conversation_id); else next.delete(event.conversation_id);
      return next;
    });
  }

  function handleConversationUpdated(event: ConversationUpdatedEvent) {
    const wsConv = event.conversation;
    setConversations(prev => {
      if (prev.some(c => c.id === wsConv.id)) {
        return prev.map(c => c.id === wsConv.id
          ? { ...c, phone_number: wsConv.phone_number, contact_name: wsConv.contact_name, wa_id: wsConv.wa_id, profile_picture: wsConv.profile_picture, profile_picture_url: wsConv.profile_picture_url, status: wsConv.status as Conversation['status'], mode: wsConv.mode as Conversation['mode'] }
          : c);
      }
      // New conversation: schedule a reload outside setState to avoid calling
      // async functions inside a state updater (causes React state batching issues).
      return [...prev, wsConv as unknown as Conversation];
    });
  }

  const handleSendMessage = async (text: string) => {
    if (!selectedConversation || !accountId) return;
    if (!text.trim() && !selectedFile) return;
    if (sendLockRef.current) return;

    sendLockRef.current = true;
    const fileToSend = selectedFile;
    setSelectedFile(null);
    const clientRequestId = crypto.randomUUID();

    const optimistic: Message = {
      id: `temp-${Date.now()}`, conversation_id: selectedConversation.id, account: accountId,
      text_body: text || (fileToSend ? fileToSend.name : ''),
      direction: 'outbound',
      message_type: fileToSend
        ? (fileToSend.type.startsWith('image/') ? 'image' : fileToSend.type.startsWith('audio/') ? 'audio' : fileToSend.type.startsWith('video/') ? 'video' : 'document')
        : 'text',
      status: 'pending', created_at: new Date().toISOString(),
      whatsapp_message_id: '', from_number: '', to_number: selectedConversation.phone_number,
      timestamp: new Date().toISOString(), updated_at: new Date().toISOString(),
    } as unknown as Message;
    setMessages(prev => [...prev, optimistic]);
    setIsSending(true);

    try {
      let res;
      if (fileToSend) {
        res = await sendFileApi(accountId, selectedConversation.phone_number, fileToSend, text || undefined);
      } else {
        res = await whatsappService.sendTextMessage({
          account_id: accountId,
          to: selectedConversation.phone_number,
          text,
          metadata: { client_request_id: clientRequestId, source: 'chat_window' },
        });
      }
      setMessages(prev => prev.map(m => m.id === optimistic.id ? res.data : m));
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      toast.error(getErrorMessage(error));
    } finally {
      sendLockRef.current = false;
      setIsSending(false);
    }
  };

  const handleToolsSend = async (text: string) => {
    if (!selectedConversation || !text.trim()) return;
    try {
      await whatsappService.sendTextMessage({
        account_id: accountId,
        to: selectedConversation.phone_number,
        text: text.trim(),
        metadata: { client_request_id: crypto.randomUUID(), source: 'chat_window_tools' },
      });
      void loadMessages();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleSwitchMode = async () => {
    if (!selectedConversation) return;
    try {
      const currentStatus = selectedConversation.mode === 'human' ? 'human' : 'bot';
      const res = await handoverService.toggle(selectedConversation.id, currentStatus);
      const newMode = res.handover_status === 'human' ? 'human' : 'auto';
      setSelectedConversation(prev => prev ? { ...prev, mode: newMode } : prev);
      setConversations(prev => prev.map(c => c.id === selectedConversation.id ? { ...c, mode: newMode } : c));
      toast.success(`Modo alterado para ${newMode === 'human' ? 'humano' : 'automático'}`);
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const toggleRightPanel = (panel: 'info' | 'templates' | 'tools' | 'customer') => {
    setRightPanel(prev => prev === panel ? null : panel);
  };

  const handleNewOrderFromPanel = (customer: CustomerSearchResult) => {
    setNewOrderCustomer(customer);
    setRightPanel(null);
    setIsNewOrderOpen(true);
  };

  const handleInsertText = (text: string) => {
    setInsertText(text);
    setTimeout(() => setInsertText(undefined), 100);
  };

  const groupedMessages = ensureArray<Message>(messages).reduce((groups, message) => {
    if (!message.created_at) return groups;
    try {
      const date = format(new Date(message.created_at), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
    } catch { /* ignore invalid dates */ }
    return groups;
  }, {} as Record<string, Message[]>);

  const filteredConversations = ensureArray<Conversation>(conversations).filter(conv => {
    if (filter === 'unread') return (conv.unread_count ?? 0) > 0;
    if (filter === 'human') return conv.mode === 'human';
    if (filter === 'bot') return conv.mode !== 'human';
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[var(--bg-primary,#fff)] dark:bg-[var(--dark-bg-primary,#0D0907)]">
      {mediaViewer && (
        <MediaViewer
          url={mediaViewer.url}
          type={mediaViewer.type}
          fileName={mediaViewer.fileName}
          onClose={() => setMediaViewer(null)}
        />
      )}
      {showNewConvModal && (
        <NewConversationModal
          accountId={accountId}
          onClose={() => setShowNewConvModal(false)}
          onConversationCreated={(conv) => {
            setConversations(prev => {
              const exists = prev.some(c => c.id === conv.id);
              return exists ? prev : [conv, ...prev];
            });
            setSelectedConversation(conv);
            setShowNewConvModal(false);
          }}
        />
      )}

      {/* ── Painel Esquerdo ── */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-[var(--border-default,#e5e7eb)] dark:border-[var(--dark-border,#2a2a2a)] bg-[var(--bg-card,#fff)] dark:bg-[var(--dark-bg-card,#1a1a1a)]">
        {/* Header */}
        <div className="p-4 space-y-3 border-b border-[var(--border-default,#e5e7eb)] dark:border-[var(--dark-border,#2a2a2a)]">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-lg font-bold text-[var(--fg-primary,#111)] dark:text-[var(--dark-text-primary,#FAF9F7)]">
              {accountName || 'WhatsApp'}
            </h1>
            <button
              onClick={() => setShowNewConvModal(true)}
              className="p-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
              title="Nova conversa"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          {/* Search */}
          <div className="flex items-center gap-2 bg-[var(--bg-hover,#f9fafb)] dark:bg-[var(--dark-bg-hover,#161616)] rounded-lg px-3 py-2">
            <MagnifyingGlassIcon className="w-4 h-4 text-[var(--fg-muted,#9ca3af)] flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[var(--fg-primary,#111)] dark:text-[var(--dark-text-primary,#FAF9F7)] placeholder-[var(--fg-muted,#9ca3af)] outline-none"
            />
          </div>
          {/* Filter chips */}
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'unread', 'human', 'bot'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                  filter === f
                    ? 'bg-primary-600 text-white'
                    : 'bg-[var(--bg-hover,#f3f4f6)] dark:bg-[var(--dark-bg-hover,#161616)] text-[var(--fg-secondary,#6b7280)] dark:text-[var(--dark-text-secondary,#a1a1aa)] hover:bg-[var(--bg-card,#fff)] dark:hover:bg-[var(--dark-bg-card,#1a1a1a)]'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'unread' ? 'Não lidos' : f === 'human' ? 'Humano' : 'Bot'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full animate-shimmer bg-gradient-to-r from-[var(--bg-hover,#f3f4f6)] via-[var(--bg-card,#fff)] to-[var(--bg-hover,#f3f4f6)] bg-[length:200%_100%] flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded bg-gradient-to-r from-[var(--bg-hover,#f3f4f6)] via-[var(--bg-card,#fff)] to-[var(--bg-hover,#f3f4f6)] animate-shimmer bg-[length:200%_100%] w-3/4" />
                    <div className="h-2.5 rounded bg-gradient-to-r from-[var(--bg-hover,#f3f4f6)] via-[var(--bg-card,#fff)] to-[var(--bg-hover,#f3f4f6)] animate-shimmer bg-[length:200%_100%] w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-[var(--fg-muted,#9ca3af)] text-sm">
              <p>{searchTerm ? 'Nenhuma conversa encontrada' : filter !== 'all' ? 'Nenhuma conversa nesse filtro' : 'Nenhuma conversa'}</p>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isActive = selectedConversation?.id === conv.id;
              const avatarBg = getAvatarColor(conv.contact_name || conv.phone_number);
              const initials = getInitials(conv.contact_name, conv.phone_number);
              const profilePic = conv.profile_picture || conv.profile_picture_url;
              const timestamp = conv.last_message_at
                ? (() => {
                    try {
                      const d = new Date(conv.last_message_at);
                      const now = new Date();
                      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
                      if (diffDays === 0) return format(d, 'HH:mm');
                      if (diffDays === 1) return 'Ontem';
                      if (diffDays < 7) return format(d, 'EEE', { locale: ptBR });
                      return format(d, 'dd/MM');
                    } catch { return ''; }
                  })()
                : '';
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-950/20 border-l-2 border-primary-600'
                      : 'hover:bg-[var(--bg-hover,#f9fafb)] dark:hover:bg-[var(--dark-bg-hover,#161616)] border-l-2 border-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden"
                      style={{ backgroundColor: profilePic ? undefined : avatarBg }}
                    >
                      {profilePic
                        ? <img src={profilePic} alt={conv.contact_name} className="w-full h-full object-cover" />
                        : initials}
                    </div>
                    {/* Mode dot */}
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-card,#fff)] dark:border-[var(--dark-bg-card,#1a1a1a)] ${
                      conv.mode === 'human' ? 'bg-emerald-400' : 'bg-zinc-400'
                    }`} />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--fg-primary,#111)] dark:text-[var(--dark-text-primary,#FAF9F7)] truncate">
                      {conv.contact_name || conv.phone_number}
                    </p>
                    <p className="text-xs text-[var(--fg-secondary,#6b7280)] dark:text-[var(--dark-text-secondary,#a1a1aa)] truncate mt-0.5">
                      {typingContacts.has(conv.id) ? (
                        <span className="text-emerald-500 italic flex items-center gap-1">
                          <span className="flex gap-0.5 items-center">
                            {[0,1,2].map(i => (
                              <span key={i} className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                          </span>
                          digitando...
                        </span>
                      ) : (conv.last_message_preview || conv.last_message || 'Sem mensagens')}
                    </p>
                  </div>
                  {/* Meta */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {timestamp && (
                      <span className="text-[10px] text-[var(--fg-muted,#9ca3af)]">{timestamp}</span>
                    )}
                    {(conv.unread_count ?? 0) > 0 && (
                      <span className="px-1.5 py-0.5 min-w-[18px] text-center bg-primary-600 text-white text-[10px] font-bold rounded-full">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Painel de Chat ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!selectedConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[var(--fg-muted,#9ca3af)] bg-[#f0ebe3] dark:bg-[#0d0907]">
            <div className="flex flex-col items-center justify-center gap-3">
              <span className="text-6xl">💬</span>
              <h2 className="text-lg font-semibold text-[var(--fg-primary,#111)] dark:text-[var(--dark-text-primary,#FAF9F7)]">{accountName || 'WhatsApp Business'}</h2>
              <p className="text-sm text-[var(--fg-muted,#9ca3af)]">Selecione uma conversa para começar a atender</p>
              {!isConnected && (
                <p className="text-red-500 text-xs">⚠️ Desconectado</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default,#e5e7eb)] dark:border-[var(--dark-border,#2a2a2a)] bg-[var(--bg-card,#fff)] dark:bg-[var(--dark-bg-card,#1a1a1a)] flex-shrink-0">
              {/* Avatar clicável → abre Info */}
              <button
                onClick={() => toggleRightPanel('info')}
                className="relative flex-shrink-0"
                title="Ver info do contato"
              >
                {(() => {
                  const pic = selectedConversation.profile_picture || selectedConversation.profile_picture_url;
                  const bg = getAvatarColor(selectedConversation.contact_name || selectedConversation.phone_number);
                  const ini = getInitials(selectedConversation.contact_name, selectedConversation.phone_number);
                  return (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden" style={{ backgroundColor: pic ? undefined : bg }}>
                      {pic ? <img src={pic} alt={selectedConversation.contact_name} className="w-full h-full object-cover" /> : ini}
                    </div>
                  );
                })()}
              </button>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--fg-primary,#111)] dark:text-[var(--dark-text-primary,#FAF9F7)] truncate">
                  {selectedConversation.contact_name || selectedConversation.phone_number}
                </p>
                <p className="text-xs text-[var(--fg-secondary,#6b7280)] dark:text-[var(--dark-text-secondary,#a1a1aa)]">
                  {typingContacts.has(selectedConversation.id) ? (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <span className="flex gap-0.5">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </span>
                      digitando...
                    </span>
                  ) : selectedConversation.phone_number}
                </p>
              </div>
              {/* Ações */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Pill modo */}
                <button
                  onClick={handleSwitchMode}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border ${
                    selectedConversation.mode === 'human'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                  }`}
                  title={selectedConversation.mode === 'human' ? 'Mudar para Bot' : 'Mudar para Humano'}
                >
                  {selectedConversation.mode === 'human' ? '👤 Humano' : '🤖 Bot'}
                </button>
                {/* Botão Info */}
                <button
                  onClick={() => toggleRightPanel('info')}
                  className={`p-1.5 rounded-lg transition-colors ${rightPanel === 'info' ? 'bg-primary-600 text-white' : 'hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--dark-bg-hover)] text-[var(--fg-secondary)]'}`}
                  title="Info do contato"
                >
                  <UserCircleIcon className="w-4 h-4" />
                </button>
                {/* Botão Templates */}
                <button
                  onClick={() => toggleRightPanel('templates')}
                  className={`p-1.5 rounded-lg transition-colors ${rightPanel === 'templates' ? 'bg-primary-600 text-white' : 'hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--dark-bg-hover)] text-[var(--fg-secondary)]'}`}
                  title="Templates"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                </button>
                {/* Botão Ferramentas */}
                <button
                  onClick={() => toggleRightPanel('tools')}
                  className={`p-1.5 rounded-lg transition-colors ${rightPanel === 'tools' ? 'bg-primary-600 text-white' : 'hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--dark-bg-hover)] text-[var(--fg-secondary)]'}`}
                  title="Ferramentas"
                >
                  <BoltIcon className="w-4 h-4" />
                </button>
                {/* Botão CRM */}
                <button
                  onClick={() => toggleRightPanel('customer')}
                  className={`p-1.5 rounded-lg transition-colors ${rightPanel === 'customer' ? 'bg-primary-600 text-white' : 'hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--dark-bg-hover)] text-[var(--fg-secondary)]'}`}
                  title="Painel CRM do cliente"
                >
                  <UserCircleIcon className="w-4 h-4" />
                </button>
                {/* Reload */}
                <button
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] dark:hover:bg-[var(--dark-bg-hover)] transition-colors"
                  onClick={loadMessages}
                  disabled={isLoadingMessages}
                  title="Recarregar mensagens"
                >
                  <EllipsisVerticalIcon className="w-4 h-4 text-[var(--fg-secondary)]" />
                </button>
              </div>
            </div>

            {/* Banner de erro de conexão */}
            {connectionError && (
              <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 text-xs text-center">
                ⚠️ {connectionError}
              </div>
            )}

            {/* Mensagens */}
            <div
              ref={messagesContainerRef}
              onScroll={handleContainerScroll}
              className="flex-1 overflow-y-auto p-4 bg-[#f0ebe3] dark:bg-[#0d0907]"
            >
              {isLoadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--fg-muted,#9ca3af)] text-sm">
                  <p>Carregando mensagens...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--fg-muted,#9ca3af)] text-sm">
                  <p>Nenhuma mensagem</p>
                  <small>Comece enviando uma mensagem</small>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {Object.entries(groupedMessages).map(([date, dayMessages]) => (
                    <React.Fragment key={date}>
                      <div className="flex justify-center my-2">
                        <span className="px-3 py-0.5 bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-full text-xs text-[var(--fg-secondary,#6b7280)] shadow-sm">
                          {(() => { try { return format(new Date(date), "d 'de' MMMM", { locale: ptBR }); } catch { return date; } })()}
                        </span>
                      </div>
                      {dayMessages.map(message => (
                        <MessageBubble
                          key={message.id}
                          {...messageToBubbleProps(message)}
                          onMediaClick={(url, type, fileName) => setMediaViewer({ url, type, fileName })}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-[var(--border-default,#e5e7eb)] dark:border-[var(--dark-border,#2a2a2a)] bg-[var(--bg-card,#fff)] dark:bg-[var(--dark-bg-card,#1a1a1a)] flex-shrink-0">
              <MessageInput
                onSend={handleSendMessage}
                onTyping={(isTyping) => { if (selectedConversation) sendTypingIndicator(selectedConversation.id, isTyping); }}
                onFileSelect={(file) => setSelectedFile(file)}
                onClearFile={() => setSelectedFile(null)}
                selectedFile={selectedFile}
                disabled={!isConnected}
                isLoading={isSending}
                placeholder={isConnected ? 'Digite uma mensagem...' : 'Conectando...'}
                insertText={insertText}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Painel Direito ── */}
      {selectedConversation && rightPanel && rightPanel !== 'customer' && (
        <ContactInfoPanel
          conversation={selectedConversation}
          accountId={accountId}
          storeId={storeId || undefined}
          storeSlug={storeSlug || undefined}
          storeName={storeName || undefined}
          storeDescription={store?.description || undefined}
          storeAddress={store?.address || undefined}
          storeCity={store?.city || undefined}
          storeState={store?.state || undefined}
          storeUrl={getStoreUrl(store?.metadata)}
          activeTab={rightPanel as 'info' | 'templates' | 'tools'}
          onTabChange={(tab) => setRightPanel(tab)}
          onClose={() => setRightPanel(null)}
          onInsertText={handleInsertText}
          onSendMessage={handleToolsSend}
          onAfterSend={() => void loadMessages()}
        />
      )}

      {/* ── Painel CRM (CustomerPanel) ── */}
      {selectedConversation && rightPanel === 'customer' && (
        <CustomerPanel
          storeSlug={storeSlug || ''}
          unifiedUserId={selectedConversation?.unified_user_id ?? null}
          onNewOrder={handleNewOrderFromPanel}
          onClose={() => setRightPanel(null)}
        />
      )}

      {/* ── NewOrderDrawer (aberto pelo painel CRM ou outro ponto) ── */}
      {storeSlug && (
        <NewOrderDrawer
          isOpen={isNewOrderOpen}
          onClose={() => {
            setIsNewOrderOpen(false);
            setNewOrderCustomer(null);
          }}
          storeSlug={storeSlug}
          storeId={storeId || undefined}
          initialCustomer={newOrderCustomer}
          onOrderCreated={() => {
            setIsNewOrderOpen(false);
            setNewOrderCustomer(null);
          }}
        />
      )}
    </div>
  );
};

export default ChatWindow;
