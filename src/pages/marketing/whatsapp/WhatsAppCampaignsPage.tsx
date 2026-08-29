/**
 * WhatsApp Campaigns List Page
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DevicePhoneMobileIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Card, Button, Loading } from '../../../components/common';
import { PageShell, EmptyState, KpiGrid, InsightList, Modal } from '../../../components/ui';
import { resumoDeCampanha, insightsDeCampanhas, type TomDeMetrica } from './resumoDeCampanha';
import { useConfirm } from '../../../hooks';
import { campaignsService, Campaign } from '../../../services/campaigns';
import logger from '../../../services/logger';

// Local type definitions
type CampaignStats = {
  id: string;
  name: string;
  status: string;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  messages_failed: number;
  delivery_rate: number;
  read_rate: number;
  pending: number;
  started_at: string | null;
  completed_at: string | null;
};

// =============================================================================
// COMPONENT
// =============================================================================

export const WhatsAppCampaignsPage: React.FC = () => {
  const navigate = useNavigate();
  const [ConfirmDialog, confirm] = useConfirm();

  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const response = await campaignsService.getCampaigns();
      setCampaigns(response.results || []);
    } catch (error) {
      logger.error('Failed to load campaigns', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const loadStats = async (campaignId: string) => {
    try {
      const statsData = await campaignsService.getCampaignStats(campaignId);
      setStats(statsData as CampaignStats);
    } catch (error) {
      logger.error('Failed to load stats', error);
    }
  };

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleStartCampaign = async (campaign: Campaign) => {
    setActionLoading(campaign.id);
    try {
      await campaignsService.startCampaign(campaign.id);
      toast.success('Campanha iniciada!');
      loadCampaigns();
    } catch (error) {
      logger.error('Failed to start campaign', error);
      toast.error('Erro ao iniciar campanha');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseCampaign = async (campaign: Campaign) => {
    setActionLoading(campaign.id);
    try {
      await campaignsService.pauseCampaign(campaign.id);
      toast.success('Campanha pausada');
      loadCampaigns();
    } catch (error) {
      logger.error('Failed to pause campaign', error);
      toast.error('Erro ao pausar campanha');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeCampaign = async (campaign: Campaign) => {
    setActionLoading(campaign.id);
    try {
      await campaignsService.resumeCampaign(campaign.id);
      toast.success('Campanha retomada!');
      loadCampaigns();
    } catch (error) {
      logger.error('Failed to resume campaign', error);
      toast.error('Erro ao retomar campanha');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelCampaign = async (campaign: Campaign) => {
    const confirmed = await confirm({
      title: 'Cancelar campanha',
      message: 'Tem certeza que deseja cancelar esta campanha?',
      variant: 'warning',
    });
    if (!confirmed) return;

    setActionLoading(campaign.id);
    try {
      await campaignsService.cancelCampaign(campaign.id);
      toast.success('Campanha cancelada');
      loadCampaigns();
    } catch (error) {
      logger.error('Failed to cancel campaign', error);
      toast.error('Erro ao cancelar campanha');
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceProcess = async (campaign: Campaign) => {
    setActionLoading(campaign.id);
    try {
      // Process campaign by triggering a batch via getRecipients
      const recipients = await campaignsService.getCampaignRecipients(campaign.id, 'pending');
      toast.success(`Processando: ${recipients.length} pendentes`);
      loadCampaigns();
      if (selectedCampaign?.id === campaign.id) {
        await loadStats(campaign.id);
      }
    } catch (error) {
      logger.error('Failed to process campaign', error);
      toast.error('Erro ao processar campanha');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewStats = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    await loadStats(campaign.id);
  };

  // =============================================================================
  // DERIVADOS
  // =============================================================================

  const insights = React.useMemo(() => insightsDeCampanhas(campaigns), [campaigns]);

  const totalEnviadas = campaigns.reduce((a, c) => a + (c.messages_sent ?? 0), 0);
  const totalEntregues = campaigns.reduce((a, c) => a + (c.messages_delivered ?? 0), 0);
  const totalLidas = campaigns.reduce((a, c) => a + (c.messages_read ?? 0), 0);
  const totalFalhas = campaigns.reduce((a, c) => a + (c.messages_failed ?? 0), 0);
  // O custo do canal. Até 28/ago/2026 esta tela só somava o lado bom do
  // disparo: oito pessoas já tinham apertado "Parar promoções" e não havia
  // onde ver isso.
  const totalSairam = campaigns.reduce((a, c) => a + (c.messages_opted_out ?? 0), 0);
  // `null` sem envio: "0%" acusaria um canal ruim que nem foi usado.
  const leituraMedia = totalEnviadas > 0 ? Math.round((totalLidas / totalEnviadas) * 100) : null;

  // =============================================================================
  // HELPERS
  // =============================================================================

  // Estados em tokens do tema. Antes eram `bg-surface-2 text-fg-token` fixos:
  // no modo escuro o cinza claro brigava com o fundo, e a página parecia de
  // outro sistema depois que o resto migrou para os tokens.
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; label: string; icon: React.ReactNode }> = {
      draft: {
        className: 'bg-surface-2 text-fg-muted-token',
        label: 'Rascunho',
        icon: null,
      },
      scheduled: {
        className: 'bg-surface-2 text-fg-token',
        label: 'Agendada',
        icon: <ClockIcon className="w-3 h-3" />,
      },
      running: {
        className: 'bg-brand-soft text-brand-ink',
        label: 'Enviando',
        icon: <ArrowPathIcon className="w-3 h-3 animate-spin" />,
      },
      paused: {
        className: 'bg-surface-2 text-fg-token',
        label: 'Pausada',
        icon: <PauseIcon className="w-3 h-3" />,
      },
      completed: {
        className: 'bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]',
        label: 'Concluída',
        icon: <CheckCircleIcon className="w-3 h-3" />,
      },
      cancelled: {
        className: 'bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]',
        label: 'Cancelada',
        icon: <XCircleIcon className="w-3 h-3" />,
      },
    };

    const config = statusConfig[status] || {
      className: 'bg-surface-2 text-fg-muted-token',
      label: status,
      icon: null,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-pill text-xs font-semibold ${config.className}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  /** Cor do número na linha. O rótulo já diz o que é; a cor só apressa a leitura. */
  const TOM_METRICA: Record<TomDeMetrica, string> = {
    neutro: 'text-fg-token',
    bom: 'text-[var(--success)]',
    perigo: 'text-[var(--danger)]',
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return <Loading />;
  }

  return (
    <PageShell
      trilha={[{ rotulo: 'Campanhas', href: '/marketing' }, { rotulo: 'WhatsApp' }]}
      titulo="Campanhas WhatsApp"
      descricao="Mensagem em massa para quem já é seu cliente — reativação, novidade, promoção."
      acoes={
        <Button onClick={() => navigate('/marketing/whatsapp/new')}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Nova Campanha
        </Button>
      }
    >

      {/* Duas campanhas com "Concluída" não dizem se o canal está funcionando.
          O agregado diz — e o insight diz o que fazer a respeito. */}
      {campaigns.length > 0 && (
        <div className="space-y-5 mb-5">
          <KpiGrid
            itens={[
              {
                label: 'Campanhas',
                value: campaigns.length,
                definicao: 'todas já criadas nesta conta, em qualquer estado',
              },
              {
                label: 'Pessoas alcançadas',
                value: totalEntregues,
                definicao: 'mensagens confirmadas no aparelho, somando as campanhas',
              },
              {
                label: 'Leitura média',
                value: leituraMedia === null ? '—' : `${leituraMedia}%`,
                tone: 'brand',
                definicao: 'lidas ÷ enviadas no total — abaixo de 50% o texto pede revisão',
              },
              {
                label: 'Falhas',
                value: totalFalhas,
                definicao: 'não chegaram: número inválido ou fora da janela de 24h',
              },
              {
                label: 'Pediram para parar',
                value: totalSairam,
                // `danger` só quando existe: um cartão vermelho zerado
                // treinaria o olho a ignorar justamente quando deixar de ser
                // zero.
                tone: totalSairam > 0 ? 'danger' : undefined,
                definicao: 'apertaram "Parar promoções" — não recebem mais campanha, mas continuam recebendo aviso de pedido',
              },
            ]}
          />
          {insights.length > 0 && (
            <InsightList
              titulo="O que fazer com isso"
              tom={insights.some((i) => i.direcao === 'baixa') ? 'alerta' : 'neutro'}
              itens={insights}
            />
          )}
        </div>
      )}

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        // Vazio que VENDE: dizia só "nenhuma campanha criada", que é o que a
        // pessoa já estava vendo. O que falta é o motivo de criar a primeira.
        <EmptyState
          variante="ativacao"
          estado="Nenhuma campanha ainda"
          titulo="Fale com quem já comprou de você."
          descricao="Sua base de clientes é a lista mais barata que existe: eles já conhecem a comida e já confiam no seu WhatsApp."
          acao={
            <Button onClick={() => navigate('/marketing/whatsapp/new')}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Criar campanha
            </Button>
          }
          beneficios={[
            {
              titulo: 'Trazer de volta quem sumiu',
              descricao: 'Cliente parado há 30 dias costuma voltar com um empurrão.',
            },
            {
              titulo: 'Avisar de novidade',
              descricao: 'Prato novo ou promoção chega na hora em quem já compra.',
            },
            {
              titulo: 'Encher o dia fraco',
              descricao: 'Dispare na terça de manhã e veja o movimento reagir.',
            },
            {
              titulo: 'Você escolhe quem recebe',
              descricao: 'Toda a base ou só um grupo — não é disparo às cegas.',
            },
          ]}
        />
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const r = resumoDeCampanha(campaign);
            return (
            <Card key={campaign.id} className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-fg-token truncate">
                      {campaign.name}
                    </h3>
                    {getStatusBadge(campaign.status)}
                  </div>

                  <p className="text-sm text-fg-muted-token">
                    {r.publico}
                    {campaign.started_at && (
                      <> · enviada em {new Date(campaign.started_at).toLocaleDateString('pt-BR')}</>
                    )}
                  </p>

                  {campaign.scheduled_at && campaign.status === 'scheduled' && (
                    <p className="text-sm text-brand-ink mt-1">
                      <ClockIcon className="w-4 h-4 inline mr-1" />
                      Agendada para {new Date(campaign.scheduled_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Action Buttons based on status */}
                  {campaign.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => handleStartCampaign(campaign)}
                      disabled={actionLoading === campaign.id}
                    >
                      <PlayIcon className="w-4 h-4 mr-1" />
                      Iniciar
                    </Button>
                  )}

                  {campaign.status === 'scheduled' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleStartCampaign(campaign)}
                        disabled={actionLoading === campaign.id}
                      >
                        <PlayIcon className="w-4 h-4 mr-1" />
                        Iniciar agora
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCancelCampaign(campaign)}
                        disabled={actionLoading === campaign.id}
                      >
                        <StopIcon className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                    </>
                  )}

                  {campaign.status === 'running' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleForceProcess(campaign)}
                        disabled={actionLoading === campaign.id}
                        title="Forçar processamento (útil se Celery não está rodando)"
                      >
                        <ArrowPathIcon className={`w-4 h-4 mr-1 ${actionLoading === campaign.id ? 'animate-spin' : ''}`} />
                        Processar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handlePauseCampaign(campaign)}
                        disabled={actionLoading === campaign.id}
                      >
                        <PauseIcon className="w-4 h-4 mr-1" />
                        Pausar
                      </Button>
                    </>
                  )}

                  {campaign.status === 'paused' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleResumeCampaign(campaign)}
                        disabled={actionLoading === campaign.id}
                      >
                        <PlayIcon className="w-4 h-4 mr-1" />
                        Retomar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCancelCampaign(campaign)}
                        disabled={actionLoading === campaign.id}
                      >
                        <StopIcon className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                    </>
                  )}

                  {/* Era um botão só com o ícone de gráfico. Ícone sozinho não
                      se descobre: quem não clicou nunca não sabe que existe
                      relatório. O rótulo custa 60px e resolve. */}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleViewStats(campaign)}
                  >
                    <ChartBarIcon className="w-4 h-4 mr-1" />
                    Relatório
                  </Button>
                </div>
              </div>

              {/* O RESULTADO na linha, não no modal. A pergunta da tela é "deu
                  retorno?" — enviadas é esforço, lidas é resultado. */}
              {r.metricas.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-border-token pt-3">
                  {r.metricas.map((m) => (
                    <div key={m.rotulo}>
                      <p className="text-xs font-bold text-fg-muted-token uppercase tracking-widest">{m.rotulo}</p>
                      <p className={`text-lg font-bold leading-tight ${TOM_METRICA[m.tom]}`}>{m.valor}</p>
                      {m.detalhe && <p className="text-xs text-fg-muted-token">{m.detalhe}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                r.chamada && (
                  <p className="mt-3 border-t border-border-token pt-3 text-sm text-fg-muted-token">
                    {r.chamada}
                  </p>
                )
              )}

              {/* Progress Bar for running campaigns */}
              {r.progresso !== null && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-fg-muted-token mb-1">
                    <span>Progresso do envio</span>
                    <span>{r.progresso}%</span>
                  </div>
                  <div
                    className="w-full bg-surface-2 rounded-pill h-2"
                    role="progressbar"
                    aria-valuenow={r.progresso}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Envio de ${campaign.name}`}
                  >
                    <div
                      className="bg-brand h-2 rounded-pill transition-all"
                      style={{ width: `${r.progresso}%` }}
                    />
                  </div>
                </div>
              )}
            </Card>
            );
          })}
        </div>
      )}

      {/* Era um `fixed inset-0` caseiro: sem Escape, sem foco preso, sem
          role=dialog. Leitor de tela continuava lendo a página atrás. */}
      <Modal
        open={Boolean(selectedCampaign && stats)}
        onClose={() => { setSelectedCampaign(null); setStats(null); }}
        title="Relatório da campanha"
        size="lg"
      >
        {stats && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-fg-token">{stats.name}</h3>
              {getStatusBadge(stats.status)}
            </div>

            <KpiGrid
              itens={[
                {
                  label: 'Destinatários',
                  value: stats.total_recipients,
                  definicao: 'quantas pessoas entraram na lista de envio',
                },
                {
                  label: 'Enviadas',
                  value: stats.messages_sent,
                  definicao: 'saíram do nosso lado — não garante que chegaram',
                },
                {
                  label: 'Entregues',
                  // A taxa vai colada no número: "90" sozinho não diz se é bom,
                  // e o operador não deveria dividir de cabeça.
                  value: (
                    <>
                      {stats.messages_delivered}
                      {stats.delivery_rate != null && (
                        <span className="text-base font-semibold text-fg-muted-token ml-2">
                          {stats.delivery_rate.toFixed(0)}%
                        </span>
                      )}
                    </>
                  ),
                  definicao: 'confirmadas pelo WhatsApp no aparelho do cliente',
                },
                {
                  label: 'Lidas',
                  value: (
                    <>
                      {stats.messages_read}
                      {stats.read_rate != null && (
                        <span className="text-base font-semibold text-fg-muted-token ml-2">
                          {stats.read_rate.toFixed(0)}%
                        </span>
                      )}
                    </>
                  ),
                  tone: 'brand',
                  definicao: 'a única métrica que mostra atenção de verdade',
                },
              ]}
            />

            {stats.messages_failed > 0 && (
              <div className="rounded-xl border border-border-token bg-surface-2 p-4">
                <p className="text-sm font-semibold text-[var(--danger)]">
                  {stats.messages_failed} {stats.messages_failed === 1 ? 'mensagem falhou' : 'mensagens falharam'}
                </p>
                <p className="text-sm text-fg-muted-token mt-1">
                  Quase sempre é número inválido ou contato fora da janela de 24h — vale
                  conferir a lista antes do próximo disparo.
                </p>
              </div>
            )}

            {stats.pending > 0 && (
              <p className="text-sm text-fg-muted-token">
                {stats.pending} ainda na fila de envio.
              </p>
            )}

            <div className="text-xs text-fg-muted-token space-y-1 border-t border-border-token pt-3">
              {stats.started_at && <p>Iniciada em {new Date(stats.started_at).toLocaleString('pt-BR')}</p>}
              {stats.completed_at && <p>Concluída em {new Date(stats.completed_at).toLocaleString('pt-BR')}</p>}
            </div>
          </div>
        )}
      </Modal>

      {ConfirmDialog}
    </PageShell>
  );
};

export default WhatsAppCampaignsPage;
