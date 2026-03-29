/**
 * WhatsApp Inbox - Página consolidada para gerenciar conversas
 * Similar ao WhatsApp Web, mas integrado ao painel Pastita
 */
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PhoneIcon,
  EllipsisVerticalIcon,
  CheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { conversationsService } from '../../services/conversations';
import * as whatsappService from '../../services/whatsapp';
import { handoverService } from '../../services/handover';
import toast from 'react-hot-toast';
import type { Conversation, Message } from '../../types';
import './WhatsAppInbox.css';

// Type-safe helper to ensure value is array
function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

interface ConversationWithMessages extends Omit<Conversation, 'last_message'> {
  last_message?: Message | string;
}

const WhatsAppInboxPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationWithMessages[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithMessages | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConversations = async () => {
    try {
      const response = await conversationsService.getConversations({});
      const convs = ensureArray<ConversationWithMessages>(response?.results || response);
      setConversations(convs);

      const requestedConversationId = searchParams.get('conversation');
      if (requestedConversationId) {
        const requestedConversation = convs.find((conv) => conv.id === requestedConversationId);
        if (requestedConversation) {
          setSelectedConversation(requestedConversation);
          await loadMessages(requestedConversation.id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast.error('Erro ao carregar conversas');
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const msgs = await conversationsService.getMessages(conversationId);
      setMessages(ensureArray<Message>(msgs));
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    }
  };

  const handleSelectConversation = async (conversation: ConversationWithMessages) => {
    setSelectedConversation(conversation);
    setMessageText('');
    await loadMessages(conversation.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;

    setSending(true);
    try {
      await whatsappService.sendMessage({
        account_id: selectedConversation.account,
        to: selectedConversation.phone_number,
        text: messageText.trim(),
      });
      setMessageText('');
      toast.success('Mensagem enviada');
      // Reload messages after short delay for sync
      setTimeout(() => loadMessages(selectedConversation.id), 500);
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(error?.response?.data?.detail || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleSwitchToHuman = async () => {
    if (!selectedConversation) return;
    try {
      const res = await handoverService.transferToHuman(selectedConversation.id);
      const newMode = res.handover_status === 'human' ? 'human' : 'auto';
      setSelectedConversation(prev => prev ? { ...prev, mode: newMode } : prev);
      setConversations(prev =>
        prev.map(c => c.id === selectedConversation.id ? { ...c, mode: newMode } : c)
      );
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
      setConversations(prev =>
        prev.map(c => c.id === selectedConversation.id ? { ...c, mode: newMode } : c)
      );
      toast.success('Conversa retornada para o bot');
    } catch (error) {
      console.error('Erro ao retornar para modo automático:', error);
      toast.error('Erro ao alternar modo');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    void loadConversations();
    setLoading(false);

    // Auto-refresh conversations every 3 seconds
    pollIntervalRef.current = setInterval(() => {
      void loadConversations();
    }, 3000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [searchParams.toString()]);

  useEffect(() => {
    if (selectedConversation) {
      // Reload messages every 2 seconds when a conversation is selected
      const interval = setInterval(() => loadMessages(selectedConversation.id), 2000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredConversations = ensureArray<ConversationWithMessages>(conversations).filter(conv =>
    conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.phone_number.includes(searchTerm)
  );

  const getStatusIcon = (message: Message) => {
    if (message.direction === 'inbound') return null;
    if (message.status === 'read') return <CheckIcon className="w-4 h-4 text-blue-500 fill-blue-500" />;
    if (message.status === 'delivered') return <CheckIcon className="w-4 h-4 text-gray-400" />;
    if (message.status === 'sent') return <CheckIcon className="w-4 h-4 text-gray-400" />;
    return <ClockIcon className="w-4 h-4 text-gray-300" />;
  };

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
                    <div
                      key={msg.id}
                      className={`message ${msg.direction === 'inbound' ? 'inbound' : 'outbound'}`}
                    >
                      <div className="message-bubble">
                        <p>{msg.text_body}</p>
                        <span className="message-time">
                          {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                      {msg.direction === 'outbound' && (
                        <div className="message-status">
                          {getStatusIcon(msg)}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
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
