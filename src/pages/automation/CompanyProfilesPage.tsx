import React, { useState, useEffect } from 'react';
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
    if (!confirm('Tem certeza que deseja gerar uma nova API key? A chave atual será invalidada.')) return;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Automação & Perfis</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Configure automações, mensagens e agentes para cada número WhatsApp
          </p>
        </div>
        <Link
          to="/automation/companies/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium shadow-sm transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Novo Perfil
        </Link>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/automation/intents/stats', icon: ChartBarIcon, label: 'Estatísticas', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400' },
          { to: '/automation/intents/logs', icon: ChatBubbleLeftRightIcon, label: 'Logs de Intenções', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
          { to: '/automation/logs', icon: ChartBarIcon, label: 'Logs de Automação', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400' },
          { to: '/automation/scheduled', icon: CpuChipIcon, label: 'Agendamentos', color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 transition-colors group"
          >
            <div className={`p-2 rounded-lg ${item.color} transition-colors`}>
              <item.icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-white truncate">
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Profiles Grid */}
      {profiles.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
          <BuildingOfficeIcon className="mx-auto h-14 w-14 text-gray-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Nenhum perfil configurado</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
            Crie um perfil de empresa para começar a usar automações.
          </p>
          <Link
            to="/automation/companies/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Criar Perfil
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 shadow-sm hover:shadow-md transition-all"
            >
              {/* Card Header */}
              <div className="p-5 pb-4 flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <BuildingOfficeIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {profile.company_name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                      {profile.account_phone || 'Sem número'}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {profile.auto_reply_enabled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      <CheckCircleIcon className="w-3 h-3" />
                      Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-zinc-400">
                      <XCircleIcon className="w-3 h-3" />
                      Inativo
                    </span>
                  )}
                </div>
              </div>

              {/* Info Row */}
              <div className="px-5 pb-3">
                <div className="text-xs text-gray-500 dark:text-zinc-400">
                  {businessTypeLabels[profile.business_type || ''] || profile.business_type || 'Tipo não definido'}
                </div>
              </div>

              {/* Feature Tags */}
              <div className="px-5 pb-4 flex flex-wrap gap-1.5">
                {profile.welcome_message_enabled && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    👋 Boas-vindas
                  </span>
                )}
                {profile.abandoned_cart_notification && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                    🛒 Carrinho
                  </span>
                )}
                {profile.pix_notification_enabled && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                    💠 PIX
                  </span>
                )}
                {profile.payment_confirmation_enabled && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    ✅ Pagamento
                  </span>
                )}
                {profile.order_status_notification_enabled && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                    📦 Status pedido
                  </span>
                )}
                {profile.use_ai_agent && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    🤖 Agente IA
                  </span>
                )}
              </div>

              {/* ─── ACTION BUTTONS ─── */}
              <div className="px-5 py-4 border-t border-gray-100 dark:border-zinc-800 grid grid-cols-3 gap-2">
                {/* Mensagens — PRIMARY ACTION */}
                <Link
                  to={`/automation/companies/${profile.id}/messages`}
                  className="col-span-3 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  Mensagens Automáticas
                </Link>

                {/* Configurar */}
                <Link
                  to={`/automation/companies/${profile.id}`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Cog6ToothIcon className="h-3.5 w-3.5" />
                  Configurar
                </Link>

                {/* Stats */}
                <Link
                  to={`/automation/intents/stats`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ChartBarIcon className="h-3.5 w-3.5" />
                  Stats
                </Link>

                {/* API Key */}
                <button
                  onClick={() => handleRegenerateApiKey(profile.id)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 text-xs font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
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
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {(page - 1) * 20 + 1}–{Math.min(page * 20, totalCount)} de {totalCount}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * 20 >= totalCount}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyProfilesPage;
