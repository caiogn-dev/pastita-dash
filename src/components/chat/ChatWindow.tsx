/**
 * ChatWindow - Interface de Chat WhatsApp (sem Chakra UI)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

import { ContactList, Contact } from './ContactList';
import { MessageBubble, MessageBubbleProps } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { MediaViewer } from './MediaViewer';
import { useWhatsAppWS, MessageReceivedEvent, StatusUpdatedEvent, TypingEvent, ConversationUpdatedEvent } from '../../hooks/useWhatsAppWS';
import { whatsappService, conversationsService, getErrorMessage } from '../../services';
import { sendFile as sendFileApi } from '../../services/whatsapp';
import { handoverService } from '../../services/handover';
import { Message, Conversation } from '../../types';

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export interface ChatWindowProps {
  accountId: string;
  accountName?: string;
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
  fileName: msg.media_filename || msg.file_name,
  createdAt: msg.created_at,
  sentAt: msg.sent_at ?? undefined,
  deliveredAt: msg.delivered_at ?? undefined,
  readAt: msg.read_at ?? undefined,
  errorMessage: msg.error_message,
});

const conversationToContact = (conv: Conversation): Contact => ({
  id: conv.id,
  phoneNumber: conv.phone_number,
  contactName: conv.contact_name || '',
  lastMessagePreview: conv.last_message_preview || conv.last_message || '',
  lastMessageAt: conv.last_message_at ?? undefined,
  unreadCount: 0,
  status: conv.status,
  mode: conv.mode as 'auto' | 'human' | 'hybrid',
});

const getInitials = (name?: string, phone?: string) => {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return phone?.slice(-2) || '?';
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ accountId, accountName, onConversationSelect }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [typingContacts, setTypingContacts] = useState<Set<string>>(new Set());
  const [mediaViewer, setMediaViewer] = useState<{ url: string; type: string; fileName?: string } | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const { isConnected, connectionError, subscribeToConversation, unsubscribeFromConversation, sendTypingIndicator } =
    useWhatsAppWS({
      accountId,
      enabled: !!accountId,
      onMessageReceived: handleMessageReceived,
      onMessage: (msg) => {
        const converted: Message = { ...msg, timestamp: msg.created_at, account: accountId, updated_at: msg.created_at } as unknown as Message;
        handleNewMessage(converted);
      },
      onStatusUpdated: handleStatusUpdated,
      onTyping: handleTyping,
      onConversationUpdated: handleConversationUpdated,
      onError: (event) => { toast.error(`Erro: ${event.error_message}`); },
    });

  const loadConversations = useCallback(async () => {
    if (!accountId) return;
    setIsLoadingConversations(true);
    try {
      const response = await conversationsService.getConversations({ account: accountId });
      setConversations(ensureArray<Conversation>(response?.results || response));
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setIsLoadingConversations(false); }
  }, [accountId]);

  const loadMessages = useCallback(async () => {
    if (!selectedConversation || !accountId) return;
    setIsLoadingMessages(true);
    try {
      const historyRes = await whatsappService.getConversationHistory(accountId, selectedConversation.phone_number, 100);
      const history = ensureArray<Message>((historyRes.data as { results?: Message[] })?.results || historyRes.data);
      setMessages(history.reverse());
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setIsLoadingMessages(false); }
  }, [accountId, selectedConversation]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

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
        if (prev.some(m => m.id === newMessage.id || m.whatsapp_message_id === newMessage.whatsapp_message_id)) return prev;
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
        if (prev.some(m => m.id === msg.id || m.whatsapp_message_id === msg.whatsapp_message_id)) return prev;
        return [...prev, msg];
      });
      if (msg.direction === 'inbound') handleAutoScroll(true);
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
          ? { ...c, phone_number: wsConv.phone_number, contact_name: wsConv.contact_name, status: wsConv.status as Conversation['status'], mode: wsConv.mode as Conversation['mode'] }
          : c);
      }
      loadConversations();
      return prev;
    });
  }

  const handleSendMessage = async (text: string) => {
    if (!selectedConversation || !accountId) return;
    if (!text.trim() && !selectedFile) return;

    const fileToSend = selectedFile;
    setSelectedFile(null);

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
        res = await whatsappService.sendTextMessage({ account_id: accountId, to: selectedConversation.phone_number, text });
      }
      setMessages(prev => prev.map(m => m.id === optimistic.id ? res.data : m));
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      toast.error(getErrorMessage(error));
    } finally { setIsSending(false); }
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

  const contacts: Contact[] = ensureArray<Conversation>(conversations).map(conv => ({
    ...conversationToContact(conv),
    isTyping: typingContacts.has(conv.id),
  }));

  const groupedMessages = ensureArray<Message>(messages).reduce((groups, message) => {
    if (!message.created_at) return groups;
    try {
      const date = format(new Date(message.created_at), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
    } catch { /* ignore invalid dates */ }
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className="flex h-full w-full bg-bg-subtle overflow-hidden">
      {mediaViewer && (
        <MediaViewer
          url={mediaViewer.url}
          type={mediaViewer.type}
          fileName={mediaViewer.fileName}
          onClose={() => setMediaViewer(null)}
        />
      )}

      {/* Contact list sidebar */}
      <div className={`w-full md:w-[360px] h-full bg-bg-card border-r border-border-primary flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <ContactList
          contacts={contacts}
          selectedContactId={selectedConversation?.id}
          onSelectContact={(c) => setSelectedConversation(conversations.find(conv => conv.id === c.id) || null)}
          isLoading={isLoadingConversations}
          emptyMessage="Nenhuma conversa encontrada"
        />
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col bg-bg-muted ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
        {!selectedConversation ? (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-bg-card">
            <div className="p-8 rounded-full bg-green-50 dark:bg-green-900/30">
              <span className="text-6xl">💬</span>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-fg-primary">{accountName || 'WhatsApp Business'}</h2>
              <p className="text-fg-muted mt-1 max-w-md">Selecione uma conversa ao lado para começar a atender seus clientes</p>
            </div>
            {!isConnected && (
              <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">⚠️ Desconectado</span>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-bg-card border-b border-border-primary">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${selectedConversation.mode === 'human' ? 'bg-blue-500' : 'bg-green-500'}`}>
                  {getInitials(selectedConversation.contact_name, selectedConversation.phone_number)}
                </div>
                <div>
                  <p className="font-semibold text-fg-primary">{selectedConversation.contact_name || selectedConversation.phone_number}</p>
                  <p className="text-sm text-fg-muted">
                    {typingContacts.has(selectedConversation.id)
                      ? <span className="text-green-500 font-medium">digitando...</span>
                      : isConnected ? '🟢 Online' : '🔴 Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSwitchMode}
                  className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-opacity hover:opacity-80 ${selectedConversation.mode === 'human' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}
                >
                  {selectedConversation.mode === 'human' ? '👤 Humano' : '🤖 Auto'}
                </button>
                <button onClick={loadMessages} disabled={isLoadingMessages} className="p-2 rounded hover:bg-bg-hover transition-colors text-fg-muted">
                  {isLoadingMessages ? <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /> : '🔄'}
                </button>
              </div>
            </div>

            {/* Connection error banner */}
            {connectionError && (
              <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">⚠️ {connectionError}</p>
              </div>
            )}

            {/* Messages */}
            <div ref={messagesContainerRef} onScroll={handleContainerScroll} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-bg-muted">
              {isLoadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-fg-muted">
                  <span className="text-5xl">👋</span>
                  <p className="text-lg">Inicie a conversa</p>
                  <p className="text-sm text-center max-w-[300px]">Envie uma mensagem para começar o atendimento</p>
                </div>
              ) : (
                Object.entries(groupedMessages).map(([date, dayMessages]) => (
                  <div key={date} className="flex flex-col gap-4">
                    {/* Date separator */}
                    <div className="flex items-center justify-center">
                      <span className="px-3 py-0.5 bg-bg-card border border-border-primary rounded-full text-xs text-fg-muted">
                        {(() => { try { return format(new Date(date), "d 'de' MMMM", { locale: ptBR }); } catch { return date; } })()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {dayMessages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          {...messageToBubbleProps(message)}
                          onMediaClick={(url, type, fileName) => setMediaViewer({ url, type, fileName })}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-bg-card border-t border-border-primary">
              <MessageInput
                onSend={handleSendMessage}
                onTyping={(isTyping) => { if (selectedConversation) sendTypingIndicator(selectedConversation.id, isTyping); }}
                onFileSelect={(file) => setSelectedFile(file)}
                onClearFile={() => setSelectedFile(null)}
                selectedFile={selectedFile}
                disabled={!isConnected}
                isLoading={isSending}
                placeholder={isConnected ? 'Digite uma mensagem...' : 'Conectando...'}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
