import { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '../../hooks';
import logger from '../../services/logger';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  ClockIcon,
  PlusIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  ArrowPathIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { Card, Button, Badge, Loading, Modal, Input } from '../../components/common';
import { scheduledMessagesService } from '../../services/scheduling';
import { whatsappService } from '../../services';
import {
  ScheduledMessage,
  CreateScheduledMessage,
  ScheduledMessageStats,
  WhatsAppAccount,
} from '../../types';
import { PageShell, Tabela, RowActions } from '../../components/ui';

const statusVariants: Record<string, 'gray' | 'info' | 'success' | 'danger' | 'warning'> = {
  pending: 'info',
  processing: 'warning',
  sent: 'success',
  failed: 'danger',
  cancelled: 'gray',
};

const messageTypeLabels: Record<string, string> = {
  text: 'Texto',
  template: 'Template',
  image: 'Imagem',
  document: 'Documento',
  interactive: 'Interativo',
};

export default function ScheduledMessagesPage() {
  const [ConfirmDialog, confirm] = useConfirm();
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [stats, setStats] = useState<ScheduledMessageStats | null>(null);
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ScheduledMessage | null>(null);
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [filters, setFilters] = useState({
    account_id: '',
    status: '',
  });
  const [formData, setFormData] = useState<CreateScheduledMessage>({
    account: '',
    to_number: '',
    contact_name: '',
    message_type: 'text',
    message_text: '',
    scheduled_at: '',
    timezone: 'America/Sao_Paulo',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [messagesRes, statsRes, accountsRes] = await Promise.all([
        scheduledMessagesService.list(filters),
        scheduledMessagesService.getStats(filters.account_id || undefined),
        whatsappService.getAccounts(),
      ]);
      setMessages(messagesRes.results);
      setStats(statsRes);
      setAccounts(accountsRes.data.results || []);
    } catch (error) {
      toast.error('Erro ao carregar mensagens agendadas');
      logger.error('Failed to load scheduled messages', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!formData.account || !formData.to_number || !formData.scheduled_at) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      await scheduledMessagesService.create(formData);
      toast.success('Mensagem agendada com sucesso');
      setIsModalOpen(false);
      setFormData({
        account: '',
        to_number: '',
        contact_name: '',
        message_type: 'text',
        message_text: '',
        scheduled_at: '',
        timezone: 'America/Sao_Paulo',
        notes: '',
      });
      fetchData();
    } catch (error) {
      toast.error('Erro ao agendar mensagem');
      logger.error('Failed to schedule message', error);
    }
  };

  const handleCancel = async (id: string) => {
    const confirmed = await confirm({
      title: 'Cancelar mensagem',
      message: 'Deseja cancelar esta mensagem agendada?',
      variant: 'warning',
    });
    if (!confirmed) return;

    try {
      await scheduledMessagesService.cancel(id);
      toast.success('Mensagem cancelada');
      fetchData();
    } catch (error) {
      toast.error('Erro ao cancelar mensagem');
      logger.error('Failed to cancel message', error);
    }
  };

  const handleReschedule = async () => {
    if (!selectedMessage || !newScheduledAt) return;

    try {
      await scheduledMessagesService.reschedule(selectedMessage.id, newScheduledAt);
      toast.success('Mensagem reagendada');
      setIsRescheduleModalOpen(false);
      setSelectedMessage(null);
      setNewScheduledAt('');
      fetchData();
    } catch (error) {
      toast.error('Erro ao reagendar mensagem');
      logger.error('Failed to reschedule message', error);
    }
  };

  const openRescheduleModal = (message: ScheduledMessage) => {
    setSelectedMessage(message);
    setNewScheduledAt(message.scheduled_at?.slice(0, 16) || '');
    setIsRescheduleModalOpen(true);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <PageShell
      titulo="Mensagens agendadas"
      acoes={
        <Button onClick={() => setIsModalOpen(true)}>
        <PlusIcon className="h-5 w-5 mr-2" />
        Nova Mensagem
        </Button>
      }
    >

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-7 max-lg:grid-cols-4 max-md:grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-fg-token dark:text-[var(--dark-text-primary,#FAF9F7)]">{stats.total}</p>
            <p className="text-sm text-fg-muted-token">Total</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.pending}</p>
            <p className="text-sm text-fg-muted-token">Pendentes</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.sent}</p>
            <p className="text-sm text-fg-muted-token">Enviadas</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
            <p className="text-sm text-fg-muted-token">Falhas</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-fg-muted-token">{stats.cancelled}</p>
            <p className="text-sm text-fg-muted-token">Canceladas</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{stats.scheduled_today}</p>
            <p className="text-sm text-fg-muted-token">Agendadas Hoje</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.sent_today}</p>
            <p className="text-sm text-fg-muted-token">Enviadas Hoje</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <select
            className="rounded-md border-border-token shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            value={filters.account_id}
            onChange={(e) => setFilters({ ...filters, account_id: e.target.value })}
          >
            <option value="">Todas as contas</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border-border-token shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="sent">Enviada</option>
            <option value="failed">Falhou</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <Button variant="secondary" onClick={fetchData}>
            <ArrowPathIcon className="h-5 w-5" />
          </Button>
        </div>
      </Card>

      <Tabela<ScheduledMessage>
        itens={messages}
        chave={(m) => m.id}
        rotuloDaLinha={(m) => `Mensagem para ${m.to_number}`}
        carregando={loading}
        vazio={{
          titulo: 'Nenhuma mensagem agendada',
          descricao: 'Agende uma mensagem para ela sair sozinha na hora marcada.',
          icone: <ClockIcon className="h-12 w-12" />,
        }}
        colunas={[
          {
            chave: 'destinatario',
            cabecalho: 'Destinatário',
            render: (m) => (
              <div className="min-w-0">
                <p className="font-medium text-fg-token">{m.to_number}</p>
                {m.contact_name && (
                  <p className="text-sm text-fg-muted-token">{m.contact_name}</p>
                )}
              </div>
            ),
          },
          {
            chave: 'tipo',
            cabecalho: 'Tipo',
            render: (m) => messageTypeLabels[m.message_type] || m.message_type,
          },
          {
            chave: 'quando',
            cabecalho: 'Agendado para',
            render: (m) => (
              <div className="flex items-center gap-1 text-sm text-fg-token">
                <CalendarIcon className="h-4 w-4 text-fg-muted-token" />
                {m.scheduled_at
                  ? format(parseISO(m.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : '—'}
              </div>
            ),
          },
          {
            chave: 'status',
            cabecalho: 'Status',
            render: (m) => <Badge variant={statusVariants[m.status]}>{m.status_display}</Badge>,
          },
          { chave: 'conta', cabecalho: 'Conta', soNoDesktop: true, render: (m) => m.account_name },
          {
            chave: 'acoes',
            cabecalho: 'Ações',
            alinhamento: 'direita',
            render: (m) =>
              // Eram três botões de ícone nu — relógio, X e seta circular — e
              // qual deles aparecia dependia do status. Ninguém adivinha que a
              // seta circular quer dizer "reagendar".
              m.status === 'pending' || m.status === 'failed' ? (
                <RowActions
                  rotulo={`Ações da mensagem para ${m.to_number}`}
                  acoes={[
                    {
                      rotulo: m.status === 'failed' ? 'Tentar de novo' : 'Reagendar',
                      icone:
                        m.status === 'failed' ? (
                          <ArrowPathIcon className="h-4 w-4" />
                        ) : (
                          <ClockIcon className="h-4 w-4" />
                        ),
                      onClick: () => openRescheduleModal(m),
                    },
                    ...(m.status === 'pending'
                      ? [{
                          rotulo: 'Cancelar envio',
                          icone: <XMarkIcon className="h-4 w-4" />,
                          destrutiva: true,
                          onClick: () => handleCancel(m.id),
                        }]
                      : []),
                  ]}
                />
              ) : null,
          },
        ]}
      />

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Agendar Mensagem"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg-token">Conta WhatsApp *</label>
            <select
              className="mt-1 block w-full rounded-md border-border-token dark:border-zinc-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={formData.account}
              onChange={(e) => setFormData({ ...formData, account: e.target.value })}
            >
              <option value="">Selecione uma conta</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.display_phone_number})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Número do Destinatário *"
            placeholder="5511999999999"
            value={formData.to_number}
            onChange={(e) => setFormData({ ...formData, to_number: e.target.value })}
          />

          <Input
            label="Nome do Contato"
            placeholder="Nome do destinatário"
            value={formData.contact_name || ''}
            onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-fg-token">Tipo de Mensagem</label>
            <select
              className="mt-1 block w-full rounded-md border-border-token dark:border-zinc-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={formData.message_type}
              onChange={(e) =>
                setFormData({ ...formData, message_type: e.target.value as any })
              }
            >
              <option value="text">Texto</option>
              <option value="template">Template</option>
              <option value="image">Imagem</option>
              <option value="document">Documento</option>
              <option value="interactive">Interativo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-token">Mensagem</label>
            <textarea
              className="mt-1 block w-full rounded-md border-border-token dark:border-zinc-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={4}
              value={formData.message_text || ''}
              onChange={(e) => setFormData({ ...formData, message_text: e.target.value })}
              placeholder="Digite a mensagem..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-token">Data e Hora *</label>
            <input
              type="datetime-local"
              className="mt-1 block w-full rounded-md border-border-token dark:border-zinc-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={formData.scheduled_at}
              onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-fg-token">Notas</label>
            <textarea
              className="mt-1 block w-full rounded-md border-border-token dark:border-zinc-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas internas..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>
              <PaperAirplaneIcon className="h-5 w-5 mr-2" />
              Agendar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        title="Reagendar Mensagem"
      >
        <div className="space-y-4">
          <p className="text-fg-muted-token">
            Reagendar mensagem para {selectedMessage?.to_number}
          </p>

          <div>
            <label className="block text-sm font-medium text-fg-token">Nova Data e Hora</label>
            <input
              type="datetime-local"
              className="mt-1 block w-full rounded-md border-border-token dark:border-zinc-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={newScheduledAt}
              onChange={(e) => setNewScheduledAt(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsRescheduleModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReschedule}>
              <ClockIcon className="h-5 w-5 mr-2" />
              Reagendar
            </Button>
          </div>
        </div>
      </Modal>
      {ConfirmDialog}
    </PageShell>
  );
}
