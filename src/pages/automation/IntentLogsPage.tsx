import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DocumentChartBarIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { intentService, intentTypeLabels } from '../../services';
import type { IntentLog, IntentType } from '../../types';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 30;

const methodColors: Record<string, string> = {
  llm: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  regex: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  handler: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  automessage: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  fallback: 'bg-gray-100 text-gray-800 dark:bg-zinc-700 dark:text-zinc-300',
};

const IntentLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<IntentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<IntentLog | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [intentFilter, setIntentFilter] = useState<IntentType | ''>('');
  const [methodFilter, setMethodFilter] = useState<'regex' | 'llm' | ''>('');
  const [stats, setStats] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await intentService.getLogs({
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        intent_type: intentFilter || undefined,
        method: methodFilter || undefined,
      });
      setLogs((response as any).results || response);
      setTotalCount((response as any).count || (Array.isArray(response) ? response.length : 0));
    } catch (error) {
      toast.error('Erro ao carregar logs de intenções');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await intentService.getStats();
      setStats(statsData);
    } catch {}
  };

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [currentPage, intentFilter, methodFilter]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadLogs();
      loadStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, currentPage, intentFilter, methodFilter]);

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.message_text?.toLowerCase().includes(search) ||
      log.phone_number?.includes(search)
    );
  });

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getAllIntentTypes = (): string[] => {
    return Object.keys(intentTypeLabels).filter(key => typeof (intentTypeLabels as any)[key] === 'string');
  };

  const getConfidenceBg = (score?: number) => {
    if (!score) return 'bg-gray-200 dark:bg-zinc-700';
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <DocumentChartBarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Logs de Intenções</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">Histórico completo de detecção de intenções</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500"
            />
            Auto (5s)
          </label>
          <button
            onClick={() => { loadLogs(); loadStats(); }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total de Logs', value: totalCount.toLocaleString(), color: 'text-gray-900 dark:text-white' },
            { label: 'Taxa de Sucesso', value: `${stats.success_rate || 0}%`, color: 'text-green-600' },
            { label: 'Método Mais Usado', value: stats.most_common_method || '-', color: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Intenção Top', value: (intentTypeLabels as any)[stats.most_common_intent] || stats.most_common_intent || '-', color: 'text-purple-600 dark:text-purple-400' },
          ].map((card) => (
            <div key={card.label} className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4">
              <div className="text-xs text-gray-500 dark:text-zinc-400 font-medium uppercase tracking-wide mb-1">{card.label}</div>
              <div className={`text-lg font-bold truncate ${card.color}`}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por mensagem ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
              showFilters
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
            }`}
          >
            <FunnelIcon className="w-4 h-4" />
            Filtros
            {(intentFilter || methodFilter) && (
              <span className="ml-1 px-1.5 py-0.5 bg-indigo-500 text-white rounded-full text-xs">
                {[intentFilter, methodFilter].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-zinc-800">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                Intenção
              </label>
              <select
                value={intentFilter}
                onChange={(e) => { setIntentFilter(e.target.value as IntentType | ''); setCurrentPage(1); }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Todas intenções</option>
                {getAllIntentTypes().map((key) => (
                  <option key={key} value={key}>{(intentTypeLabels as any)[key] || key}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                Método de Detecção
              </label>
              <select
                value={methodFilter}
                onChange={(e) => { setMethodFilter(e.target.value as 'regex' | 'llm' | ''); setCurrentPage(1); }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Todos métodos</option>
                <option value="regex">Regex / Padrão</option>
                <option value="llm">IA / LLM</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-zinc-400">Carregando logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ExclamationTriangleIcon className="w-12 h-12 text-gray-300 dark:text-zinc-600" />
            <p className="text-gray-500 dark:text-zinc-400">Nenhum log encontrado com os filtros selecionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-800/50">
                  {['Data/Hora', 'Telefone', 'Mensagem', 'Intenção', 'Método', 'Confiança', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-gray-600 dark:text-zinc-400 font-mono">
                        {format(new Date(log.created_at), 'dd/MM HH:mm:ss', { locale: ptBR })}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <code className="text-xs bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 px-1.5 py-0.5 rounded">
                        {log.phone_number}
                      </code>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="text-sm text-gray-700 dark:text-zinc-300 line-clamp-1" title={log.message_text}>
                        {log.message_text?.substring(0, 60)}{log.message_text && log.message_text.length > 60 ? '…' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                        {(intentTypeLabels as any)[log.intent_type as IntentType] || log.intent_type || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${methodColors[log.method || ''] || 'bg-gray-100 text-gray-800 dark:bg-zinc-700 dark:text-zinc-300'}`}>
                        {log.method === 'llm' ? '🤖 IA' : log.method === 'regex' ? '🔍 Padrão' : log.method || '?'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getConfidenceBg(log.confidence)}`}
                            style={{ width: `${(log.confidence || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-zinc-400">
                          {log.confidence ? `${(log.confidence * 100).toFixed(0)}%` : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        title="Ver detalhes"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-zinc-400">
            {Math.min(filteredLogs.length, ITEMS_PER_PAGE)} de {totalCount} registros
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-sm text-gray-600 dark:text-zinc-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detalhes da Intenção</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Data/Hora</div>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {format(new Date(selectedLog.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Telefone</div>
                  <code className="text-sm bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 px-2 py-0.5 rounded">
                    {selectedLog.phone_number}
                  </code>
                </div>
              </div>

              {/* Detection */}
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Detecção</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-zinc-400">Intenção</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {(intentTypeLabels as any)[selectedLog.intent_type as IntentType] || selectedLog.intent_type || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-zinc-400">Método</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${methodColors[selectedLog.method || ''] || 'bg-gray-100 text-gray-800 dark:bg-zinc-700 dark:text-zinc-300'}`}>
                      {selectedLog.method === 'llm' ? '🤖 Inteligência Artificial' : selectedLog.method === 'regex' ? '🔍 Regex/Padrão' : selectedLog.method || '?'}
                    </span>
                  </div>
                  {selectedLog.confidence !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-zinc-400">Confiança</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getConfidenceBg(selectedLog.confidence)}`}
                            style={{ width: `${selectedLog.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {(selectedLog.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Message */}
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Mensagem do Usuário</div>
                <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 text-sm text-gray-800 dark:text-zinc-200 whitespace-pre-wrap">
                  {selectedLog.message_text || '—'}
                </div>
              </div>

              {/* Response */}
              {selectedLog.response_text && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Resposta Gerada</div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-sm text-gray-800 dark:text-zinc-200 whitespace-pre-wrap border border-green-200 dark:border-green-800">
                    {selectedLog.response_text}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntentLogsPage;
