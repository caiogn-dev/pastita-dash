/**
 * MessengerInbox — inbox do Facebook Messenger.
 *
 * Superfície de trabalho: PageShell no modo `quadro` (título curto, ações no
 * canto, o resto da altura para o chat). O azul do Messenger pintava o ícone,
 * a conversa selecionada, o contador, o avatar e todo balão enviado — 23 cores
 * cruas, cada uma com o seu par de tema escuro. Agora é a identidade do painel: ouro
 * da marca no que é nosso (selecionado, não lidas, balão enviado), neutro no
 * resto.
 */
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { messengerService, MessengerConversation, MessengerMessage } from '../../services/messenger';
import { normalizePaginatedResponse } from '../../services/api';
import { ChatToolsPanel } from '../../components/chat/ChatToolsPanel';
import { Badge, Button, EmptyState, Input, PageShell } from '../../components/ui';
import { cn } from '../../utils/cn';
import '../whatsapp/WhatsAppInbox.css';

/** Inicial do contato, para o avatar sem foto. */
const inicial = (conv: MessengerConversation) => (conv.participant_name || conv.psid || '?')[0].toUpperCase();

function Avatar({ conv, comNome = false }: { conv: MessengerConversation; comNome?: boolean }) {
  if (conv.participant_profile_pic) {
    return (
      <img
        src={conv.participant_profile_pic}
        alt={comNome ? conv.participant_name || '' : ''}
        className="h-10 w-10 shrink-0 rounded-pill object-cover"
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-2" aria-hidden>
      <span className="text-sm font-bold text-fg-muted-token">{inicial(conv)}</span>
    </div>
  );
}

export default function MessengerInbox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<MessengerConversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePanel, setActivePanel] = useState<'templates' | 'tools' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = () => {
    setLoading(true);
    messengerService.getConversations(searchParams.get('account') || undefined)
      .then((r: any) => {
        const list = normalizePaginatedResponse<MessengerConversation>(r.data);
        setConversations(list);
        const requestedConversationId = searchParams.get('conversation');
        if (requestedConversationId) {
          const conversation = list.find((item) => item.id === requestedConversationId);
          if (conversation) {
            void selectConversation(conversation);
          }
        }
      })
      .catch(() => {
        toast.error('Erro ao carregar conversas do Messenger');
        setConversations([]);
      })
      .finally(() => setLoading(false));
  };

  const selectConversation = async (conv: MessengerConversation) => {
    setSelectedConversation(conv);
    setActivePanel(null);
    const next = new URLSearchParams(searchParams);
    if (conv.account) next.set('account', conv.account);
    next.set('conversation', conv.id);
    setSearchParams(next, { replace: true });
    setLoadingMessages(true);
    try {
      const r: any = await messengerService.getMessages(conv.id);
      const msgs = normalizePaginatedResponse<MessengerMessage>(r.data);
      setMessages(msgs);
      if (conv.unread_count > 0) {
        await messengerService.markAsRead(conv.id);
        setConversations(prev =>
          prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
        );
      }
    } catch {
      toast.error('Erro ao carregar mensagens');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async () => {
    if (!selectedConversation || !messageText.trim() || sending) return;
    const content = messageText.trim();
    setMessageText('');
    setSending(true);
    try {
      const r: any = await messengerService.sendMessage(selectedConversation.id, {
        content,
        message_type: 'text',
      });
      const newMsg: MessengerMessage = r.data;
      setMessages(prev => [...prev, newMsg]);
    } catch {
      setMessageText(content);
    } finally {
      setSending(false);
    }
  };

  const handleToolsSend = async (message: string) => {
    if (!selectedConversation || !message.trim()) return;
    setSending(true);
    try {
      const r: any = await messengerService.sendMessage(selectedConversation.id, {
        content: message.trim(),
        message_type: 'text',
      });
      setMessages(prev => [...prev, r.data]);
    } catch {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  function togglePanel(panel: 'templates' | 'tools') {
    setActivePanel(prev => prev === panel ? null : panel);
  }

  function handleInsertText(text: string) {
    setMessageText(text);
  }

  const filtered = conversations.filter((c) => {
    const name = (c.participant_name || c.psid || '').toLowerCase();
    const rawContent = (c.last_message as any)?.content;
    const preview = (typeof rawContent === 'string' ? rawContent : '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || preview.includes(q);
  });

  return (
    <PageShell
      variante="quadro"
      titulo="Messenger"
      acoes={
        <Button
          variant="ghost"
          size="sm"
          onClick={loadConversations}
          aria-label="Atualizar conversas"
          title="Atualizar"
          leftIcon={<ArrowPathIcon className="h-4 w-4" />}
        >
          Atualizar
        </Button>
      }
    >
      <div className="whatsapp-inbox superficie min-h-0 flex-1 overflow-hidden">
        {/* Conversations panel */}
        <div className="conversations-panel">
          <div className="border-b border-border-token p-4">
            <p className="mb-3 text-xs text-fg-muted-token">{conversations.length} conversa(s)</p>
            <Input
              size="sm"
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
              aria-label="Buscar conversas"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <p className="py-8 text-center text-sm text-fg-muted-token">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-fg-muted-token">Nenhuma conversa.</p>
            ) : (
              filtered.map((conv) => {
                const selecionada = selectedConversation?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => selectConversation(conv)}
                    aria-current={selecionada ? 'true' : undefined}
                    className={cn(
                      'mb-2 w-full rounded-xl border p-3 text-left transition-colors',
                      selecionada ? 'border-brand bg-brand-soft' : 'border-border-token bg-surface hover:bg-surface-2',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar conv={conv} comNome />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-fg-token">
                            {conv.participant_name || conv.psid}
                          </p>
                          {conv.unread_count > 0 && (
                            <span
                              className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-pill bg-brand px-1 text-badge font-semibold text-on-brand"
                              aria-label={`${conv.unread_count} não lidas`}
                            >
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-fg-muted-token">
                          {(() => { const c = (conv.last_message as any)?.content; return typeof c === 'string' ? c : '—'; })()}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat panel */}
        <div className={`chat-panel ${activePanel ? 'panel-open' : ''}`}>
          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                icone={<ChatBubbleLeftRightIcon className="h-12 w-12" />}
                titulo="Selecione uma conversa"
                descricao="As mensagens do Messenger aparecem aqui assim que você escolher uma conversa na lista."
              />
            </div>
          ) : (
            <>
              <div className="chat-header">
                <Avatar conv={selectedConversation} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg-token">
                    {selectedConversation.participant_name || selectedConversation.psid}
                  </p>
                  <p className="text-xs text-fg-muted-token">Messenger</p>
                </div>
                <Badge tone="neutral">Facebook</Badge>
                <button
                  type="button"
                  className={`tools-toggle-btn ${activePanel === 'templates' ? 'active' : ''}`}
                  onClick={() => togglePanel('templates')}
                  aria-label="Modelos de mensagem"
                  aria-pressed={activePanel === 'templates'}
                  title="Modelos"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className={`tools-toggle-btn ${activePanel === 'tools' ? 'active' : ''}`}
                  onClick={() => togglePanel('tools')}
                  aria-label="Ferramentas"
                  aria-pressed={activePanel === 'tools'}
                  title="Ferramentas"
                >
                  <BoltIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="messages-container">
                {loadingMessages ? (
                  <p className="py-10 text-center text-sm text-fg-muted-token">Carregando mensagens...</p>
                ) : messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-fg-muted-token">Nenhuma mensagem ainda.</p>
                ) : (
                  <div className="messages-list">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.is_from_page ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={cn(
                            'max-w-[72%] rounded-2xl px-4 py-3 text-fg-token',
                            msg.is_from_page
                              ? 'rounded-br-sm bg-brand-soft'
                              : 'rounded-bl-sm border border-border-token bg-surface',
                          )}
                        >
                          {msg.attachment_url ? (
                            <img src={msg.attachment_url} alt="Anexo" className="max-w-full rounded-xl" loading="lazy" decoding="async" crossOrigin="anonymous" />
                          ) : (
                            <p className="whitespace-pre-wrap break-words text-sm">{typeof msg.content === 'string' ? msg.content : ''}</p>
                          )}
                          <div className="mt-2 flex items-center justify-end gap-1 text-xs text-fg-muted-token">
                            <span>
                              {new Date(msg.sent_at || msg.created_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {msg.is_from_page && (
                              msg.is_read
                                ? <CheckCircleIcon className="h-3.5 w-3.5" aria-label="Lida" />
                                : <CheckIcon className="h-3.5 w-3.5" aria-label="Enviada" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="border-t border-border-token bg-surface px-5 py-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Input
                      aria-label="Mensagem"
                      placeholder="Digite sua mensagem..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={() => void handleSend()}
                    disabled={!messageText.trim() || sending}
                    aria-label="Enviar mensagem"
                    title="Enviar mensagem"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {selectedConversation && activePanel && (
          <ChatToolsPanel
            key={activePanel}
            accountId={(selectedConversation.account as string) || ''}
            conversation={selectedConversation as any}
            onInsertText={handleInsertText}
            onSendMessage={handleToolsSend}
            onAfterSend={() => selectedConversation && void selectConversation(selectedConversation)}
            onClose={() => setActivePanel(null)}
            defaultTab={activePanel}
          />
        )}
      </div>
    </PageShell>
  );
}
