/**
 * WhatsApp Inbox - Página consolidada para gerenciar conversas
 * Similar ao WhatsApp Web, mas integrado ao painel Cardapidex
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { ChatToolsPanel } from '../../components/chat/ChatToolsPanel';
import { getErrorMessage } from '../../services';
import { conversationsService } from '../../services/conversations';
import * as whatsappService from '../../services/whatsapp';
import { handoverService } from '../../services/handover';
import { useWhatsAppWsContext } from '../../context/WhatsAppWsContext';
import { useChatStore } from '../../stores/chatStore';
import { useStore } from '../../hooks/useStore';
import { useRootStore } from '../../stores/rootStore';
import { MessageBubble, MessageBubbleProps } from '../../components/chat/MessageBubble';
import { MediaViewer } from '../../components/chat/MediaViewer';
import toast from 'react-hot-toast';
import { EmptyState } from '../../components/ui';
import { formatPhone } from '../../utils/formatters';
import { messagePreviewText } from '../../utils/messagePreview';
import { formatConversationTime, formatDayLabel, isSameDay } from '../../utils/chatTime';
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

const getStoreUrl = (metadata?: Record<string, unknown>) => {
  const value = metadata?.website_url || metadata?.store_url || metadata?.public_url;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

interface ConversationWithMessages extends Omit<Conversation, 'last_message'> {
  last_message?: Message | string;
}

const conversationPhoto = (conv: ConversationWithMessages): string | undefined =>
  conv.profile_picture_url || conv.profile_picture || conv.profile_picture_file || undefined;

/** Avatar com foto do contato e fallback para a inicial. */
const ConversationAvatar: React.FC<{ conv: ConversationWithMessages; size?: 'sm' | 'md' }> = ({ conv, size = 'md' }) => {
  const [broken, setBroken] = useState(false);
  const photo = conversationPhoto(conv);
  const initial = (conv.contact_name || conv.phone_number).charAt(0).toUpperCase();
  return (
    <div className={`conversation-avatar ${size === 'sm' ? 'avatar-sm' : ''}`}>
      {photo && !broken ? (
        <img src={photo} alt="" loading="lazy" crossOrigin="anonymous" onError={() => setBroken(true)} />
      ) : (
        initial
      )}
    </div>
  );
};

/**
 * Preview da última mensagem da conversa.
 * A API (`ConversationSerializer.get_last_message_preview` no server2) envia
 * `last_message_preview` (string, pode vir vazia p/ mídia sem texto) e o
 * WebSocket (`WhatsAppWsContext`) mantém o mesmo campo atualizado.
 * `last_message` como objeto Message não vem da API hoje — mantido como
 * fallback defensivo. Sem dado, retorna '' (linha vazia > ruído repetido).
 */
function conversationPreview(conv: ConversationWithMessages): string {
  if (conv.last_message_preview) return conv.last_message_preview;
  return messagePreviewText(conv.last_message);
}

/**
 * Cor estável por loja, derivada do slug.
 *
 * Hash simples → matiz no círculo cromático. Não é aleatório: a mesma loja
 * recebe sempre o mesmo tom, entre sessões e entre operadores, que é o que
 * torna a cor útil como identificação. Saturação e luminosidade fixas mantêm
 * todas as tags legíveis nos dois temas.
 */
const corDaLoja = (slug?: string | null): string => {
  if (!slug) return 'hsl(0 0% 55%)';
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(hash) % 360} 62% 45%)`;
};

/** Conversas por página. O backend pagina (default 20, teto 200); esta tela
 *  agora anexa páginas conforme o operador desce a lista. */
const PAGE_SIZE = 30;

const WhatsAppInboxPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { storeId, storeSlug, storeName, store } = useStore();
  const lojasDoUsuario = useRootStore((s) => s.stores);
  // Com uma loja só, a tag em toda linha vira ruído.
  const mostrarLojaNaConversa = lojasDoUsuario.length > 1;
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') ?? '');
  const [listFilter, setListFilter] = useState<'all' | 'unread' | 'human' | 'auto'>('all');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<{ url: string; type: string; fileName?: string } | null>(null);
  const [activePanel, setActivePanel] = useState<'templates' | 'tools' | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  // Paginação da LISTA de conversas (não confundir com o histórico de
  // mensagens de uma conversa, que tem o seu próprio cursor abaixo).
  const [buscaAtiva, setBuscaAtiva] = useState('');   // termo já debounced
  const [temMais, setTemMais] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const paginaRef = useRef(1);
  const carregandoMaisRef = useRef(false);            // trava contra disparo duplo no scroll
  const listaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const sendLockRef = useRef(false);
  // Paginação do histórico (scroll infinito) por conversa
  const historyCursorRef = useRef<Record<string, { hasMore: boolean; nextBeforeId: string | null }>>({});

  // WebSocket context para atualizações em tempo real
  const ws = useWhatsAppWsContext();

  // chatStore sincronizado pelo WebSocket
  const storeConversations = useChatStore((s) => s.conversations);
  const selectedConversationId = useChatStore((s) => s.selectedConversationId);
  const getConversationMessages = useChatStore((s) => s.getConversationMessages);
  const wsConnected = useChatStore((s) => s.wsConnected);

  // Deriva lista de conversas do store (já atualizada via WebSocket)
  const conversations = ensureArray<ConversationWithMessages>(storeConversations as ConversationWithMessages[]);

  // Conversa selecionada derivada do store — assim updates via WS (modo,
  // não-lidas, preview) refletem imediatamente na conversa aberta.
  const selectedConversation =
    conversations.find((c) => c.id === selectedConversationId) ?? null;

  // Mensagens da conversa selecionada — lidas do store (WebSocket as atualiza)
  const messages = selectedConversation
    ? ensureArray<Message>(getConversationMessages(selectedConversation.id))
    : [];

  /**
   * Marca a conversa como lida: zera o badge local imediatamente e persiste
   * no backend (senão o refresh de 60s ressuscita o contador).
   */
  const markConversationRead = useCallback((conversation: { id: string; unread_count?: number }) => {
    useChatStore.getState().markConversationAsRead(conversation.id);
    if (conversation.unread_count && conversation.unread_count > 0) {
      conversationsService.markAsRead(conversation.id).catch((error) => {
        console.error('Erro ao marcar conversa como lida:', error);
      });
    }
  }, []);

  // Guarda qual valor de ?conversation= já foi honrado, para o refresh periódico
  // não reabrir a mesma conversa. Um deep-link NOVO (outro id) continua valendo.
  const deepLinkAplicadoRef = useRef<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      // Sem `store` o backend devolve as conversas de TODAS as lojas do dono
      // misturadas — o dono de três lojas via as três numa lista só. O filtro
      // por usuário continua valendo por baixo; este é o recorte de contexto.
      // Página 1. `busca` vai para o SERVIDOR: a busca antiga filtrava só o
      // que já estava carregado, então procurar um cliente da posição 40 não
      // achava nada. No servidor ela varre a lista inteira e ainda casa o
      // conteúdo das mensagens, não só nome e telefone.
      const response = await conversationsService.getConversations({
        ...(storeSlug ? { store: storeSlug } : {}),
        page: 1,
        page_size: PAGE_SIZE,
        ...(buscaAtiva ? { search: buscaAtiva } : {}),
      });
      const convs = ensureArray<ConversationWithMessages>(response?.results || response);
      paginaRef.current = 1;
      setTemMais(Boolean(response?.next));
      // Hidrata o chatStore com a lista inicial (o WS mantém atualizado depois)
      useChatStore.getState().setConversations(convs as unknown as Conversation[]);

      // Deep-link ?conversation= vale UMA vez por valor. Esta função também roda
      // no refresh de 60s; sem a trava, a cada minuto o inbox pulava de volta
      // para a conversa da URL — trocando a conversa aberta debaixo do operador,
      // no meio de uma resposta, e marcando como lida uma conversa que ele nem
      // estava olhando.
      const requestedConversationId = searchParams.get('conversation');
      if (requestedConversationId && deepLinkAplicadoRef.current !== requestedConversationId) {
        const found = convs.find((conv) => conv.id === requestedConversationId);
        if (found) {
          deepLinkAplicadoRef.current = requestedConversationId;
          useChatStore.getState().setSelectedConversation(found.id);
          markConversationRead(found);
          await loadMessages(found.id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast.error('Erro ao carregar conversas');
    }
    // storeSlug entra nas deps: trocar de loja no seletor tem que recarregar a
    // lista, senão o inbox continua mostrando a loja anterior.
    // buscaAtiva: cada termo novo refaz a consulta da página 1 no servidor.
  }, [searchParams, markConversationRead, storeSlug, buscaAtiva]);

  /** Próxima página da lista, anexada ao fim (scroll infinito). */
  const carregarMaisConversas = useCallback(async () => {
    // Ref e não estado: dois eventos de scroll no mesmo frame leriam o estado
    // antigo e disparariam a mesma página duas vezes, duplicando linhas.
    if (carregandoMaisRef.current || !temMais) return;
    carregandoMaisRef.current = true;
    setCarregandoMais(true);
    const proxima = paginaRef.current + 1;
    try {
      const response = await conversationsService.getConversations({
        ...(storeSlug ? { store: storeSlug } : {}),
        page: proxima,
        page_size: PAGE_SIZE,
        ...(buscaAtiva ? { search: buscaAtiva } : {}),
      });
      const novas = ensureArray<ConversationWithMessages>(response?.results || response);
      paginaRef.current = proxima;
      setTemMais(Boolean(response?.next));
      if (novas.length) {
        const store = useChatStore.getState();
        const atuais = ensureArray<ConversationWithMessages>(store.conversations);
        // Dedup por id: o WebSocket pode ter promovido para o topo uma conversa
        // que também vem nesta página, e ela apareceria duas vezes na lista.
        const vistos = new Set(atuais.map((c) => c.id));
        const merged = [...atuais, ...novas.filter((c) => !vistos.has(c.id))];
        store.setConversations(merged as unknown as Conversation[]);
      }
    } catch (error) {
      console.error('Erro ao carregar mais conversas:', error);
    } finally {
      carregandoMaisRef.current = false;
      setCarregandoMais(false);
    }
  }, [storeSlug, buscaAtiva, temMais]);

  /** Dispara a próxima página ao chegar perto do fim da lista. */
  const aoRolarLista = useCallback(() => {
    const el = listaRef.current;
    if (!el) return;
    const faltam = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (faltam < 300) void carregarMaisConversas();
  }, [carregarMaisConversas]);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { results, has_more, next_before_id } = await conversationsService.getMessages(conversationId);
      // Carrega mensagens históricas no store; WS adiciona novas em tempo real
      useChatStore.getState().setMessages(conversationId, ensureArray<Message>(results));
      historyCursorRef.current[conversationId] = { hasMore: has_more, nextBeforeId: next_before_id };
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    }
  }, []);

  /** Scroll infinito: carrega página anterior do histórico preservando a posição. */
  const loadOlderMessages = useCallback(async (conversationId: string) => {
    const cursor = historyCursorRef.current[conversationId];
    if (!cursor?.hasMore || !cursor.nextBeforeId || loadingOlder) return;

    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    setLoadingOlder(true);
    try {
      const { results, has_more, next_before_id } = await conversationsService.getMessages(
        conversationId,
        100,
        cursor.nextBeforeId
      );
      useChatStore.getState().prependMessages(conversationId, ensureArray<Message>(results));
      historyCursorRef.current[conversationId] = { hasMore: has_more, nextBeforeId: next_before_id };

      // Mantém o usuário olhando para a mesma mensagem após o prepend
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop += container.scrollHeight - prevScrollHeight;
        }
      });
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder]);

  const handleSelectConversation = async (conversation: ConversationWithMessages) => {
    useChatStore.getState().setSelectedConversation(conversation.id);
    markConversationRead(conversation);
    setMessageText('');
    setLoadingMessages(true);
    try {
      await loadMessages(conversation.id);
    } finally {
      setLoadingMessages(false);
    }
  };

  const togglePanel = (panel: 'templates' | 'tools') => {
    setActivePanel(prev => prev === panel ? null : panel);
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
    } catch (error: unknown) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(getErrorMessage(error) || 'Erro ao enviar mensagem');
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
      useChatStore.getState().updateConversation({ id: selectedConversation.id, mode: newMode as Conversation['mode'] });
      toast.success('Conversa retornada para o bot');
    } catch (error) {
      console.error('Erro ao retornar para modo automático:', error);
      toast.error('Erro ao alternar modo');
    }
  };

  const handleDirectSend = async (text: string) => {
    if (!text.trim() || !selectedConversation) return;
    try {
      await whatsappService.sendMessage({
        account_id: selectedConversation.account,
        to: selectedConversation.phone_number,
        text: text.trim(),
        metadata: {
          client_request_id: crypto.randomUUID(),
          source: 'whatsapp_inbox_tools',
        },
      });
      void loadMessages(selectedConversation.id);
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Erro ao enviar mensagem');
    }
  };

  // Debounce da busca: sem isto cada tecla viraria uma requisição e as
  // respostas podiam chegar fora de ordem, deixando a lista de um termo antigo.
  useEffect(() => {
    const termo = searchTerm.trim();
    if (termo === buscaAtiva) return;
    const t = setTimeout(() => setBuscaAtiva(termo), 350);
    return () => clearTimeout(t);
  }, [searchTerm, buscaAtiva]);

  // Carga inicial — apenas UMA vez por mudança de searchParams
  useEffect(() => {
    // ESPERA a loja ser conhecida. Depois de um F5, `stores` chega por uma
    // requisição: no primeiro render `storeSlug` é null e a busca saía SEM
    // filtro, trazendo as conversas de todas as lojas; quando a loja aparecia,
    // buscava de novo com filtro e a lista trocava debaixo do operador. Era a
    // "piscada" em que o inbox parecia perder conversas ao atualizar.
    if (lojasDoUsuario.length > 0 && !storeSlug) return;
    setLoading(true);
    void loadConversations().finally(() => setLoading(false));

    // Refresh leve a cada 60s como fallback (WebSocket cuida do tempo real)
    const timer = setInterval(() => {
      if (!document.hidden) void loadConversations();
    }, 60_000);
    return () => clearInterval(timer);
  }, [loadConversations, lojasDoUsuario.length, storeSlug]);

  // Subscreve/dessubscreve do canal WS ao selecionar conversa
  useEffect(() => {
    if (!selectedConversationId) return;
    ws.subscribeToConversation(selectedConversationId);
    return () => ws.unsubscribeFromConversation(selectedConversationId);
  }, [selectedConversationId, ws]);

  // Ao sair da página, limpa a seleção — assim o WS volta a contar não-lidas
  // e notificar mensagens desta conversa enquanto o usuário está em outra tela.
  useEffect(() => {
    return () => useChatStore.getState().setSelectedConversation(null);
  }, []);

  // Trocar de loja fecha o chat aberto. Sem isto o operador muda o seletor e
  // continua com a conversa do cliente da loja ANTERIOR na tela — a lista à
  // esquerda troca, o painel à direita não, e ele responde pela loja errada.
  const storeSlugAnterior = useRef(storeSlug);
  useEffect(() => {
    if (storeSlugAnterior.current !== storeSlug) {
      storeSlugAnterior.current = storeSlug;
      useChatStore.getState().setSelectedConversation(null);
    }
  }, [storeSlug]);

  // Mensagem inbound chegou com o chat aberto → já está sendo lida agora;
  // persiste a leitura para o backend não acumular unread_count.
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  useEffect(() => {
    if (!selectedConversationId || !lastMessage) return;
    if (lastMessage.direction === 'inbound' && !document.hidden) {
      useChatStore.getState().markConversationAsRead(selectedConversationId);
      conversationsService.markAsRead(selectedConversationId).catch(() => {
        /* refresh periódico corrige */
      });
    }
  }, [selectedConversationId, lastMessage?.id]);

  // Scroll: instantâneo ao abrir a conversa, suave quando chega mensagem nova.
  // Guardado pelo id da ÚLTIMA mensagem — prepend de histórico (scroll
  // infinito) não muda a última, logo não arrasta o usuário pro fim.
  const prevConversationIdRef = useRef<string | null>(null);
  const prevLastMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lastMessage) return;
    const conversationChanged = prevConversationIdRef.current !== selectedConversationId;
    const lastChanged = prevLastMessageIdRef.current !== lastMessage.id;
    prevConversationIdRef.current = selectedConversationId;
    prevLastMessageIdRef.current = lastMessage.id;
    if (conversationChanged || lastChanged) {
      messagesEndRef.current?.scrollIntoView({ behavior: conversationChanged ? 'auto' : 'smooth' });
    }
  }, [lastMessage?.id, selectedConversationId]);

  // Dispara carga de histórico ao encostar no topo da área de mensagens
  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || !selectedConversationId) return;
    if (container.scrollTop < 80) {
      void loadOlderMessages(selectedConversationId);
    }
  }, [selectedConversationId, loadOlderMessages]);

  // A busca agora é feita pelo SERVIDOR (parâmetro `search`), sobre a lista
  // inteira e também sobre o texto das mensagens. O filtro client-side que
  // existia aqui só enxergava as conversas já baixadas: procurar alguém da
  // posição 40 não achava nada, mesmo a conversa existindo.
  //
  // Enquanto o debounce não alcança o que foi digitado, a lista ainda é a do
  // termo anterior — filtrar localmente nesse intervalo evita mostrar
  // resultados que claramente não casam com o que está no campo.
  const termoPendente = searchTerm.trim() !== buscaAtiva ? searchTerm.trim().toLowerCase() : '';
  const searchedConversations = ensureArray<ConversationWithMessages>(conversations).filter((conv) => {
    if (!termoPendente) return true;
    return (
      conv.contact_name?.toLowerCase().includes(termoPendente) ||
      conv.phone_number.includes(termoPendente)
    );
  });

  const unreadTotal = searchedConversations.filter((c) => (c.unread_count || 0) > 0).length;
  const humanTotal = searchedConversations.filter((c) => c.mode === 'human').length;

  const filteredConversations = searchedConversations.filter((conv) => {
    if (listFilter === 'unread') return (conv.unread_count || 0) > 0;
    if (listFilter === 'human') return conv.mode === 'human';
    if (listFilter === 'auto') return conv.mode !== 'human';
    return true;
  });

  return (
    <div className="whatsapp-inbox">
      {/* Conversations List */}
      <div className="conversations-panel">
        <div className="conversations-header">
          <div className="conversations-title-row">
            <h1>Conversas</h1>
            <span className={`ws-status ${wsConnected ? 'live' : 'offline'}`} title={wsConnected ? 'Atualizações em tempo real ativas' : 'Reconectando ao tempo real'}>
              <span className="ws-dot" />
              {wsConnected ? 'Ao vivo' : 'Reconectando'}
            </span>
          </div>
          <div className="search-box">
            <MagnifyingGlassIcon className="w-5 h-5 text-fg-muted-token" />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-chips" role="tablist" aria-label="Filtrar conversas">
            {([
              ['all', 'Todas', searchedConversations.length],
              ['unread', 'Não lidas', unreadTotal],
              ['human', 'Humano', humanTotal],
              ['auto', 'Bot', searchedConversations.length - humanTotal],
            ] as const).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={listFilter === key}
                className={`filter-chip ${listFilter === key ? 'active' : ''}`}
                onClick={() => setListFilter(key)}
              >
                {label}
                {count > 0 && <span className="filter-chip-count">{count}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="conversations-list" ref={listaRef} onScroll={aoRolarLista}>
          {loading ? (
            <div className="empty-state">Carregando conversas...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="empty-state">
              {/* Busca vazia e caixa vazia são problemas diferentes: no primeiro
                  a saída é limpar o termo, no segundo é esperar/ativar o canal.
                  Dizer só "Nenhuma conversa" nos dois deixa o operador sem ação. */}
              <EmptyState
                titulo={searchTerm ? 'Nada encontrado' : 'Nenhuma conversa ainda'}
                descricao={
                  searchTerm
                    ? `Nenhuma conversa casa com "${searchTerm}". Tente outro nome ou número.`
                    : 'Quando um cliente mandar mensagem no WhatsApp, a conversa aparece aqui.'
                }
              />
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const hasUnread = (conv.unread_count || 0) > 0;
              return (
                <button
                  key={conv.id}
                  type="button"
                  className={[
                    'conversation-item',
                    selectedConversation?.id === conv.id ? 'active' : '',
                    hasUnread ? 'unread' : '',
                  ].join(' ')}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <ConversationAvatar conv={conv} />
                  <div className="conversation-info">
                    <div className="conversation-title-row">
                      <h3>{conv.contact_name || formatPhone(conv.phone_number)}</h3>
                      <span className="conversation-time">
                        {formatConversationTime(conv.last_message_at)}
                      </span>
                    </div>
                    {/* De qual loja é esta conversa. Só aparece quando o usuário
                        tem mais de uma loja — com uma só, seria ruído em toda
                        linha. A cor é derivada do slug, então cada loja fica
                        com um tom estável (não muda entre sessões). */}
                    {mostrarLojaNaConversa && conv.store_name && (
                      <span
                        className="conversation-store-tag"
                        style={{ ['--tag-cor' as string]: corDaLoja(conv.store_slug) }}
                        title={`Loja: ${conv.store_name}`}
                      >
                        {conv.store_name}
                      </span>
                    )}
                    <div className="conversation-preview-row">
                      <p className="conversation-preview">
                        {conversationPreview(conv)}
                      </p>
                      <span className="conversation-badges">
                        <span className={`mode-badge ${conv.mode}`} title={conv.mode === 'auto' ? 'Bot' : 'Humano'}>
                          {conv.mode === 'auto' ? '🤖' : '👤'}
                        </span>
                        {hasUnread && (
                          <span className="unread-badge">{conv.unread_count}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
          {!loading && carregandoMais && (
            <div className="empty-state">Carregando mais...</div>
          )}
          {!loading && !temMais && filteredConversations.length > 0 && (
            <div className="empty-state">
              {buscaAtiva ? 'Fim dos resultados' : 'Fim das conversas'}
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`chat-panel ${activePanel ? 'panel-open' : ''}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-info">
                <ConversationAvatar conv={selectedConversation} size="sm" />
                <div>
                  <h2>{selectedConversation.contact_name || formatPhone(selectedConversation.phone_number)}</h2>
                  <p className="phone-number">{formatPhone(selectedConversation.phone_number)}</p>
                </div>
              </div>
              <div className="chat-actions">
                <div className="mode-selector" role="group" aria-label="Modo de atendimento">
                  <button
                    className={`mode-btn ${selectedConversation.mode === 'auto' ? 'active' : ''}`}
                    onClick={handleSwitchToAuto}
                    title="Bot responde automaticamente"
                  >
                    🤖 Bot
                  </button>
                  <button
                    className={`mode-btn ${selectedConversation.mode === 'human' ? 'active' : ''}`}
                    onClick={handleSwitchToHuman}
                    title="Você responde manualmente (bot pausado)"
                  >
                    👤 Humano
                  </button>
                </div>
                <button
                  className={`tools-toggle-btn ${activePanel === 'templates' ? 'active' : ''}`}
                  onClick={() => togglePanel('templates')}
                  title="Templates"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  <span>Templates</span>
                </button>
                <button
                  className={`tools-toggle-btn ${activePanel === 'tools' ? 'active' : ''}`}
                  onClick={() => togglePanel('tools')}
                  title="Ferramentas rápidas"
                >
                  <BoltIcon className="w-4 h-4" />
                  <span>Ferramentas</span>
                </button>
              </div>
            </div>

            {/* Messages Container */}
            <div className="messages-container" ref={messagesContainerRef} onScroll={handleMessagesScroll}>
              {loadingOlder && (
                <div className="loading-older">Carregando histórico…</div>
              )}
              {loadingMessages ? (
                <div className="messages-empty">
                  <p>Carregando mensagens...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="messages-empty">
                  <p>Nenhuma mensagem nesta conversa</p>
                  <small>Comece enviando uma mensagem</small>
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map((msg, index) => {
                    const prev = index > 0 ? messages[index - 1] : null;
                    const showDaySeparator = !prev || !isSameDay(prev.created_at, msg.created_at);
                    return (
                      <React.Fragment key={msg.id}>
                        {showDaySeparator && (
                          <div className="day-separator" role="separator">
                            <span>{formatDayLabel(msg.created_at)}</span>
                          </div>
                        )}
                        <MessageBubble
                          {...messageToBubbleProps(msg)}
                          onMediaClick={(url, type, fileName) =>
                            setMediaViewer({ url, type, fileName })
                          }
                        />
                      </React.Fragment>
                    );
                  })}
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
                aria-label="Enviar mensagem"
                title="Enviar mensagem"
              >
                {sending ? <span className="send-spinner" aria-hidden="true" /> : <PaperAirplaneIcon className="w-5 h-5" />}
              </button>
            </form>
          </>
        ) : (
          // 81% da tela ficavam pretos com uma frase de nove palavras no meio.
          // Quem abre o inbox sem conversa selecionada não precisa só saber que
          // precisa clicar — precisa saber o que dá pra fazer aqui.
          <div className="no-conversation-selected">
            <EmptyState
              icone={<ChatBubbleIcon className="h-14 w-14" />}
              titulo="Selecione uma conversa"
              descricao="Escolha um contato na lista à esquerda para ver o histórico e responder. Mensagens novas aparecem no topo em tempo real."
            />
          </div>
        )}
      </div>
      {selectedConversation && activePanel && (
        <ChatToolsPanel
          key={activePanel}
          accountId={selectedConversation.account}
          storeId={storeId || undefined}
          storeSlug={storeSlug || undefined}
          storeName={storeName || undefined}
          storeDescription={store?.description || undefined}
          storeAddress={store?.address || undefined}
          storeCity={store?.city || undefined}
          storeState={store?.state || undefined}
          storeUrl={getStoreUrl(store?.metadata)}
          conversation={selectedConversation}
          onInsertText={(text) => setMessageText(text)}
          onSendMessage={handleDirectSend}
          onAfterSend={() => void loadMessages(selectedConversation.id)}
          onClose={() => setActivePanel(null)}
          defaultTab={activePanel}
        />
      )}
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
