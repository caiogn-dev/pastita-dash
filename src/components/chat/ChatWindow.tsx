// ChatWindow - Versão simplificada sem Chakra UI complexo
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useWhatsAppWS } from '../../hooks/useWhatsAppWS';
import { conversationsService } from '../../services';
import { Message, Conversation } from '../../types';
import './ChatWindow.css';

export interface ChatWindowProps {
  accountId: string;
  accountName?: string;
  onConversationSelect?: (conversation: Conversation | null) => void;
}

interface Contact {
  id: string;
  phoneNumber: string;
  contactName: string;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  status?: string;
  mode?: 'auto' | 'human' | 'hybrid';
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  accountId,
  accountName,
  onConversationSelect,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingContacts, setTypingContacts] = useState<Set<string>>(new Set());
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setShowSidebar(!mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { isConnected, sendMessage, sendTypingIndicator } = useWhatsAppWS({
    accountId,
    onMessage: handleNewMessage,
    onTyping: handleTyping,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    loadConversations();
  }, [accountId]);

  async function loadConversations() {
    try {
      setIsLoadingConversations(true);
      const response = await conversationsService.getConversations({ account: accountId });
      setConversations(response.results || []);
    } catch (error) {
      toast.error('Erro ao carregar conversas');
    } finally {
      setIsLoadingConversations(false);
    }
  }

  async function handleNewMessage(newMessage: Message) {
    if (!selectedConversation) return;
    if (newMessage.conversation_id === selectedConversation.id) {
      setMessages(prev => [...prev, newMessage]);
      if (newMessage.direction === 'inbound') {
        conversationsService.markAsRead(selectedConversation.id).catch(console.error);
      }
    }
    loadConversations();
  }

  function handleTyping(data: { conversation_id: string; is_typing: boolean }) {
    const conv = conversations.find(c => c.id === data.conversation_id);
    if (conv) {
      setTypingContacts(prev => {
        const next = new Set(prev);
        if (data.is_typing) next.add(conv.phone_number);
        else next.delete(conv.phone_number);
        return next;
      });
    }
  }

  async function handleSelectConversation(conversation: Conversation) {
    setSelectedConversation(conversation);
    onConversationSelect?.(conversation);
    if (isMobile) setShowSidebar(false);
    
    try {
      setIsLoadingMessages(true);
      const history = await conversationsService.getMessages(conversation.id);
      setMessages(Array.isArray(history) ? history : []);
      if (conversation.unread_count > 0) {
        await conversationsService.markAsRead(conversation.id);
        loadConversations();
      }
    } catch (error) {
      toast.error('Erro ao carregar mensagens');
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function handleSendMessage(text: string) {
    if (!selectedConversation || !text.trim()) return;
    try {
      setIsSending(true);
      await sendMessage(selectedConversation.phone_number, text);
      setMessages(prev => [...prev, {
        id: `temp-${Date.now()}`,
        conversation_id: selectedConversation.id,
        direction: 'outbound',
        message_type: 'text',
        status: 'pending',
        text_body: text,
        content: '',
        created_at: new Date().toISOString(),
      } as Message]);
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  }

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return conv.contact_name?.toLowerCase().includes(search) ||
           conv.phone_number?.includes(search);
  });

  return (
    <div className="chat-window">
      {(!isMobile || showSidebar) && (
        <div className="chat-sidebar">
          <div className="sidebar-header">
            <h2>Conversas</h2>
            <button onClick={loadConversations} disabled={isLoadingConversations}>↻</button>
          </div>
          <input
            type="text"
            placeholder="Buscar conversa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="contacts-list">
            {isLoadingConversations ? (
              <div className="loading">Carregando...</div>
            ) : filteredConversations.map(conv => (
              <div
                key={conv.id}
                className={`contact-item ${selectedConversation?.id === conv.id ? 'selected' : ''}`}
                onClick={() => handleSelectConversation(conv)}
              >
                <div className="contact-avatar">{conv.contact_name?.[0] || '📱'}</div>
                <div className="contact-info">
                  <div className="contact-name">{conv.contact_name || conv.phone_number}</div>
                  <div className="contact-preview">
                    {typingContacts.has(conv.phone_number) ? 'digitando...' : conv.last_message_preview}
                  </div>
                </div>
                {conv.unread_count > 0 && (
                  <span className="unread-badge">{conv.unread_count}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="chat-main">
        {selectedConversation ? (
          <>
            <div className="chat-header">
              {isMobile && <button onClick={() => setShowSidebar(true)}>←</button>}
              <div className="header-info">
                <div className="header-name">{selectedConversation.contact_name || selectedConversation.phone_number}</div>
                <div className="header-status">
                  {typingContacts.has(selectedConversation.phone_number) ? 'digitando...' : (isConnected ? 'Online' : 'Offline')}
                </div>
              </div>
            </div>

            <div className="messages-container">
              {isLoadingMessages ? (
                <div className="loading">Carregando...</div>
              ) : messages.map(msg => (
                <div key={msg.id} className={`message ${msg.direction}`}>
                  <div className="message-content">{msg.text_body}</div>
                  <div className="message-time">
                    {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                    {msg.direction === 'outbound' && <span className="message-status">✓</span>}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input">
              <input
                type="text"
                placeholder="Digite uma mensagem..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                disabled={!isConnected || isSending}
              />
              <button 
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  handleSendMessage(input.value);
                  input.value = '';
                }}
                disabled={!isConnected || isSending}
              >➤</button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h2>{accountName || 'WhatsApp Business'}</h2>
            <p>Selecione uma conversa para começar</p>
            {!isConnected && <span className="offline-badge">Desconectado</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
