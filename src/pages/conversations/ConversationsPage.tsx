import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

import { Button, Modal, PageLoading, PageTitle, Textarea } from '../../components/common';
import { conversationsService, getErrorMessage } from '../../services';
import type { Conversation, ConversationNote, Message, UniversalConversation } from '../../types';

type PlatformFilter = 'all' | 'whatsapp' | 'instagram' | 'messenger';
type WhatsAppAction = 'markAsRead' | 'switchToHuman' | 'switchToAuto' | 'resolve' | 'close' | 'reopen';

const platformLabels: Record<UniversalConversation['platform'], string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
};

function buildRoute(route: string, params: Record<string, string>) {
  const search = new URLSearchParams(params).toString();
  return search ? `${route}?${search}` : route;
}

function PlatformGlyph({ platform }: { platform: UniversalConversation['platform'] }) {
  if (platform === 'instagram') {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="5" />
          <circle cx="12" cy="12" r="3.5" />
          <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      </div>
    );
  }

  if (platform === 'messenger') {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M12 3C6.76 3 2.5 6.93 2.5 11.75c0 2.74 1.38 5.19 3.54 6.8V21l2.81-1.56c.9.25 1.85.38 2.85.38 5.24 0 9.5-3.93 9.5-8.75S17.24 3 12 3Zm1.06 10.03-2.37-2.53-4.38 2.53 4.84-5.14 2.39 2.53 4.34-2.53-4.82 5.14Z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M20.52 3.48A11.82 11.82 0 0 0 12.08.25C5.6.25.33 5.49.33 11.95c0 2.06.54 4.07 1.56 5.85L.25 23.75l6.12-1.61a11.84 11.84 0 0 0 5.71 1.45h.01c6.48 0 11.75-5.25 11.75-11.71 0-3.13-1.22-6.06-3.32-8.4Zm-8.44 18.13h-.01a9.83 9.83 0 0 1-5.01-1.37l-.36-.21-3.63.96.97-3.53-.24-.37a9.76 9.76 0 0 1-1.5-5.16c0-5.4 4.41-9.79 9.83-9.79 2.62 0 5.08 1.02 6.93 2.87a9.69 9.69 0 0 1 2.89 6.92c0 5.4-4.41 9.78-9.87 9.78Zm5.37-7.36c-.29-.14-1.73-.85-2-.95-.27-.1-.47-.14-.66.14-.19.29-.76.95-.93 1.15-.17.19-.34.22-.63.08-.29-.14-1.21-.45-2.31-1.43-.85-.76-1.43-1.7-1.6-1.99-.17-.29-.02-.45.13-.59.13-.13.29-.34.44-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.14-.66-1.58-.91-2.16-.24-.57-.49-.49-.66-.5h-.56c-.19 0-.51.07-.78.36-.27.29-1.02 1-1.02 2.43 0 1.43 1.04 2.81 1.19 3 .14.19 2.03 3.1 4.92 4.34.69.29 1.23.47 1.65.6.69.22 1.31.19 1.8.12.55-.08 1.73-.71 1.97-1.39.24-.68.24-1.26.17-1.39-.07-.12-.27-.19-.56-.33Z" />
      </svg>
    </div>
  );
}

function formatRelative(value?: string | null) {
  if (!value) {
    return 'Sem atividade';
  }
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: ptBR });
}

function formatClock(value?: string | null) {
  if (!value) {
    return '--';
  }
  return format(new Date(value), 'dd/MM HH:mm', { locale: ptBR });
}

function previewText(message: Message) {
  if (message.text_body) {
    return message.text_body;
  }
  if (message.content) {
    return message.content;
  }
  if (message.media_filename) {
    return `Arquivo: ${message.media_filename}`;
  }
  return message.message_type;
}

export const ConversationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<UniversalConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [selectedWhatsAppId, setSelectedWhatsAppId] = useState<string | null>(null);
  const [whatsAppConversation, setWhatsAppConversation] = useState<Conversation | null>(null);
  const [whatsAppMessages, setWhatsAppMessages] = useState<Message[]>([]);
  const [whatsAppNotes, setWhatsAppNotes] = useState<ConversationNote[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<WhatsAppAction | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    void loadConversations(false);
    const interval = window.setInterval(() => {
      void loadConversations(true);
    }, 10000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (platformFilter !== 'all' && conversation.platform !== platformFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [
        conversation.display_name,
        conversation.secondary_identifier,
        conversation.last_message_preview,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [conversations, platformFilter, searchQuery]);

  const counters = useMemo(() => {
    return conversations.reduce(
      (accumulator, conversation) => {
        accumulator.total += 1;
        accumulator.unread += conversation.unread_count;
        accumulator[conversation.platform] += 1;
        return accumulator;
      },
      {
        total: 0,
        unread: 0,
        whatsapp: 0,
        instagram: 0,
        messenger: 0,
      }
    );
  }, [conversations]);

  async function loadConversations(isBackgroundRefresh: boolean) {
    if (isBackgroundRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await conversationsService.getUniversalConversations();
      setConversations(response.results || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }

  async function openConversation(conversation: UniversalConversation) {
    if (conversation.platform !== 'whatsapp') {
      navigate(buildRoute(conversation.route, conversation.route_params));
      return;
    }

    setSelectedWhatsAppId(conversation.source_conversation_id);
    setModalLoading(true);
    try {
      const [detail, messages, notes] = await Promise.all([
        conversationsService.getConversation(conversation.source_conversation_id),
        conversationsService.getMessages(conversation.source_conversation_id),
        conversationsService.getNotes(conversation.source_conversation_id),
      ]);

      setWhatsAppConversation(detail);
      setWhatsAppMessages(messages);
      setWhatsAppNotes(notes);
      setNoteDraft('');
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSelectedWhatsAppId(null);
    } finally {
      setModalLoading(false);
    }
  }

  async function refreshWhatsAppModal() {
    if (!selectedWhatsAppId) {
      return;
    }

    setModalLoading(true);
    try {
      const [detail, messages, notes] = await Promise.all([
        conversationsService.getConversation(selectedWhatsAppId),
        conversationsService.getMessages(selectedWhatsAppId),
        conversationsService.getNotes(selectedWhatsAppId),
      ]);
      setWhatsAppConversation(detail);
      setWhatsAppMessages(messages);
      setWhatsAppNotes(notes);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setModalLoading(false);
    }
  }

  function closeWhatsAppModal() {
    setSelectedWhatsAppId(null);
    setWhatsAppConversation(null);
    setWhatsAppMessages([]);
    setWhatsAppNotes([]);
    setNoteDraft('');
    setActionLoading(null);
  }

  async function handleWhatsAppAction(action: WhatsAppAction) {
    if (!whatsAppConversation) {
      return;
    }

    setActionLoading(action);
    try {
      switch (action) {
        case 'markAsRead':
          await conversationsService.markAsRead(whatsAppConversation.id);
          break;
        case 'switchToHuman':
          await conversationsService.switchToHuman(whatsAppConversation.id);
          break;
        case 'switchToAuto':
          await conversationsService.switchToAuto(whatsAppConversation.id);
          break;
        case 'resolve':
          await conversationsService.resolveConversation(whatsAppConversation.id);
          break;
        case 'close':
          await conversationsService.closeConversation(whatsAppConversation.id);
          break;
        case 'reopen':
          await conversationsService.reopenConversation(whatsAppConversation.id);
          break;
      }

      await Promise.all([loadConversations(true), refreshWhatsAppModal()]);
      toast.success('Conversa atualizada');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddNote() {
    if (!selectedWhatsAppId || !noteDraft.trim()) {
      return;
    }

    setSavingNote(true);
    try {
      const note = await conversationsService.addNote(selectedWhatsAppId, noteDraft.trim());
      setWhatsAppNotes((current) => [note, ...current]);
      setNoteDraft('');
      toast.success('Nota adicionada');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingNote(false);
    }
  }

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6 p-6">
      <PageTitle
        title="Conversations"
        subtitle="Atividade geral centralizada por conversa, ordenada pela ultima mensagem."
        actions={
          <Button variant="secondary" onClick={() => void loadConversations(false)}>
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border-primary bg-bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-fg-muted">Conversas</p>
          <p className="mt-2 text-3xl font-semibold text-fg-primary">{counters.total}</p>
          <p className="mt-1 text-sm text-fg-muted">Hub multicanal ativo</p>
        </div>
        <div className="rounded-2xl border border-border-primary bg-bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-fg-muted">Nao lidas</p>
          <p className="mt-2 text-3xl font-semibold text-fg-primary">{counters.unread}</p>
          <p className="mt-1 text-sm text-fg-muted">Somadas entre todas as plataformas</p>
        </div>
        <div className="rounded-2xl border border-border-primary bg-bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-fg-muted">Instagram</p>
          <p className="mt-2 text-3xl font-semibold text-fg-primary">{counters.instagram}</p>
          <p className="mt-1 text-sm text-fg-muted">Conversas do DM sincronizadas</p>
        </div>
        <div className="rounded-2xl border border-border-primary bg-bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-fg-muted">WhatsApp</p>
          <p className="mt-2 text-3xl font-semibold text-fg-primary">{counters.whatsapp}</p>
          <p className="mt-1 text-sm text-fg-muted">Com modal rapido de triagem</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border-primary bg-bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar por nome, identificador ou trecho da ultima mensagem"
              className="w-full rounded-xl border border-border-primary bg-bg-subtle py-2 pl-9 pr-3 text-sm text-fg-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'whatsapp', 'instagram', 'messenger'] as PlatformFilter[]).map((platform) => {
              const isActive = platformFilter === platform;
              const label =
                platform === 'all'
                  ? 'Todas'
                  : platformLabels[platform as UniversalConversation['platform']];
              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setPlatformFilter(platform)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-fg-primary text-bg-card'
                      : 'bg-bg-subtle text-fg-primary hover:bg-bg-hover'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-border-primary">
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_180px_120px] gap-4 border-b border-border-primary bg-bg-subtle px-5 py-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">
            <div>Conversa</div>
            <div>Ultima mensagem</div>
            <div>Ultima atividade</div>
            <div className="text-right">Acoes</div>
          </div>

          {filteredConversations.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-fg-muted">
              Nenhuma conversa encontrada com os filtros atuais.
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => void openConversation(conversation)}
                className="grid w-full grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_180px_120px] gap-4 border-b border-border-primary px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-bg-hover"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <PlatformGlyph platform={conversation.platform} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fg-primary">
                      {conversation.display_name}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                        {platformLabels[conversation.platform]}
                      </span>
                      {conversation.secondary_identifier && (
                        <span className="truncate text-xs text-fg-muted">
                          {conversation.secondary_identifier}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm text-fg-primary">
                    {conversation.last_message_preview || 'Sem mensagem registrada'}
                  </p>
                  <p className="mt-1 text-xs text-fg-muted">
                    Status: {conversation.status || 'active'}
                  </p>
                </div>

                <div className="flex flex-col justify-center">
                  <span className="text-sm font-medium text-fg-primary">
                    {formatRelative(conversation.last_message_at)}
                  </span>
                  <span className="text-xs text-fg-muted">
                    {formatClock(conversation.last_message_at)}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3">
                  {conversation.unread_count > 0 && (
                    <span className="flex min-w-[28px] items-center justify-center rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white">
                      {conversation.unread_count}
                    </span>
                  )}
                  <span className="text-xs font-medium text-fg-muted">
                    {conversation.platform === 'whatsapp' ? 'Modal' : 'Abrir'}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <Modal
        isOpen={Boolean(selectedWhatsAppId)}
        onClose={closeWhatsAppModal}
        title={whatsAppConversation ? `WhatsApp: ${whatsAppConversation.contact_name || whatsAppConversation.phone_number}` : 'WhatsApp'}
        size="xl"
      >
        {modalLoading || !whatsAppConversation ? (
          <div className="py-10 text-center text-sm text-fg-muted">Carregando conversa...</div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-border-primary bg-bg-subtle p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                    <PhoneIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-fg-primary">
                      {whatsAppConversation.contact_name || 'Contato sem nome'}
                    </p>
                    <p className="text-sm text-fg-muted">{whatsAppConversation.phone_number}</p>
                    <p className="mt-1 text-xs text-fg-muted">
                      Ultima atividade {formatRelative(whatsAppConversation.last_message_at)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-bg-card px-3 py-1 text-xs font-medium text-fg-primary">
                    Status: {whatsAppConversation.status}
                  </span>
                  <span className="rounded-full bg-bg-card px-3 py-1 text-xs font-medium text-fg-primary">
                    Modo: {whatsAppConversation.mode || 'auto'}
                  </span>
                  <span className="rounded-full bg-bg-card px-3 py-1 text-xs font-medium text-fg-primary">
                    Nao lidas: {whatsAppConversation.unread_count}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleWhatsAppAction('markAsRead')}
                  isLoading={actionLoading === 'markAsRead'}
                >
                  Marcar como lida
                </Button>
                <Button
                  size="sm"
                  variant={whatsAppConversation.mode === 'human' ? 'secondary' : 'primary'}
                  onClick={() =>
                    void handleWhatsAppAction(
                      whatsAppConversation.mode === 'human' ? 'switchToAuto' : 'switchToHuman'
                    )
                  }
                  isLoading={
                    actionLoading === 'switchToHuman' || actionLoading === 'switchToAuto'
                  }
                >
                  {whatsAppConversation.mode === 'human' ? 'Voltar para auto' : 'Assumir no humano'}
                </Button>
                {(whatsAppConversation.status === 'open' || whatsAppConversation.status === 'pending') && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleWhatsAppAction('resolve')}
                      isLoading={actionLoading === 'resolve'}
                    >
                      Resolver
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleWhatsAppAction('close')}
                      isLoading={actionLoading === 'close'}
                    >
                      Fechar
                    </Button>
                  </>
                )}
                {(whatsAppConversation.status === 'closed' || whatsAppConversation.status === 'resolved') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleWhatsAppAction('reopen')}
                    isLoading={actionLoading === 'reopen'}
                  >
                    Reabrir
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/whatsapp/inbox?conversation=${whatsAppConversation.id}`)}
                >
                  Abrir inbox completa
                </Button>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_380px]">
              <section className="min-w-0 rounded-2xl border border-border-primary bg-bg-card">
                <div className="border-b border-border-primary px-4 py-3">
                  <h3 className="text-sm font-semibold text-fg-primary">Mensagens recentes</h3>
                </div>
                <div className="max-h-[420px] space-y-3 overflow-y-auto px-4 py-4">
                  {whatsAppMessages.length === 0 ? (
                    <div className="py-8 text-center text-sm text-fg-muted">
                      Sem mensagens registradas nesta conversa.
                    </div>
                  ) : (
                    whatsAppMessages.slice(-40).map((message) => {
                      const inbound = message.direction === 'inbound';
                      return (
                        <div
                          key={message.id}
                          className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${
                              inbound
                                ? 'rounded-bl-sm border border-border-primary bg-bg-subtle text-fg-primary'
                                : 'rounded-br-sm bg-emerald-500 text-white'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{previewText(message)}</p>
                            <div
                              className={`mt-2 flex items-center gap-2 text-xs ${
                                inbound ? 'text-fg-muted' : 'text-white/80'
                              }`}
                            >
                              <span>{format(new Date(message.created_at), 'dd/MM HH:mm', { locale: ptBR })}</span>
                              <span>{inbound ? 'Cliente' : 'Equipe'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <aside className="space-y-4">
                <section className="rounded-2xl border border-border-primary bg-bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <UserCircleIcon className="h-5 w-5 text-fg-muted" />
                    <h3 className="text-sm font-semibold text-fg-primary">Resumo rapido</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-fg-muted">Ultima mensagem</p>
                      <p className="text-fg-primary">
                        {whatsAppConversation.last_message_preview || 'Sem preview'}
                      </p>
                    </div>
                    <div>
                      <p className="text-fg-muted">Etiquetas</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(whatsAppConversation.tags || []).length === 0 ? (
                          <span className="text-fg-muted">Sem tags</span>
                        ) : (
                          whatsAppConversation.tags?.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-bg-subtle px-3 py-1 text-xs font-medium text-fg-primary"
                            >
                              {tag}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-border-primary bg-bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-fg-muted" />
                    <h3 className="text-sm font-semibold text-fg-primary">Notas internas</h3>
                  </div>
                  <Textarea
                    rows={3}
                    placeholder="Registrar contexto rapido para a equipe..."
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                  />
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" onClick={() => void handleAddNote()} isLoading={savingNote}>
                      Salvar nota
                    </Button>
                  </div>
                  <div className="mt-4 max-h-[220px] space-y-3 overflow-y-auto">
                    {whatsAppNotes.length === 0 ? (
                      <p className="text-sm text-fg-muted">Nenhuma nota ainda.</p>
                    ) : (
                      whatsAppNotes.map((note) => (
                        <div key={note.id} className="rounded-xl bg-bg-subtle p-3">
                          <p className="text-sm text-fg-primary">{note.content}</p>
                          <p className="mt-2 text-xs text-fg-muted">
                            {(note.author_name || 'Equipe')} em{' '}
                            {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
