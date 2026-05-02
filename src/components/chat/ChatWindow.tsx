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
} from '@heroicons/react/24/outline';

import { MessageBubble, MessageBubbleProps } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { MediaViewer } from './MediaViewer';
import { ChatToolsPanel } from './ChatToolsPanel';
import { useWhatsAppWS, MessageReceivedEvent, MessageSentEvent, StatusUpdatedEvent, TypingEvent, ConversationUpdatedEvent } from '../../hooks/useWhatsAppWS';
import { whatsappService, conversationsService, getErrorMessage } from '../../services';
import { sendFile as sendFileApi } from '../../services/whatsapp';
import { handoverService } from '../../services/handover';
import { Message, Conversation } from '../../types';
import '../../pages/whatsapp/WhatsAppInbox.css';

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
  mimeType: msg.media_mime_type,
  fileName: msg.media_filename || msg.file_name,
  createdAt: msg.created_at,
  sentAt: msg.sent_at ?? undefined,
  deliveredAt: msg.delivered_at ?? undefined,
  readAt: msg.read_at ?? undefined,
  errorMessage: msg.error_message,
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
  const [activePanel, setActivePanel] = useState<'templates' | 'tools' | null>(null);
  const [insertText, setInsertText] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

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
      const historyRes = await conversationsService.getMessages(selectedConversation.id, 100);
      setMessages(ensureArray<Message>(historyRes.results));
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

  function handleMessageSent(event: MessageSentEvent) {
    const msg = event.message;
    if (selectedConversation && event.conversation_id === selectedConversation.id) {
      const converted: Message = { ...msg, account: accountId, updated_at: msg.created_at } as unknown as Message;
      setMessages(prev => {
        if (prev.some(m => m.id === converted.id || m.whatsapp_message_id === converted.whatsapp_message_id)) return prev;
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
      loadConversations();
      return prev;
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
    await whatsappService.sendTextMessage({
      account_id: accountId,
      to: selectedConversation.phone_number,
      text: text.trim(),
      metadata: { client_request_id: crypto.randomUUID(), source: 'chat_window_tools' },
    });
    void loadMessages();
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

  const togglePanel = (panel: 'templates' | 'tools') => {
    setActivePanel(prev => prev === panel ? null : panel);
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

  const filteredConversations = ensureArray<Conversation>(conversations).filter(conv =>
    conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.phone_number.includes(searchTerm)
  );

  return (
    <div className="whatsapp-inbox">
      {mediaViewer && (
        <MediaViewer
          url={mediaViewer.url}
          type={mediaViewer.type}
          fileName={mediaViewer.fileName}
          onClose={() => setMediaViewer(null)}
        />
      )}

      {/* ── Painel de Conversas ── */}
      <div className="conversations-panel">
        <div className="conversations-header">
          <h1>{accountName || 'WhatsApp'}</h1>
          <div className="search-box">
            <MagnifyingGlassIcon className="w-4 h-4" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="conversations-list">
          {isLoadingConversations ? (
            <div className="empty-state">Carregando...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="empty-state">
              {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa'}
            </div>
          ) : (
            filteredConversations.map(conv => (
              <div
                key={conv.id}
                className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className="conversation-avatar">
                  {conv.profile_picture || conv.profile_picture_url ? (
                    <img
                      src={conv.profile_picture || conv.profile_picture_url}
                      alt={conv.contact_name || conv.phone_number}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    getInitials(conv.contact_name, conv.phone_number)
                  )}
                </div>
                <div className="conversation-info">
                  <h3>{conv.contact_name || conv.phone_number}</h3>
                  <p className="conversation-preview">
                    {typingContacts.has(conv.id)
                      ? <span style={{ color: '#10b981', fontStyle: 'italic' }}>digitando...</span>
                      : (conv.last_message_preview || conv.last_message || 'Sem mensagens')}
                  </p>
                </div>
                <div className="conversation-meta">
                  <span className="mode-badge">{conv.mode === 'human' ? '👤' : '🤖'}</span>
                  {conv.unread_count && conv.unread_count > 0 && (
                    <span className="unread-badge">{conv.unread_count}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Painel de Chat ── */}
      <div className={`chat-panel ${activePanel ? 'panel-open' : ''}`}>
        {!selectedConversation ? (
          <div className="no-conversation-selected">
            <div className="empty-message">
              <span style={{ fontSize: '4rem' }}>💬</span>
              <h2>{accountName || 'WhatsApp Business'}</h2>
              <p>Selecione uma conversa para começar a atender</p>
              {!isConnected && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>⚠️ Desconectado</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="chat-header">
              <div className="chat-info">
                <h2>{selectedConversation.contact_name || selectedConversation.phone_number}</h2>
                <p className="phone-number">
                  {typingContacts.has(selectedConversation.id)
                    ? <span style={{ color: '#10b981' }}>digitando...</span>
                    : selectedConversation.phone_number}
                </p>
              </div>
              <div className="chat-actions">
                <div className="mode-selector">
                  <button
                    className={`mode-btn ${selectedConversation.mode !== 'human' ? 'active' : ''}`}
                    onClick={handleSwitchMode}
                    title="Modo Automático"
                  >
                    🤖
                  </button>
                  <button
                    className={`mode-btn ${selectedConversation.mode === 'human' ? 'active' : ''}`}
                    onClick={handleSwitchMode}
                    title="Modo Humano"
                  >
                    👤
                  </button>
                </div>
                <button
                  className={`tools-toggle-btn ${activePanel === 'templates' ? 'active' : ''}`}
                  onClick={() => togglePanel('templates')}
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  <span>Templates</span>
                </button>
                <button
                  className={`tools-toggle-btn ${activePanel === 'tools' ? 'active' : ''}`}
                  onClick={() => togglePanel('tools')}
                >
                  <BoltIcon className="w-4 h-4" />
                  <span>Ferramentas</span>
                </button>
                <button
                  className="icon-btn"
                  onClick={loadMessages}
                  disabled={isLoadingMessages}
                  title="Recarregar mensagens"
                >
                  {isLoadingMessages
                    ? <span style={{ fontSize: '0.75rem' }}>⏳</span>
                    : <EllipsisVerticalIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Banner de erro de conexão */}
            {connectionError && (
              <div style={{ padding: '0.5rem 1rem', background: '#fef9c3', borderBottom: '1px solid #fde047', fontSize: '0.82rem', color: '#854d0e' }}>
                ⚠️ {connectionError}
              </div>
            )}

            {/* Mensagens */}
            <div
              ref={messagesContainerRef}
              onScroll={handleContainerScroll}
              className="messages-container"
            >
              {isLoadingMessages ? (
                <div className="messages-empty">
                  <p>Carregando mensagens...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="messages-empty">
                  <p>Nenhuma mensagem</p>
                  <small>Comece enviando uma mensagem</small>
                </div>
              ) : (
                <div className="messages-list">
                  {Object.entries(groupedMessages).map(([date, dayMessages]) => (
                    <React.Fragment key={date}>
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                        <span style={{ padding: '0.2rem 0.75rem', background: 'rgba(255,255,255,0.8)', borderRadius: '20px', fontSize: '0.75rem', color: '#6b7280', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
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
            <div style={{ borderTop: '1px solid var(--border-default, #e5e7eb)', background: 'var(--bg-card, white)', flexShrink: 0 }}>
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

      {/* ── Painel de Ferramentas ── */}
      {selectedConversation && activePanel && (
        <ChatToolsPanel
          key={activePanel}
          conversation={selectedConversation}
          onInsertText={handleInsertText}
          onSendMessage={handleToolsSend}
          onClose={() => setActivePanel(null)}
          defaultTab={activePanel}
        />
      )}
    </div>
  );
};

export default ChatWindow;
