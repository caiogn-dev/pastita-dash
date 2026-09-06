import React, { useState, useEffect } from 'react';
import logger from '../../services/logger';
import {
  DocumentTextIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  automationLogService,
  companyProfileService,
} from '../../services/automation';
import { AutomationLog, CompanyProfile, AutomationLogStats } from '../../types';
import { toast } from 'react-hot-toast';
import { PageShell, Tabela } from '../../components/ui';

const actionTypeLabels: Record<string, string> = {
  message_received: 'Mensagem Recebida',
  message_sent: 'Mensagem Enviada',
  webhook_received: 'Webhook Recebido',
  session_created: 'Sessão Criada',
  session_updated: 'Sessão Atualizada',
  notification_sent: 'Notificação Enviada',
  error: 'Erro',
};

const actionTypeColors: Record<string, string> = {
  message_received: 'bg-blue-100 text-blue-800',
  message_sent: 'bg-green-100 text-green-800',
  webhook_received: 'bg-purple-100 text-purple-800',
  session_created: 'bg-indigo-100 text-indigo-800',
  session_updated: 'bg-yellow-100 text-yellow-800',
  notification_sent: 'bg-cyan-100 text-cyan-800',
  error: 'bg-red-100 text-red-800',
};

const POR_PAGINA = 50;

const AutomationLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [stats, setStats] = useState<AutomationLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AutomationLog | null>(null);
  const [showStats, setShowStats] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    company_id: '',
    action_type: '',
    is_error: '',
    phone_number: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [page, filters]);

  const loadCompanies = async () => {
    try {
      const response = await companyProfileService.list({ page_size: 100 });
      setCompanies(response.results);
    } catch (error) {
      logger.error('Error loading companies:', error);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: POR_PAGINA,
        ...(filters.company_id && { company_id: filters.company_id }),
        ...(filters.action_type && { action_type: filters.action_type }),
        ...(filters.is_error && { is_error: filters.is_error === 'true' }),
        ...(filters.phone_number && { phone_number: filters.phone_number }),
      };

      const response = await automationLogService.list(params);
      setLogs(response.results);
      setTotalCount(response.count);
    } catch (error) {
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await automationLogService.getStats(
        filters.company_id ? { company_id: filters.company_id } : undefined
      );
      setStats(statsData);
      setShowStats(true);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <PageShell
      titulo="Logs de automação"
      acoes={
        <div className="flex space-x-2">
        <button
        onClick={loadStats}
        className="inline-flex items-center px-4 py-2 border border-border-token rounded-md shadow-sm text-sm font-medium text-fg-token dark:text-[var(--dark-text-secondary,#a1a1aa)] bg-surface hover:bg-surface-2 dark:hover:bg-[var(--dark-bg-hover,#161616)] dark:bg-[var(--dark-bg-card,#1a1a1a)]"
        >
        <ChartBarIcon className="h-5 w-5 mr-2" />
        Estatísticas
        </button>
        <button
        onClick={() => setShowFilters(!showFilters)}
        className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
        showFilters
        ? 'border-green-500 text-green-700 bg-green-50'
        : 'border-border-token text-fg-token dark:text-[var(--dark-text-secondary,#a1a1aa)] bg-surface hover:bg-surface-2 dark:hover:bg-[var(--dark-bg-hover,#161616)]'
        }`}
        >
        <FunnelIcon className="h-5 w-5 mr-2" />
        Filtros
        </button>
        <button
        type="button"
        aria-label="Atualizar logs"
        onClick={loadLogs}
        className="inline-flex items-center px-4 py-2 border border-border-token rounded-md shadow-sm text-sm font-medium text-fg-token dark:text-[var(--dark-text-secondary,#a1a1aa)] bg-surface hover:bg-surface-2 dark:hover:bg-[var(--dark-bg-hover,#161616)] dark:bg-[var(--dark-bg-card,#1a1a1a)]"
        >
        <ArrowPathIcon className="h-5 w-5" />
        </button>
        </div>
      }
    >

      {/* Filters */}
      {showFilters && (
        <div className="bg-surface shadow rounded-lg p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            <div>
              <label className="block text-sm font-medium text-fg-token dark:text-[var(--dark-text-secondary,#a1a1aa)]">Empresa</label>
              <select
                value={filters.company_id}
                onChange={(e) => {
                  setFilters({ ...filters, company_id: e.target.value });
                  setPage(1);
                }}
                className="mt-1 block w-full rounded-md border-border-token shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                <option value="">Todas</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-token dark:text-[var(--dark-text-secondary,#a1a1aa)]">Tipo de Ação</label>
              <select
                value={filters.action_type}
                onChange={(e) => {
                  setFilters({ ...filters, action_type: e.target.value });
                  setPage(1);
                }}
                className="mt-1 block w-full rounded-md border-border-token shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                <option value="">Todos</option>
                {Object.entries(actionTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-token">Status</label>
              <select
                value={filters.is_error}
                onChange={(e) => {
                  setFilters({ ...filters, is_error: e.target.value });
                  setPage(1);
                }}
                className="mt-1 block w-full rounded-md border-border-token shadow-sm focus:border-green-500 focus:ring-green-500"
              >
                <option value="">Todos</option>
                <option value="false">Sucesso</option>
                <option value="true">Erro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-token">Telefone</label>
              <input
                type="text"
                value={filters.phone_number}
                onChange={(e) => {
                  setFilters({ ...filters, phone_number: e.target.value });
                  setPage(1);
                }}
                placeholder="Buscar por telefone"
                className="mt-1 block w-full rounded-md border-border-token shadow-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ company_id: '', action_type: '', is_error: '', phone_number: '' });
                  setPage(1);
                }}
                className="px-4 py-2 text-sm text-fg-muted-token hover:text-fg-token"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>
      )}

      <Tabela<AutomationLog>
        itens={logs}
        chave={(x) => x.id}
        rotuloDaLinha={(x) => `Abrir registro de ${formatDate(x.created_at)}`}
        onAbrir={setSelectedLog}
        carregando={loading}
        vazio={{
          titulo: 'Nenhum registro',
          descricao: 'Os registros aparecem aqui conforme o robô trabalha.',
          icone: <DocumentTextIcon className="h-12 w-12" />,
        }}
        paginacao={{
          pagina: page,
          porPagina: POR_PAGINA,
          total: totalCount,
          onPagina: setPage,
          rotulo: 'registros',
        }}
        colunas={[
          { chave: 'quando', cabecalho: 'Data/hora', render: (x) => formatDate(x.created_at) },
          { chave: 'empresa', cabecalho: 'Empresa', soNoDesktop: true, render: (x) => x.company_name },
          {
            chave: 'acao',
            cabecalho: 'Ação',
            render: (x) => (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  actionTypeColors[x.action_type || ''] || 'bg-surface-2 text-fg-token'
                }`}
              >
                {actionTypeLabels[x.action_type || ''] || x.action_type || '—'}
              </span>
            ),
          },
          { chave: 'telefone', cabecalho: 'Telefone', render: (x) => x.phone_number || '—' },
          {
            chave: 'descricao',
            cabecalho: 'Descrição',
            soNoDesktop: true,
            render: (x) => <span className="block max-w-xs truncate">{x.description}</span>,
          },
          {
            chave: 'status',
            cabecalho: 'Status',
            render: (x) =>
              x.is_error ? (
                <ExclamationTriangleIcon className="h-5 w-5 text-[var(--danger)]" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 text-[var(--success)]" />
              ),
          },
        ]}
      />

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-black/75" onClick={() => setSelectedLog(null)} />
            <div className="relative bg-surface dark:bg-zinc-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-border-token dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-fg-token">
                    Detalhes do Log
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    actionTypeColors[selectedLog.action_type || ''] || 'bg-surface-2 text-fg-token'
                  }`}>
                    {actionTypeLabels[selectedLog.action_type || ''] || selectedLog.action_type || '-'}
                  </span>
                </div>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-fg-muted-token">Data/Hora</label>
                    <p className="mt-1 text-sm text-fg-token">{formatDate(selectedLog.created_at)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fg-muted-token">Empresa</label>
                    <p className="mt-1 text-sm text-fg-token">{selectedLog.company_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fg-muted-token">Telefone</label>
                    <p className="mt-1 text-sm text-fg-token">{selectedLog.phone_number || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-fg-muted-token">Tipo de Evento</label>
                    <p className="mt-1 text-sm text-fg-token">{selectedLog.event_type || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-muted-token">Descrição</label>
                  <p className="mt-1 text-sm text-fg-token">{selectedLog.description}</p>
                </div>

                {selectedLog.is_error && selectedLog.error_message && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-red-800">Mensagem de Erro</label>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">{selectedLog.error_message}</p>
                  </div>
                )}

                {selectedLog.request_data && Object.keys(selectedLog.request_data || {}).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-fg-muted-token mb-2">Dados da Requisição</label>
                    <pre className="bg-surface-2 dark:bg-black rounded-lg p-4 text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.request_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.response_data && Object.keys(selectedLog.response_data || {}).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-fg-muted-token mb-2">Dados da Resposta</label>
                    <pre className="bg-surface-2 dark:bg-black rounded-lg p-4 text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.response_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-border-token dark:border-zinc-800 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 border border-border-token dark:border-zinc-700 rounded-md shadow-sm text-sm font-medium text-fg-token bg-surface dark:bg-zinc-900 hover:bg-surface-2 dark:hover:bg-zinc-700 dark:bg-black"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && stats && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-black/75" onClick={() => setShowStats(false)} />
            <div className="relative bg-surface dark:bg-zinc-900 rounded-lg shadow-xl max-w-lg w-full">
              <div className="px-6 py-4 border-b border-border-token dark:border-zinc-800">
                <h3 className="text-lg font-medium text-fg-token">
                  Estatísticas de Automação
                </h3>
              </div>
              <div className="px-6 py-4 space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-2 dark:bg-black rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-fg-token">{stats.total}</p>
                    <p className="text-sm text-fg-muted-token">Total de Logs</p>
                  </div>
                  <div className="bg-surface-2 dark:bg-black rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-fg-token">{stats.today}</p>
                    <p className="text-sm text-fg-muted-token">Hoje</p>
                  </div>
                  <div className="bg-surface-2 dark:bg-black rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-fg-token">{stats.this_week}</p>
                    <p className="text-sm text-fg-muted-token">Esta Semana</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.error_rate}%</p>
                    <p className="text-sm text-fg-muted-token">Taxa de Erro</p>
                  </div>
                </div>

                {/* By Action Type */}
                <div>
                  <h4 className="text-sm font-medium text-fg-token mb-3">Por Tipo de Ação</h4>
                  <div className="space-y-2">
                    {stats.by_action_type?.map((item) => (
                      <div key={item.action_type} className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          actionTypeColors[item.action_type] || 'bg-surface-2 text-fg-token'
                        }`}>
                          {actionTypeLabels[item.action_type] || item.action_type}
                        </span>
                        <span className="text-sm font-medium text-fg-token">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Day */}
                <div>
                  <h4 className="text-sm font-medium text-fg-token mb-3">Últimos 7 Dias</h4>
                  <div className="space-y-2">
                    {stats.by_day?.map((item) => (
                      <div key={item.date} className="flex items-center justify-between">
                        <span className="text-sm text-fg-muted-token">{item.date}</span>
                        <div className="flex items-center">
                          <div
                            className="h-2 bg-green-500 rounded"
                            style={{ width: `${Math.max(4, (item.count / Math.max(...(stats.by_day?.map(d => d.count) || [1]))) * 100)}px` }}
                          />
                          <span className="ml-2 text-sm font-medium text-fg-token">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border-token dark:border-zinc-800 flex justify-end">
                <button
                  onClick={() => setShowStats(false)}
                  className="px-4 py-2 border border-border-token dark:border-zinc-700 rounded-md shadow-sm text-sm font-medium text-fg-token bg-surface dark:bg-zinc-900 hover:bg-surface-2 dark:hover:bg-zinc-700 dark:bg-black"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default AutomationLogsPage;
