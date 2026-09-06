/**
 * Email Campaigns List Page
 * 
 * Lists all email campaigns with status, stats, and actions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  PaperAirplaneIcon,
  PauseIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Card, Button, Modal, Loading } from '../../../components/common';
import { useStore, useConfirm } from '../../../hooks';
import api from '@/services/api';
import { EMAIL_RECIPIENT_STATUS_LABELS } from '../../../utils/rotulosDeEstado';
import { PageShell, Tabela, Badge, KpiGrid } from '../../../components/ui';

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  audience_type: string;
  total_recipients: number;
  emails_sent: number;
  emails_delivered: number;
  emails_opened: number;
  emails_clicked: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface CampaignRecipient {
  id: string;
  email: string;
  name: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  error_message: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: 'Rascunho', color: 'bg-surface-2 text-fg-token', icon: ClockIcon },
  scheduled: { label: 'Agendada', color: 'bg-blue-100 text-blue-700', icon: ClockIcon },
  sending: { label: 'Enviando', color: 'bg-yellow-100 text-yellow-700', icon: ArrowPathIcon },
  sent: { label: 'Enviada', color: 'bg-green-100 text-green-700', icon: CheckCircleIcon },
  paused: { label: 'Pausada', color: 'bg-orange-100 text-orange-700', icon: PauseIcon },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: XCircleIcon },
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: 'Todos',
  customers: 'Clientes',
  subscribers: 'Inscritos',
  segment: 'Segmento',
  custom: 'Personalizado',
};

export const CampaignsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { storeId } = useStore();
  const [ConfirmDialog, confirm] = useConfirm();

  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (storeId) {
        params.store = storeId;
      }

      const response = await api.get(`/marketing/campaigns/`, { params });
      
      const data = response.data?.results || response.data || [];
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const loadRecipients = async (campaignId: string) => {
    try {
      setLoadingRecipients(true);
      const response = await api.get(`/marketing/campaigns/${campaignId}/recipients/`);
      setRecipients(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Error loading recipients:', error);
      toast.error('Erro ao carregar destinatários');
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleViewRecipients = async (campaign: EmailCampaign) => {
    setSelectedCampaign(campaign);
    setShowRecipientsModal(true);
    await loadRecipients(campaign.id);
  };

  const handleSendCampaign = async (campaign: EmailCampaign) => {
    const confirmed = await confirm({
      title: 'Enviar campanha',
      message: `Enviar campanha "${campaign.name}" agora?`,
      variant: 'info',
    });
    if (!confirmed) return;

    try {
      setActionLoading(campaign.id);
      const response = await api.post(`/marketing/campaigns/${campaign.id}/send/`);
      toast.success(`Campanha enviada! ${response.data?.sent ?? 0} emails enviados.`);
      loadCampaigns();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao enviar campanha');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCampaign = async (campaign: EmailCampaign) => {
    const confirmed = await confirm({
      title: 'Excluir campanha',
      message: `Excluir campanha "${campaign.name}"?`,
    });
    if (!confirmed) return;

    try {
      setActionLoading(campaign.id);
      await api.delete(`/marketing/campaigns/${campaign.id}/`);
      toast.success('Campanha excluída');
      loadCampaigns();
    } catch (error) {
      toast.error('Erro ao excluir campanha');
    } finally {
      setActionLoading(null);
    }
  };

  const getOpenRate = (campaign: EmailCampaign) => {
    if (!campaign.emails_delivered || campaign.emails_delivered === 0) return 0;
    return ((campaign.emails_opened / campaign.emails_delivered) * 100).toFixed(1);
  };

  const getClickRate = (campaign: EmailCampaign) => {
    if (!campaign.emails_opened || campaign.emails_opened === 0) return 0;
    return ((campaign.emails_clicked / campaign.emails_opened) * 100).toFixed(1);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <PageShell
      titulo="Campanhas de e-mail"
      acoes={
        <Button onClick={() => navigate('/marketing/email/new')}>
        <PlusIcon className="w-5 h-5 mr-2" />
        Nova Campanha
        </Button>
      }
    >

      {campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <EnvelopeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-fg-token mb-2">Nenhuma campanha criada</h3>
          <p className="text-fg-muted-token mb-6">Crie sua primeira campanha de email marketing</p>
          <Button onClick={() => navigate('/marketing/email/new')}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Criar Campanha
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusConfig.icon;
            
            return (
              <Card key={campaign.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-row max-lg:flex-col lg:items-center gap-4">
                  {/* Campaign Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-fg-token truncate">{campaign.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-fg-muted-token truncate mb-2">{campaign.subject}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-fg-muted-token">
                      <span>Audiência: {AUDIENCE_LABELS[campaign.audience_type] || campaign.audience_type}</span>
                      <span>Criada: {format(new Date(campaign.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      {campaign.completed_at && (
                        <span>Enviada: {format(new Date(campaign.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  {campaign.status === 'sent' && (
                    <div className="flex items-center gap-6 px-4 py-2 bg-surface-2 rounded-lg">
                      <div className="text-center">
                        <p className="text-lg font-bold text-fg-token">{campaign.emails_sent}</p>
                        <p className="text-xs text-fg-muted-token">Enviados</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600">{getOpenRate(campaign)}%</p>
                        <p className="text-xs text-fg-muted-token">Abertura</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">{getClickRate(campaign)}%</p>
                        <p className="text-xs text-fg-muted-token">Cliques</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {campaign.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleSendCampaign(campaign)}
                        disabled={actionLoading === campaign.id}
                      >
                        {actionLoading === campaign.id ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <PaperAirplaneIcon className="w-4 h-4 mr-1" />
                            Enviar
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleViewRecipients(campaign)}
                    >
                      <EyeIcon className="w-4 h-4 mr-1" />
                      Detalhes
                    </Button>

                    {campaign.status === 'draft' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteCampaign(campaign)}
                        disabled={actionLoading === campaign.id}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recipients Modal */}
      <Modal
        isOpen={showRecipientsModal}
        onClose={() => {
          setShowRecipientsModal(false);
          setSelectedCampaign(null);
          setRecipients([]);
        }}
        title={`Destinatários - ${selectedCampaign?.name || ''}`}
        size="xl"
      >
        {loadingRecipients ? (
          <div className="py-12 text-center">
            <ArrowPathIcon className="w-8 h-8 text-fg-muted-token animate-spin mx-auto mb-2" />
            <p className="text-fg-muted-token">Carregando destinatários...</p>
          </div>
        ) : recipients.length === 0 ? (
          <div className="py-12 text-center">
            <EnvelopeIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-fg-muted-token">Nenhum destinatário encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            <KpiGrid
              itens={[
                {
                  label: 'Destinatários',
                  value: recipients.length,
                  definicao: 'Quantos entraram nesta campanha.',
                },
                {
                  label: 'Entregues',
                  value: recipients.filter((r) =>
                    ['sent', 'delivered', 'opened', 'clicked'].includes(r.status),
                  ).length,
                  definicao: 'Saíram e chegaram na caixa de entrada.',
                  tone: 'success',
                },
                {
                  label: 'Abertos',
                  value: recipients.filter((r) => ['opened', 'clicked'].includes(r.status)).length,
                  definicao: 'Abriram o e-mail. É este número que diz se o assunto funcionou.',
                  tone: 'brand',
                },
                {
                  label: 'Falhas',
                  value: recipients.filter((r) => ['failed', 'bounced'].includes(r.status)).length,
                  definicao: 'Não chegaram — endereço inválido ou recusado pelo servidor.',
                  tone: recipients.some((r) => ['failed', 'bounced'].includes(r.status))
                    ? 'danger'
                    : 'default',
                },
              ]}
            />

            <div className="max-h-96 overflow-y-auto">
              <Tabela<(typeof recipients)[number]>
                itens={recipients}
                chave={(r) => String(r.id)}
                rotuloDaLinha={(r) => r.email}
                colunas={[
                  { chave: 'email', cabecalho: 'E-mail', render: (r) => r.email },
                  { chave: 'nome', cabecalho: 'Nome', classe: 'max-lg:hidden', render: (r) => r.name || '—' },
                  {
                    chave: 'status',
                    cabecalho: 'Status',
                    render: (r) => (
                      <Badge
                        tone={
                          r.status === 'sent' || r.status === 'delivered'
                            ? 'success'
                            : r.status === 'opened' || r.status === 'clicked'
                              ? 'info'
                              : r.status === 'failed' || r.status === 'bounced'
                                ? 'danger'
                                : 'neutral'
                        }
                      >
                        {EMAIL_RECIPIENT_STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                    ),
                  },
                  {
                    chave: 'enviado',
                    cabecalho: 'Enviado em',
                    render: (r) => (r.sent_at ? format(new Date(r.sent_at), 'dd/MM HH:mm') : '—'),
                  },
                  {
                    chave: 'erro',
                    cabecalho: 'Erro',
                    classe: 'max-lg:hidden',
                    render: (r) => (
                      <span
                        className="block max-w-xs truncate text-[var(--danger)]"
                        title={r.error_message || ''}
                      >
                        {r.error_message || '—'}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        )}
      </Modal>
      {ConfirmDialog}
    </PageShell>
  );
};

export default CampaignsListPage;
