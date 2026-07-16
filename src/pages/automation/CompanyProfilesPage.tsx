import React, { useState, useEffect } from 'react';
import { useConfirm } from '../../hooks';
import logger from '../../services/logger';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  CpuChipIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { companyProfileService, businessTypeLabels } from '../../services/automation';
import { CompanyProfile } from '../../types';
import { Loading as LoadingSpinner } from '../../components/common/Loading';
import { toast } from 'react-hot-toast';

const CompanyProfilesPage: React.FC = () => {
  const [ConfirmDialog, confirm] = useConfirm();
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadProfiles();
  }, [page]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const response = await companyProfileService.list({ page, page_size: 20 });
      setProfiles(response.results);
      setTotalCount(response.count);
    } catch (error) {
      toast.error('Erro ao carregar perfis de empresa');
      logger.error('Failed to load company profiles', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateApiKey = async (id: string) => {
    const confirmed = await confirm({
      title: 'Regenerar API key',
      message: 'A chave atual será invalidada.',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      const result = await companyProfileService.regenerateApiKey(id);
      toast.success('Nova API key gerada!');
      navigator.clipboard.writeText(result.api_key);
      toast.success('API key copiada para a área de transferência');
      loadProfiles();
    } catch {
      toast.error('Erro ao gerar nova API key');
    }
  };

  if (loading && profiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-row max-sm:flex-col sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-fg-token">Automação & Perfis</h1>
          <p className="mt-1 text-sm text-fg-muted-token">
            Configure automações, mensagens e agentes para cada número WhatsApp
          </p>
        </div>
        <Link
          to="/automation/companies/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-medium shadow-sm transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Novo Perfil
        </Link>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/automation/intents/stats', icon: ChartBarIcon, label: 'Estatísticas', color: 'text-brand bg-brand-soft' },
          { to: '/automation/intents/logs', icon: ChatBubbleLeftRightIcon, label: 'Logs de Intenções', color: 'text-brand bg-brand-soft' },
          { to: '/automation/logs', icon: ChartBarIcon, label: 'Logs de Automação', color: 'text-brand bg-brand-soft' },
          { to: '/automation/scheduled', icon: CpuChipIcon, label: 'Agendamentos', color: 'text-brand bg-brand-soft' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border-token hover:border-[var(--border-strong)] transition-colors group"
          >
            <div className={`p-2 rounded-lg ${item.color} transition-colors`}>
              <item.icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-fg-muted-token group-hover:text-fg-token truncate">
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Profiles Grid */}
      {profiles.length === 0 ? (
        <div className="text-center py-16 bg-surface rounded-2xl border border-border-token">
          <BuildingOfficeIcon className="mx-auto h-14 w-14 text-fg-muted-token opacity-40 mb-4" />
          <h3 className="text-base font-semibold text-fg-token mb-1">Nenhum perfil configurado</h3>
          <p className="text-sm text-fg-muted-token mb-6">
            Crie um perfil de empresa para começar a usar automações.
          </p>
          <Link
            to="/automation/companies/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-medium transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Criar Perfil
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 max-xl:grid-cols-2">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-surface rounded-2xl border border-border-token hover:border-[var(--border-strong)] shadow-sm hover:shadow-md transition-all"
            >
              {/* Card Header */}
              <div className="p-5 pb-4 flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-brand-soft flex items-center justify-center">
                    <BuildingOfficeIcon className="h-6 w-6 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-fg-token truncate">
                      {profile.company_name}
                    </h3>
                    <p className="text-xs text-fg-muted-token truncate mt-0.5">
                      {profile.account_phone || 'Sem número'}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {profile.auto_reply_enabled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--success-soft)] text-[var(--success)]">
                      <CheckCircleIcon className="w-3 h-3" />
                      Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-2 text-fg-muted-token">
                      <XCircleIcon className="w-3 h-3" />
                      Inativo
                    </span>
                  )}
                </div>
              </div>

              {/* Info Row */}
              <div className="px-5 pb-3">
                <div className="text-xs text-fg-muted-token">
                  {businessTypeLabels[profile.business_type || ''] || profile.business_type || 'Tipo não definido'}
                </div>
              </div>

              {/* Feature Tags */}
              <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                {profile.welcome_message_enabled && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-surface-2 text-fg-muted-token">
                    Boas-vindas
                  </span>
                )}
                {profile.abandoned_cart_notification && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-surface-2 text-fg-muted-token">
                    Carrinho
                  </span>
                )}
                {profile.pix_notification_enabled && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-surface-2 text-fg-muted-token">
                    PIX
                  </span>
                )}
                {profile.payment_confirmation_enabled && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-surface-2 text-fg-muted-token">
                    Pagamento
                  </span>
                )}
                {profile.order_status_notification_enabled && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-surface-2 text-fg-muted-token">
                    Status pedido
                  </span>
                )}
                {profile.use_ai_agent && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-brand-soft text-brand font-medium">
                    Agente IA
                  </span>
                )}
              </div>

              {/* ─── ACTION BUTTONS ─── */}
              <div className="px-5 py-4 border-t border-border-token grid grid-cols-3 gap-2">
                {/* Mensagens — PRIMARY ACTION */}
                <Link
                  to={`/automation/companies/${profile.id}/messages`}
                  className="col-span-3 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-medium transition-colors"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  Mensagens Automáticas
                </Link>

                {/* Configurar */}
                <Link
                  to={`/automation/companies/${profile.id}`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border-token text-fg-token text-xs font-medium hover:bg-surface-2 transition-colors"
                >
                  <Cog6ToothIcon className="h-3.5 w-3.5" />
                  Configurar
                </Link>

                {/* Stats */}
                <Link
                  to={`/automation/intents/stats`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border-token text-fg-token text-xs font-medium hover:bg-surface-2 transition-colors"
                >
                  <ChartBarIcon className="h-3.5 w-3.5" />
                  Stats
                </Link>

                {/* API Key */}
                <button
                  onClick={() => handleRegenerateApiKey(profile.id)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border-token text-fg-muted-token text-xs font-medium hover:bg-surface-2 transition-colors"
                  title="Gerar nova API key"
                >
                  <KeyIcon className="h-3.5 w-3.5" />
                  API Key
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-fg-muted-token">
            {(page - 1) * 20 + 1}–{Math.min(page * 20, totalCount)} de {totalCount}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-border-token bg-surface text-sm text-fg-token hover:bg-surface-2 disabled:opacity-40 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * 20 >= totalCount}
              className="px-3 py-1.5 rounded-lg border border-border-token bg-surface text-sm text-fg-token hover:bg-surface-2 disabled:opacity-40 transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
};

export default CompanyProfilesPage;
