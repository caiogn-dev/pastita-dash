/**
 * Conversas — todas as plataformas numa lista (aba "Todas" do inbox).
 *
 * PageShell → KpiGrid → Secao com busca, filtro por plataforma (chips) e a
 * Tabela do kit (que vira cartão no celular; a grade de colunas fixas de antes
 * estourava a tela). Status e modo vêm de `estados.ts` — a linha dizia
 * "Status: active", cru e em inglês. Os ícones de plataforma eram o degradê do
 * Instagram, esmeralda do WhatsApp e avatar com cor sorteada por nome: cor de
 * decoração, não de estado. Saíram.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

import { PageLoading } from '../../components/common';
import {
  Badge,
  Button,
  Input,
  KpiGrid,
  Modal,
  PageShell,
  PeriodChips,
  Secao,
  SeloDeEstado,
  Tabela,
  Textarea,
  estadoDeConversa,
  modoDeAtendimento,
} from '../../components/ui';
import type { ColunaDaTabela } from '../../components/ui';
import { conversationsService, getErrorMessage } from '../../services';
import { getInitials } from '../../utils/avatar';
import type { Conversation, ConversationNote, Message, UniversalConversation } from '../../types';
import { cn } from '../../utils/cn';

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
    if (typeof message.content === 'string') return message.content;
    if (message.message_type === 'audio') return 'Áudio';
    if (message.message_type === 'image') return 'Imagem';
    if (message.message_type === 'video') return 'Vídeo';
    if (message.message_type === 'document') return 'Documento';
    if (message.message_type === 'sticker') return 'Figurinha';
    return '';
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
      if (document.hidden) {
        return;
      }
      void loadConversations(true);
    }, 60_000);
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
      setWhatsAppMessages(messages.results);
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
      setWhatsAppMessages(messages.results);
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

  const colunas: ColunaDaTabela<UniversalConversation>[] = [
    {
      chave: 'conversa',
      cabecalho: 'Conversa',
      render: (conversation) => (
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-sm font-semibold text-fg-muted-token max-md:hidden"
            aria-hidden
          >
            {getInitials(conversation.display_name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg-token">{conversation.display_name}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge tone="neutral" size="sm">{platformLabels[conversation.platform]}</Badge>
              {conversation.secondary_identifier && (
                <span className="truncate text-xs text-fg-muted-token">{conversation.secondary_identifier}</span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      chave: 'mensagem',
      cabecalho: 'Última mensagem',
      classe: 'max-w-0 w-[40%]',
      render: (conversation) => {
        const estado = estadoDeConversa(conversation.status);
        return (
          <div className="min-w-0">
            {/* Preview pode vir vazio da API (mídia sem texto) — omitimos em vez de repetir placeholder em toda linha */}
            {conversation.last_message_preview && (
              <p className="truncate text-sm text-fg-token">{conversation.last_message_preview}</p>
            )}
            <SeloDeEstado tone={estado.tone} className="mt-1">{estado.rotulo}</SeloDeEstado>
          </div>
        );
      },
    },
    {
      chave: 'atividade',
      cabecalho: 'Última atividade',
      render: (conversation) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-fg-token">{formatRelative(conversation.last_message_at)}</span>
          <span className="text-xs text-fg-muted-token">{formatClock(conversation.last_message_at)}</span>
        </div>
      ),
    },
    {
      chave: 'naoLidas',
      cabecalho: 'Não lidas',
      alinhamento: 'direita',
      render: (conversation) =>
        conversation.unread_count > 0 ? (
          <span className="inline-flex min-w-[28px] items-center justify-center rounded-pill bg-brand px-2 py-1 text-xs font-semibold tabular-nums text-on-brand">
            {conversation.unread_count}
          </span>
        ) : (
          <span className="text-xs text-fg-muted-token">—</span>
        ),
    },
  ];

  const filtrosDePlataforma = (['all', 'whatsapp', 'instagram', 'messenger'] as PlatformFilter[]).map((platform) => ({
    value: platform,
    label: platform === 'all' ? 'Todas' : platformLabels[platform as UniversalConversation['platform']],
    count: platform === 'all' ? counters.total : counters[platform as UniversalConversation['platform']],
  }));

  const estadoDoModal = whatsAppConversation ? estadoDeConversa(whatsAppConversation.status) : null;
  const modoDoModal = whatsAppConversation ? modoDeAtendimento(whatsAppConversation.mode) : null;

  return (
    <PageShell
      titulo="Conversas"
      descricao="Todas as conversas de WhatsApp, Instagram e Messenger num lugar só."
      acoes={
        <Button
          variant="secondary"
          onClick={() => void loadConversations(false)}
          leftIcon={<ArrowPathIcon className={cn('h-4 w-4', refreshing && 'animate-spin')} />}
        >
          Atualizar
        </Button>
      }
    >
      <KpiGrid
        itens={[
          {
            label: 'Conversas',
            value: counters.total,
            definicao: 'Todas as conversas, somando as plataformas conectadas.',
            icone: <InboxIcon />,
          },
          {
            label: 'Não lidas',
            value: counters.unread,
            definicao: 'Mensagens de clientes ainda não abertas, em todas as plataformas.',
            tone: counters.unread > 0 ? 'warning' : 'default',
            icone: <EnvelopeIcon />,
          },
          {
            label: 'Instagram',
            value: counters.instagram,
            definicao: 'Conversas do Direct sincronizadas.',
            icone: <ChatBubbleLeftRightIcon />,
          },
          {
            label: 'WhatsApp',
            value: counters.whatsapp,
            definicao: 'Abrem aqui mesmo, num resumo rápido para triagem.',
            icone: <PhoneIcon />,
          },
        ]}
      />

      <Secao titulo="Lista de conversas" contador={filteredConversations.length}>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <Input
              aria-label="Buscar conversas"
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar por nome, identificador ou trecho da última mensagem"
            />
          </div>
          <PeriodChips
            ariaLabel="Filtrar por plataforma"
            options={filtrosDePlataforma}
            value={platformFilter}
            onChange={setPlatformFilter}
          />
        </div>

        <Tabela
          itens={filteredConversations}
          colunas={colunas}
          chave={(conversation) => conversation.id}
          rotuloDaLinha={(conversation) => `Abrir conversa com ${conversation.display_name}`}
          onAbrir={(conversation) => void openConversation(conversation)}
          vazio={{
            titulo: 'Nenhuma conversa encontrada',
            descricao: 'Nada bate com a busca e a plataforma escolhidas. Limpe os filtros para ver todas.',
            icone: <ChatBubbleLeftRightIcon className="h-12 w-12" />,
          }}
        />
      </Secao>

      <Modal
        isOpen={Boolean(selectedWhatsAppId)}
        onClose={closeWhatsAppModal}
        title={whatsAppConversation ? `WhatsApp: ${whatsAppConversation.contact_name || whatsAppConversation.phone_number}` : 'WhatsApp'}
        size="xl"
      >
        {modalLoading || !whatsAppConversation ? (
          <div className="py-10 text-center text-sm text-fg-muted-token">Carregando conversa...</div>
        ) : (
          <div className="space-y-6">
            <section className="superficie p-4" aria-label="Contato">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <span className="rounded-lg bg-brand-soft p-3 text-brand-ink" aria-hidden>
                    <PhoneIcon className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-lg font-semibold text-fg-token">
                      {whatsAppConversation.contact_name || 'Contato sem nome'}
                    </p>
                    <p className="text-sm text-fg-muted-token">{whatsAppConversation.phone_number}</p>
                    <p className="mt-1 text-xs text-fg-muted-token">
                      Última atividade {formatRelative(whatsAppConversation.last_message_at)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {estadoDoModal && <SeloDeEstado tone={estadoDoModal.tone}>{estadoDoModal.rotulo}</SeloDeEstado>}
                  {modoDoModal && <SeloDeEstado tone={modoDoModal.tone}>{modoDoModal.rotulo}</SeloDeEstado>}
                  <span className="text-xs text-fg-muted-token">
                    {whatsAppConversation.unread_count} não lida(s)
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
                  {whatsAppConversation.mode === 'human' ? 'Devolver ao robô' : 'Assumir a conversa'}
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
                  onClick={() => navigate(`/inbox/whatsapp?conversation=${whatsAppConversation.id}`)}
                >
                  Abrir no inbox
                </Button>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_380px]">
              <section className="superficie min-w-0" aria-label="Mensagens recentes">
                <div className="border-b border-border-token px-4 py-3">
                  <h3 className="text-sm font-semibold text-fg-token">Mensagens recentes</h3>
                </div>
                <div className="max-h-[420px] space-y-3 overflow-y-auto px-4 py-4">
                  {whatsAppMessages.length === 0 ? (
                    <div className="py-8 text-center text-sm text-fg-muted-token">
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
                            className={cn(
                              'max-w-[78%] rounded-2xl px-4 py-3 text-sm text-fg-token',
                              inbound
                                ? 'rounded-bl-sm border border-border-token bg-surface-2'
                                : 'rounded-br-sm bg-brand-soft',
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{previewText(message)}</p>
                            <div className="mt-2 flex items-center gap-2 text-xs text-fg-muted-token">
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
                <section className="superficie p-4" aria-label="Resumo rápido">
                  <div className="mb-3 flex items-center gap-2">
                    <UserCircleIcon className="h-5 w-5 text-fg-muted-token" aria-hidden />
                    <h3 className="text-sm font-semibold text-fg-token">Resumo rápido</h3>
                  </div>
                  <div className="space-y-3 text-sm">
                    {/* Sem preview da API → omitimos o bloco em vez de mostrar placeholder */}
                    {whatsAppConversation.last_message_preview && (
                      <div>
                        <p className="text-fg-muted-token">Última mensagem</p>
                        <p className="text-fg-token">{whatsAppConversation.last_message_preview}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-fg-muted-token">Etiquetas</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(whatsAppConversation.tags || []).length === 0 ? (
                          <span className="text-fg-muted-token">Sem etiquetas</span>
                        ) : (
                          whatsAppConversation.tags?.map((tag) => (
                            <Badge key={tag} tone="neutral">{tag}</Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="superficie p-4" aria-label="Notas internas">
                  <div className="mb-3 flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-fg-muted-token" aria-hidden />
                    <h3 className="text-sm font-semibold text-fg-token">Notas internas</h3>
                  </div>
                  <Textarea
                    aria-label="Nova nota interna"
                    rows={3}
                    placeholder="Registre um contexto rápido para a equipe..."
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
                      <p className="text-sm text-fg-muted-token">Nenhuma nota ainda.</p>
                    ) : (
                      whatsAppNotes.map((note) => (
                        <div key={note.id} className="rounded-lg bg-surface-2 p-3">
                          <p className="text-sm text-fg-token">{note.content}</p>
                          <p className="mt-2 text-xs text-fg-muted-token">
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
    </PageShell>
  );
};
