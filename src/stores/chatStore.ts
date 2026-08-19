/**
 * Chat Store - Zustand store for WhatsApp conversations and messages
 * 
 * Centralizes all chat state management:
 * - Conversations list with unread counts
 * - Messages cache per conversation
 * - Selected conversation
 * - Global unread badge count
 * - Real-time updates from WebSocket
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Message, Conversation } from '../types';

interface ChatState {
  // Conversations
  conversations: Conversation[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  
  // Selected conversation
  selectedConversationId: string | null;
  
  // Messages cache (conversation_id -> messages[])
  messagesCache: Record<string, Message[]>;
  messagesLoading: boolean;
  
  // Global unread count (for sidebar badge)
  totalUnreadCount: number;
  
  // WebSocket connection state
  wsConnected: boolean;
  
  // Actions
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversation: Partial<Conversation> & { id: string }) => void;
  upsertConversation: (conversation: Conversation) => void;
  removeConversation: (id: string) => void;
  
  setSelectedConversation: (id: string | null) => void;
  
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  prependMessages: (conversationId: string, messages: Message[]) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  updateMessageStatus: (messageId: string, status: string, timestamp?: string) => void;
  
  markConversationAsRead: (conversationId: string) => void;
  incrementUnreadCount: (conversationId: string) => void;
  
  setWsConnected: (connected: boolean) => void;
  setConversationsLoading: (loading: boolean) => void;
  setMessagesLoading: (loading: boolean) => void;
  setConversationsError: (error: string | null) => void;
  
  // Computed
  getSelectedConversation: () => Conversation | null;
  getConversationMessages: (conversationId: string) => Message[];
  
  // Reset
  reset: () => void;
}

// Ordena por última mensagem (mais recente primeiro) — mesma regra do backend
// (`ordering = ['-last_message_at', '-created_at']`).
const sortByLastMessage = (conversations: Conversation[]): Conversation[] =>
  [...conversations].sort((a, b) => {
    const dateA = new Date(a.last_message_at || a.created_at || 0).getTime() || 0;
    const dateB = new Date(b.last_message_at || b.created_at || 0).getTime() || 0;
    return dateB - dateA;
  });

const initialState = {
  conversations: [],
  conversationsLoading: false,
  conversationsError: null,
  selectedConversationId: null,
  messagesCache: {},
  messagesLoading: false,
  totalUnreadCount: 0,
  wsConnected: false,
};

/**
 * Quantas conversas mantêm mensagens em memória ao mesmo tempo.
 *
 * `messagesCache` nunca despejava nada: num turno o atendente abre dezenas de
 * conversas e cada uma segurava até 100 mensagens por página carregada, para
 * sempre. O painel ia ficando pesado ao longo do dia sem sintoma óbvio.
 *
 * Reabrir uma conversa despejada só refaz o fetch (100 mensagens, uma
 * requisição) — barato e previsível. 8 cobre com folga o vaivém entre os
 * atendimentos abertos de um mesmo momento.
 */
const MAX_CONVERSAS_EM_MEMORIA = 8;

/** Insere a conversa como a MAIS recente e mantém só as N últimas.
 *
 * A recência é a ordem de inserção das chaves. `{...cache, [id]: v}` não serve:
 * chave que já existe conserva a posição antiga, então reabrir uma conversa não
 * a tornava recente e ela seria despejada mesmo estando em uso.
 */
function podarCache(
  cache: Record<string, Message[]>,
  atual: string,
  messages: Message[]
): Record<string, Message[]> {
  const reordenado: Record<string, Message[]> = {};
  for (const id of Object.keys(cache)) if (id !== atual) reordenado[id] = cache[id];
  reordenado[atual] = messages;  // sempre por último = mais recente

  const ids = Object.keys(reordenado);
  if (ids.length <= MAX_CONVERSAS_EM_MEMORIA) return reordenado;

  const podado: Record<string, Message[]> = {};
  for (const id of ids.slice(ids.length - MAX_CONVERSAS_EM_MEMORIA)) podado[id] = reordenado[id];
  return podado;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Set all conversations
      setConversations: (conversations) => {
        const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
        set({
          conversations: sortByLastMessage(conversations),
          totalUnreadCount: totalUnread,
          conversationsError: null
        });
      },

      // Add a new conversation
      addConversation: (conversation) => {
        set((state) => {
          const exists = state.conversations.some(c => c.id === conversation.id);
          if (exists) return state;

          return {
            conversations: sortByLastMessage([conversation, ...state.conversations]),
            totalUnreadCount: state.totalUnreadCount + (conversation.unread_count || 0)
          };
        });
      },

      // Update-or-insert (usado pelo WS quando a conversa pode não estar na página carregada)
      upsertConversation: (conversation) => {
        const state = get();
        if (state.conversations.some(c => c.id === conversation.id)) {
          state.updateConversation(conversation);
        } else {
          state.addConversation(conversation);
        }
      },
      
      // Update a conversation
      updateConversation: (conversation) => {
        set((state) => {
          const conversations = state.conversations.map(c => 
            c.id === conversation.id ? { ...c, ...conversation } : c
          );
          
          // Recalculate total unread
          const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

          return { conversations: sortByLastMessage(conversations), totalUnreadCount: totalUnread };
        });
      },
      
      // Remove a conversation
      removeConversation: (id) => {
        set((state) => {
          const conversation = state.conversations.find(c => c.id === id);
          const newUnread = state.totalUnreadCount - (conversation?.unread_count || 0);
          
          return {
            conversations: state.conversations.filter(c => c.id !== id),
            totalUnreadCount: Math.max(0, newUnread),
            selectedConversationId: state.selectedConversationId === id ? null : state.selectedConversationId
          };
        });
      },
      
      // Select conversation
      setSelectedConversation: (id) => {
        set({ selectedConversationId: id });
      },
      
      // Set messages for a conversation
      setMessages: (conversationId, messages) => {
        set((state) => ({
          messagesCache: podarCache(state.messagesCache, conversationId, messages)
        }));
      },
      
      // Prepend older messages (scroll infinito) — dedupe por id
      prependMessages: (conversationId, messages) => {
        set((state) => {
          const existing = state.messagesCache[conversationId] || [];
          const existingIds = new Set(existing.map(m => m.id));
          const older = messages.filter(m => !existingIds.has(m.id));
          if (older.length === 0) return state;

          return {
            messagesCache: {
              ...state.messagesCache,
              [conversationId]: [...older, ...existing]
            }
          };
        });
      },

      // Add a message to a conversation
      addMessage: (conversationId, message) => {
        set((state) => {
          const existing = state.messagesCache[conversationId] || [];
          
          // Check for duplicates
          const isDuplicate = existing.some(m => 
            m.id === message.id || 
            (m.whatsapp_message_id && m.whatsapp_message_id === message.whatsapp_message_id)
          );
          
          if (isDuplicate) return state;
          
          return {
            messagesCache: {
              ...state.messagesCache,
              [conversationId]: [...existing, message]
            }
          };
        });
      },
      
      // Update a message
      updateMessage: (conversationId, messageId, updates) => {
        set((state) => {
          const messages = state.messagesCache[conversationId];
          if (!messages) return state;
          
          return {
            messagesCache: {
              ...state.messagesCache,
              [conversationId]: messages.map(m => 
                m.id === messageId ? { ...m, ...updates } : m
              )
            }
          };
        });
      },
      
      // Update message status (find in any conversation)
      updateMessageStatus: (messageId, status, timestamp) => {
        set((state) => {
          const newCache = { ...state.messagesCache };
          
          for (const convId of Object.keys(newCache)) {
            const messages = newCache[convId];
            const messageIndex = messages.findIndex(m => 
              m.id === messageId || m.whatsapp_message_id === messageId
            );
            
            if (messageIndex !== -1) {
              newCache[convId] = messages.map((m, idx) => {
                if (idx === messageIndex) {
                  const updates: Partial<Message> = { 
                    status: status as Message['status'] 
                  };
                  if (status === 'delivered' && timestamp) {
                    updates.delivered_at = timestamp;
                  }
                  if (status === 'read' && timestamp) {
                    updates.read_at = timestamp;
                  }
                  return { ...m, ...updates };
                }
                return m;
              });
              break;
            }
          }
          
          return { messagesCache: newCache };
        });
      },
      
      // Mark conversation as read
      markConversationAsRead: (conversationId) => {
        set((state) => {
          const conversation = state.conversations.find(c => c.id === conversationId);
          if (!conversation || conversation.unread_count === 0) return state;
          
          return {
            conversations: state.conversations.map(c => 
              c.id === conversationId ? { ...c, unread_count: 0 } : c
            ),
            totalUnreadCount: Math.max(0, state.totalUnreadCount - (conversation.unread_count || 0))
          };
        });
      },
      
      // Increment unread count
      incrementUnreadCount: (conversationId) => {
        set((state) => ({
          conversations: state.conversations.map(c => 
            c.id === conversationId 
              ? { ...c, unread_count: (c.unread_count || 0) + 1 } 
              : c
          ),
          totalUnreadCount: state.totalUnreadCount + 1
        }));
      },
      
      // WebSocket connection state
      setWsConnected: (connected) => set({ wsConnected: connected }),
      
      // Loading states
      setConversationsLoading: (loading) => set({ conversationsLoading: loading }),
      setMessagesLoading: (loading) => set({ messagesLoading: loading }),
      setConversationsError: (error) => set({ conversationsError: error }),
      
      // Get selected conversation
      getSelectedConversation: () => {
        const state = get();
        return state.conversations.find(c => c.id === state.selectedConversationId) || null;
      },
      
      // Get messages for a conversation
      getConversationMessages: (conversationId) => {
        return get().messagesCache[conversationId] || [];
      },
      
      // Reset store
      reset: () => set(initialState),
    }),
    {
      name: 'cardapidex-chat-store',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        selectedConversationId: state.selectedConversationId,
        // Don't persist messages cache or conversations (reload from API)
      }),
    }
  )
);

// Selector hooks for performance
export const useConversations = () => useChatStore((state) => state.conversations);
export const useSelectedConversationId = () => useChatStore((state) => state.selectedConversationId);
export const useTotalUnreadCount = () => useChatStore((state) => state.totalUnreadCount);
export const useWsConnected = () => useChatStore((state) => state.wsConnected);
