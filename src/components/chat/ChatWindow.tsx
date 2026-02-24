/**
 * ChatWindow - Interface de Chat WhatsApp Moderna e Responsiva
 * 
 * Melhorias:
 * - Layout maior e mais espaçoso
 * - Melhor responsividade
 * - Suporte completo a mídia
 * - Interface moderna
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  UserIcon,
  CpuChipIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  PaperClipIcon,
  PhotoIcon,
  DocumentIcon,
  XMarkIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EllipsisVerticalIcon,
  Bars3Icon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';

import { ContactList, Contact } from './ContactList';
import { MessageBubble, MessageBubbleProps } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { MediaViewer } from './MediaViewer';
import { useWhatsAppWS } from '../../hooks/useWhatsAppWS';
import { whatsappService, conversationsService, getErrorMessage } from '../../services';
import { Message, Conversation } from '../../types';

export interface ChatWindowProps {
  accountId: string;
  accountName?: string;
  onConversationSelect?: (conversation: Conversation | null) => void;
}

// Converter mensagem da API para props do bubble
const messageToBubbleProps = (msg: Message): MessageBubbleProps => ({
  id: msg.id,
  direction: msg.direction as 'inbound' | 'outbound',
  messageType: msg.message_type,
  status: msg.status as 'pending' | 'sent' | 'delivered' | 'read' | 'failed',
  textBody: msg.text_body,
  content: msg.content,
  mediaUrl: msg.media_url,
  mediaType: msg.media_type,
  fileName: msg.file_name,
  mimeType: msg.media_mime_type,
  createdAt: msg.created_at,
  sentAt: msg.sent_at ?? undefined,
  deliveredAt: msg.delivered_at ?? undefined,
  readAt: msg.read_at ?? undefined,
  errorMessage: msg.error_message,
});

// Converter conversa da API para contato
const conversationToContact = (conv: Conversation): Contact => ({
  id: conv.id,
  phoneNumber: conv.phone_number,
  contactName: conv.contact_name || '',
  lastMessagePreview: conv.last_message_preview || '',
  lastMessageAt: conv.last_message_at ?? undefined,
  unreadCount: conv.unread_count || 0,
  status: conv.status,
  mode: conv.mode as 'auto' | 'human' | 'hybrid',
});

export const ChatWindow: React.FC<ChatWindowProps> = ({
  accountId,
  accountName,
  onConversationSelect,
}) => {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingContacts, setTypingContacts] = useState<Set<string>>(new Set());
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string; fileName?: string; mimeType?: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setShowSidebar(false);
      } else {
        setShowSidebar(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // WebSocket
  const {
    isConnected,
    connectionError,
    subscribeToConversation,
    unsubscribeFromConversation,
    sendTypingIndicator,
  } = useWhatsAppWS({
    accountId,
    enabled: !!accountId,
    onMessageReceived: handleMessageReceived,
    onStatusUpdated: handleStatusUpdated,
    onTyping: handleTyping,
    onConversationUpdated: handleConversationUpdated,
    onError: (event) => {
      toast.error(`Erro: ${event.error_message}`);
    },
  });

  // Carregar conversas
  const loadConversations = useCallback(async () => {
    if (!accountId) return;
    
    setIsLoadingConversations(true);
    try {
      console.log('[ChatWindow] Loading conversations for accountId:', accountId);
      const response = await conversationsService.getConversations({ account: accountId });
      console.log('[ChatWindow] Conversations response:', response);
      setConversations(response.results || []);
    } catch (error) {
      console.error('[ChatWindow] Error loading conversations:', error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoadingConversations(false);
    }
  }, [accountId]);

  // Carregar mensagens
  const loadMessages = useCallback(async () => {
    if (!selectedConversation || !accountId) return;
    
    setIsLoadingMessages(true);
    try {
      console.log('[ChatWindow] Loading messages for:', selectedConversation.phone_number);
      const history = await whatsappService.getConversationHistory(
        accountId,
        selectedConversation.phone_number,
        100
      );
      
      console.log('[ChatWindow] Messages loaded:', history.length);
      
      if (Array.isArray(history)) {
        const sortedMessages = [...history].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(sortedMessages);
      } else {
        console.warn('[ChatWindow] History não é um array:', history);
        setMessages([]);
      }

      if (selectedConversation.unread_count && selectedConversation.unread_count > 0) {
        try {
          const updated = await conversationsService.markAsRead(selectedConversation.id);
          setSelectedConversation(updated);
          setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
        } catch (error) {
          console.error('[ChatWindow] Error marking as read:', error);
        }
      }
    } catch (error) {
      console.error('[ChatWindow] Error loading messages:', error);
      toast.error(getErrorMessage(error));
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [accountId, selectedConversation]);

  // Handlers WebSocket
  function handleMessageReceived(event: any) {
    const newMessage = event.message;
    const messageConversationId = event.conversation_id;
    
    console.log('[ChatWindow] Message received:', {
      messageConversationId,
      selectedConversationId: selectedConversation?.id,
      match: messageConversationId === selectedConversation?.id,
      direction: newMessage.direction
    });
    
    if (selectedConversation && messageConversationId === selectedConversation.id) {
      setMessages(prev => {
        const isDuplicate = prev.some(m => 
          m.id === newMessage.id || 
          (m.whatsapp_message_id && m.whatsapp_message_id === newMessage.whatsapp_message_id)
        );
        
        if (isDuplicate) {
          console.log('[ChatWindow] Duplicate message ignored:', newMessage.id);
          return prev;
        }
        
        console.log('[ChatWindow] Adding message to chat:', newMessage.id);
        const updated = [...prev, newMessage as Message];
        return updated.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      if (newMessage.direction === 'inbound') {
        conversationsService.markAsRead(selectedConversation.id).catch(err => {
          console.error('[ChatWindow] Error marking as read:', err);
        });
      }
    }

    setConversations(prev => {
      const updated = prev.map(conv => {
        if (conv.id === event.conversation_id) {
          const isSelectedConv = selectedConversation?.id === conv.id;
          return {
            ...conv,
            last_message_at: newMessage.created_at,
            last_message_preview: newMessage.text_body?.substring(0, 50) || 'Mídia',
            unread_count: (isSelectedConv && newMessage.direction === 'inbound') 
              ? 0 
              : (newMessage.direction === 'inbound' ? (conv.unread_count || 0) + 1 : conv.unread_count),
          };
        }
        return conv;
      });
      
      return [...updated].sort((a, b) => {
        const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return dateB - dateA;
      });
    });

    if (!selectedConversation || event.conversation_id !== selectedConversation.id) {
      if (newMessage.direction === 'inbound') {
        const contactName = event.contact?.name || newMessage.from_number;
        toast(`Nova mensagem de ${contactName}`, { icon: '💬' });
      }
    }
  }

  function handleStatusUpdated(event: any) {
    setMessages(prev => prev.map(msg => {
      const isMatch = msg.id === event.message_id || 
        (event.whatsapp_message_id && msg.whatsapp_message_id === event.whatsapp_message_id);
      
      if (isMatch) {
        const updates: Partial<Message> = { status: event.status };
        if (event.status === 'delivered' && event.timestamp) {
          updates.delivered_at = event.timestamp;
        } else if (event.status === 'read' && event.timestamp) {
          updates.read_at = event.timestamp;
        }
        return { ...msg, ...updates };
      }
      return msg;
    }));
  }

  function handleTyping(event: any) {
    setTypingContacts(prev => {
      const next = new Set(prev);
      if (event.is_typing) {
        next.add(event.conversation_id);
      } else {
        next.delete(event.conversation_id);
      }
      return next;
    });
  }

  function handleConversationUpdated(event: any) {
    loadConversations();
  }

  // Enviar mensagem de texto
  const handleSendMessage = async (text: string) => {
    if (!selectedConversation || !accountId) return;

    setIsSending(true);
    try {
      const message = await whatsappService.sendTextMessage({
        account_id: accountId,
        to: selectedConversation.phone_number,
        text,
      });
      
      setMessages(prev => {
        const isDuplicate = prev.some(m => m.id === message.id);
        if (isDuplicate) return prev;
        
        const updated = [...prev, message];
        return updated.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  // Upload de arquivo
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !accountId) return;

    if (file.size > 16 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 16MB.');
      return;
    }

    setIsUploading(true);
    try {
      const message = await whatsappService.sendMediaMessage({
        account_id: accountId,
        to: selectedConversation.phone_number,
        file: file,
        caption: '',
      });
      
      setMessages(prev => {
        const isDuplicate = prev.some(m => m.id === message.id);
        if (isDuplicate) return prev;
        
        const updated = [...prev, message];
        return updated.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      toast.success('Arquivo enviado!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Alternar modo (humano/auto)
  const handleSwitchMode = async () => {
    if (!selectedConversation) return;

    try {
      const newMode = selectedConversation.mode === 'human' ? 'auto' : 'human';
      const updated = newMode === 'human'
        ? await conversationsService.switchToHuman(selectedConversation.id)
        : await conversationsService.switchToAuto(selectedConversation.id);
      
      setSelectedConversation(updated);
      setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
      toast.success(`Modo alterado para ${newMode === 'human' ? 'humano' : 'automático'}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // Selecionar conversa (com suporte mobile)
  const handleSelectConversation = (contact: Contact) => {
    const conversation = conversations.find(c => c.id === contact.id);
    setSelectedConversation(conversation || null);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  // Voltar para lista (mobile)
  const handleBackToList = () => {
    setSelectedConversation(null);
    setShowSidebar(true);
  };

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isLoadingMessages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [isLoadingMessages, messages.length]);

  // Carregar inicial
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const previousConversationRef = useRef<string | null>(null);

  useEffect(() => {
    if (previousConversationRef.current && previousConversationRef.current !== selectedConversation?.id) {
      unsubscribeFromConversation(previousConversationRef.current);
    }
    
    setMessages([]);
    
    if (selectedConversation) {
      previousConversationRef.current = selectedConversation.id;
      subscribeToConversation(selectedConversation.id);
      loadMessages();
      onConversationSelect?.(selectedConversation);
    } else {
      previousConversationRef.current = null;
      onConversationSelect?.(null);
    }

    return () => {
      if (selectedConversation) {
        unsubscribeFromConversation(selectedConversation.id);
      }
    };
  }, [selectedConversation?.id]);

  // Agrupar mensagens por data
  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  const contacts: Contact[] = conversations.map(conv => ({
    ...conversationToContact(conv),
    isTyping: typingContacts.has(conv.id),
  }));

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[600px] bg-gray-100 dark:bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-zinc-800">
      {/* Sidebar de Contatos */}
      <div 
        className={`
          ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isMobile ? 'absolute inset-0 z-20 w-full' : 'w-80 lg:w-96'}
          transition-transform duration-300 ease-in-out
          flex-shrink-0 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900
        `}
      >
        <ContactList
          contacts={contacts}
          selectedContactId={selectedConversation?.id}
          onSelectContact={handleSelectConversation}
          isLoading={isLoadingConversations}
          emptyMessage="Nenhuma conversa encontrada"
        />
      </div>

      {/* Área do Chat */}
      <div className="flex-1 flex flex-col bg-[#f0f2f5] dark:bg-zinc-950 min-w-0">
        {!selectedConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
            <div className="w-32 h-32 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
              <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-300 dark:text-zinc-600" />
            </div>
            <h3 className="text-xl font-medium text-gray-600 dark:text-gray-300 mb-2">
              Selecione uma conversa
            </h3>
            <p className="text-sm text-center max-w-md text-gray-500 dark:text-gray-400">
              Escolha uma conversa da lista para começar a interagir com seus clientes
            </p>
          </div>
        ) : (
          <>
            {/* Header do Chat */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-3 min-w-0">
                {isMobile && (
                  <button
                    onClick={handleBackToList}
                    className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 lg:hidden"
                  >
                    <ChevronLeftIcon className="w-6 h-6" />
                  </button>
                )}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {selectedConversation.contact_name?.[0]?.toUpperCase() || 
                   selectedConversation.phone_number.slice(-2)}
                </div>
                
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {selectedConversation.contact_name || selectedConversation.phone_number}
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 dark:text-zinc-400 truncate">
                      {selectedConversation.phone_number}
                    </span>
                    {typingContacts.has(selectedConversation.id) && (
                      <span className="text-violet-500 text-xs animate-pulse flex-shrink-0">
                        digitando...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Status Conexão */}
                <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                  isConnected 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="hidden md:inline">{isConnected ? 'Online' : 'Offline'}</span>
                </div>

                {/* Modo Toggle */}
                <button
                  onClick={handleSwitchMode}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedConversation.mode === 'human'
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                  }`}
                >
                  {selectedConversation.mode === 'human' ? (
                    <><UserIcon className="w-4 h-4" /> <span className="hidden sm:inline">Humano</span></>
                  ) : (
                    <><CpuChipIcon className="w-4 h-4" /> <span className="hidden sm:inline">Auto</span></>
                  )}
                </button>

                {/* Refresh */}
                <button
                  onClick={loadMessages}
                  disabled={isLoadingMessages}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                  title="Atualizar"
                >
                  <ArrowPathIcon className={`w-5 h-5 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Erro de Conexão */}
            {connectionError && (
              <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-sm">
                <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{connectionError}</span>
              </div>
            )}

            {/* Mensagens */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <ChatBubbleLeftRightIcon className="w-20 h-20 mb-4 opacity-30" />
                  <p className="text-lg font-medium">Nenhuma mensagem ainda</p>
                  <p className="text-sm">Envie a primeira mensagem!</p>
                </div>
              ) : (
                Object.entries(groupedMessages).map(([date, dayMessages]) => (
                  <div key={date}>
                    <div className="flex items-center justify-center my-4">
                      <span className="px-4 py-1.5 bg-white dark:bg-zinc-800 rounded-full text-xs text-gray-500 dark:text-zinc-400 shadow-sm">
                        {format(new Date(date), "d 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                    {dayMessages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        {...messageToBubbleProps(message)}
                        onMediaClick={(url, type, fileName) => setSelectedMedia({ url, type, fileName })}
                      />
                    ))}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de Mensagem */}
            <div className="bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-3 sm:p-4">
              {isUploading && (
                <div className="px-4 py-2 bg-violet-50 dark:bg-violet-900/20 flex items-center gap-2 text-violet-700 dark:text-violet-400 mb-2 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-500" />
                  <span className="text-sm">Enviando arquivo...</span>
                </div>
              )}
              
              <MessageInput
                onSend={handleSendMessage}
                onTyping={(isTyping) => selectedConversation && sendTypingIndicator(selectedConversation.id, isTyping)}
                disabled={!isConnected || isUploading}
                isLoading={isSending}
                showAttachment={true}
                onAttachmentClick={() => fileInputRef.current?.click()}
              />
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </>
        )}
      </div>

      {/* Visualizador de Mídia */}
      {selectedMedia && (
        <MediaViewer
          url={selectedMedia.url}
          type={selectedMedia.type}
          fileName={selectedMedia.fileName}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </div>
  );
};

export default ChatWindow;
