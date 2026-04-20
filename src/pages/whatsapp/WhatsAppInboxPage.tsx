/**
 * WhatsApp Inbox - Página consolidada para gerenciar conversas
 * Similar ao WhatsApp Web, mas integrado ao painel Pastita
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PhoneIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import { conversationsService } from '../../services/conversations';
import * as whatsappService from '../../services/whatsapp';
import { handoverService } from '../../services/handover';
import { useWhatsAppWsContext } from '../../context/WhatsAppWsContext';
import { useChatStore } from '../../stores/chatStore';
import { MessageBubble, MessageBubbleProps } from '../../components/chat/MessageBubble';
import { MediaViewer } from '../../components/chat/MediaViewer';
import toast from 'react-hot-toast';
import type { Conversation, Message } from '../../types';
import './WhatsAppInbox.css';

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
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

function messagePreviewText(msg: Message | string | undefined): string {
  if (!msg) return 'Sem mensagens';
  if (typeof msg === 'string') return msg;
  if (msg.text_body) return msg.text_body;
  switch (msg.message_type) {
    case 'audio': return '🎵 Áudio';
    case 'image': return '📷 Imagem';
    case 'video': return '🎬 Vídeo';
    case 'document': return `📄 ${msg.media_filename || 'Documento'}`;
    case 'sticker': return '🏷️ Sticker';
    case 'location': return '📍 Localização';
    case 'contacts': return '👤 Contato';
    case 'order': return '🛒 Pedido';
    case 'reaction': return '👍 Reação';
    default: return msg.message_type || 'Mensagem';
  }
}

interface ConversationWithMessages extends Omit<Conversation, 'last_message'> {
  last_message?: Message | string;
}

const WhatsAppInboxPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithMessages | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<{ url: string; type: string; fileName?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendLockRef = useRef(false);

  // WebSocket context para atualizações em tempo real
  const ws = useWhatsAppWsContext();

  // chatStore sincronizado pelo WebSocket
  const storeConversations = useChatStore((s) => s.conversations);
  const getConversationMessages = useChatStore((s) => s.getConversationMessages);

  // Deriva lista de conversas do store (já atualizada via WebSocket)
  const conversations = ensureArray<ConversationWithMessages>(storeConversations as ConversationWithMessages[]);

  // Mensagens da conversa selecionada — lidas do store (WebSocket as atualiza)
  const messages = selectedConversation
    ? ensureArray<Message>(getConversationMessages(selectedConversation.id))
    : [];

  const loadConversations = useCallback(async () => {
    try {
      const response = await conversationsService.getConversations({});
      const convs = ensureArray<ConversationWithMessages>(response?.results || response);
      // Hidrata o chatStore com a lista inicial (o WS mantém atualizado depois)
      useChatStore.getState().setConversations(convs as unknown as Conversation[]);

      const requestedConversationId = searchParams.get('conversation');
      if (requestedConversationId) {
        const found = convs.find((conv) => conv.id === requestedConversationId);
        if (found) {
          setSelectedConversation(found);
          await loadMessages(found.id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast.error('Erro ao carregar conversas');
    }
  }, [searchParams]);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const msgs = await conversationsService.getMessages(conversationId);
      // Carrega mensagens históricas no store; WS adiciona novas em tempo real
      useChatStore.getState().setMessages(conversationId, ensureArray<Message>(msgs));
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    }
  }, []);

  const handleSelectConversation = async (conversation: ConversationWithMessages) => {
    setSelectedConversation(conversation);
    setMessageText('');
    await loadMessages(conversation.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;
    if (sendLockRef.current) return;

    sendLockRef.current = true;
    setSending(true);
    try {
      await whatsappService.sendMessage({
        account_id: selectedConversation.account,
        to: selectedConversation.phone_number,
        text: messageText.trim(),
        metadata: {
          client_request_id: crypto.randomUUID(),
          source: 'whatsapp_inbox_page',
        },
      });
      setMessageText('');
      toast.success('Mensagem enviada');
      // Recarrega mensagens uma vez para garantir sync (WS já atualiza em tempo real)
      void loadMessages(selectedConversation.id);
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(error?.response?.data?.detail || 'Erro ao enviar mensagem');
    } finally {
      sendLockRef.current = false;
      setSending(false);
    }
  };

  const handleSwitchToHuman = async () => {
    if (!selectedConversation) return;
    try {
      const res = await handoverService.transferToHuman(selectedConversation.id);
      const newMode = res.handover_status === 'human' ? 'human' : 'auto';
      setSelectedConversation(prev => prev ? { ...prev, mode: newMode } : prev);
      useChatStore.getState().updateConversation({ id: selectedConversation.id, mode: newMode as Conversation['mode'] });
      toast.success('Conversa transferida para atendimento humano');
    } catch (error) {
      console.error('Erro ao transferir para modo humano:', error);
      toast.error('Erro ao alternar modo');
    }
  };

  const handleSwitchToAuto = async () => {
    if (!selectedConversation) return;
    try {
      const res = await handoverService.transferToBot(selectedConversation.id);
      const newMode = res.handover_status === 'human' ? 'human' : 'auto';
      setSelectedConversation(prev => prev ? { ...prev, mode: newMode } : prev);
      useChatStore.getState().updateConversation({ id: selectedConversation.id, mode: newMode as Conversation['mode'] });
      toast.success('Conversa retornada para o bot');
    } catch (error) {
      console.error('Erro ao retornar para modo automático:', error);
      toast.error('Erro ao alternar modo');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Carga inicial — apenas UMA vez por mudança de searchParams
  useEffect(() => {
    setLoading(true);
    void loadConversations().finally(() => setLoading(false));

    // Refresh leve a cada 60s como fallback (WebSocket cuida do tempo real)
    const timer = setInterval(() => {
      if (!document.hidden) void loadConversations();
    }, 60_000);
    return () => clearInterval(timer);
  }, [loadConversations]);

  // Subscreve/dessubscreve do canal WS ao selecionar conversa
  useEffect(() => {
    if (!selectedConversation) return;
    ws.subscribeToConversation(selectedConversation.id);
    return () => ws.unsubscribeFromConversation(selectedConversation.id);
  }, [selectedConversation, ws]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredConversations = ensureArray<ConversationWithMessages>(conversations).filter(conv =>
    conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.phone_number.includes(searchTerm)
  );

  return (
    <div className="whatsapp-inbox">
      {/* Conversations List */}
      <div className="conversations-panel">
        <div className="conversations-header">
          <h1>Caixas de Entrada</h1>
          <div className="search-box">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="conversations-list">
          {filteredConversations.length === 0 ? (
            <div className="empty-state">
              {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa'}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                onClick={() => handleSelectConversation(conv)}
              >
                <div className="conversation-avatar">
                  {(conv.contact_name || conv.phone_number).charAt(0).toUpperCase()}
                </div>
                <div className="conversation-info">
                  <h3>{conv.contact_name || conv.phone_number}</h3>
                  <p className="conversation-preview">
                    {typeof conv.last_message === 'object' && conv.last_message?.text_body ? conv.last_message.text_body : (typeof conv.last_message === 'string' ? conv.last_message : 'Sem mensagens')}
                  </p>
                </div>
                <div className="conversation-meta">
                  <span className={`mode-badge ${conv.mode}`}>
                    {conv.mode === 'auto' ? '🤖' : '👤'}
                  </span>
                  {conv.unread_count && conv.unread_count > 0 && (
                    <span className="unread-badge">{conv.unread_count}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="chat-panel">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-info">
                <h2>{selectedConversation.contact_name || selectedConversation.phone_number}</h2>
                <p className="phone-number">{selectedConversation.phone_number}</p>
              </div>
              <div className="chat-actions">
                <button title="Chamada" disabled className="icon-btn">
                  <PhoneIcon className="w-5 h-5" />
                </button>
                <div className="mode-selector">
                  <button
                    className={`mode-btn ${selectedConversation.mode === 'auto' ? 'active' : ''}`}
                    onClick={handleSwitchToAuto}
                    title="Modo Automático"
                  >
                    🤖
                  </button>
                  <button
                    className={`mode-btn ${selectedConversation.mode === 'human' ? 'active' : ''}`}
                    onClick={handleSwitchToHuman}
                    title="Modo Humano"
                  >
                    👤
                  </button>
                </div>
                <button className="icon-btn" title="Mais opções">
                  <EllipsisVerticalIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="messages-empty">
                  <p>Nenhuma mensagem nesta conversa</p>
                  <small>Comece enviando uma mensagem</small>
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      {...messageToBubbleProps(msg)}
                      onMediaClick={(url, type, fileName) =>
                        setMediaViewer({ url, type, fileName })
                      }
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
              {mediaViewer && (
                <MediaViewer
                  url={mediaViewer.url}
                  type={mediaViewer.type}
                  fileName={mediaViewer.fileName}
                  onClose={() => setMediaViewer(null)}
                />
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="input-area">
              <input
                type="text"
                placeholder="Digite uma mensagem..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={sending}
                maxLength={1024}
              />
              <button
                type="submit"
                disabled={!messageText.trim() || sending}
                className="send-btn"
              >
                {sending ? '⏳' : <PaperAirplaneIcon className="w-5 h-5" />}
              </button>
            </form>
          </>
        ) : (
          <div className="no-conversation-selected">
            <div className="empty-message">
              <ChatBubbleIcon className="w-16 h-16 text-gray-300" />
              <h2>Selecione uma conversa</h2>
              <p>Escolha uma conversa na lista para começar a trocar mensagens</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Dummy icon component
const ChatBubbleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export default WhatsAppInboxPage;
