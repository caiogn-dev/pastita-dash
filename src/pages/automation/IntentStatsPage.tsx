import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowPathIcon,
  ChartBarIcon,
  BoltIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { intentService, intentTypeLabels } from '../../services';
import type { IntentStats, IntentType } from '../../types';

const methodLabels: Record<string, string> = {
  regex: 'Regex/Handler',
  llm: 'LLM / IA',
  none: 'Nenhum',
  handler: 'Handler',
  automessage: 'AutoMessage',
  fallback: 'Fallback',
};

export const IntentStatsPage: React.FC = () => {
  const [stats, setStats] = useState<IntentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    loadStats();
  }, [days]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const data = await intentService.getStats({ start_date: startDate, end_date: endDate });
      setStats(data);
    } catch (err) {
      setError('Erro ao carregar estatísticas de intenções');
    } finally {
      setLoading(false);
    }
  };

  const totalIntents = stats?.total_detected || 0;
  const uniqueIntents = stats?.top_intents?.length || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <ChartBarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Estatísticas de Intenções
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
              Análise de detecção de intenções nas mensagens
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value={1}>Últimas 24h</option>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
          </select>

          <button
            onClick={loadStats}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && stats && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <BoltIcon className="w-4 h-4 text-indigo-500" />
                <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium uppercase tracking-wide">Total</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalIntents.toLocaleString()}</div>
              <div className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">Intenções detectadas</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <SparklesIcon className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium uppercase tracking-wide">Únicas</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{uniqueIntents}</div>
              <div className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">Tipos distintos</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium uppercase tracking-wide">Regex / Padrão</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">{(stats.by_method?.regex || 0).toLocaleString()}</div>
              <div className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">Detecções por padrão</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium uppercase tracking-wide">IA / LLM</span>
              </div>
              <div className="text-3xl font-bold text-purple-600">{(stats.by_method?.llm || 0).toLocaleString()}</div>
              <div className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">Detecções por IA</div>
            </div>
          </div>

          {/* Top Intents Table */}
          {stats.top_intents && stats.top_intents.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Top Intenções</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
                  {format(subDays(new Date(), days), 'dd/MM/yyyy', { locale: ptBR })} — {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-zinc-800/50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Intenção</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Quantidade</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Percentual</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Distribuição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                    {stats.top_intents.map((item, idx) => {
                      const pct = totalIntents > 0 ? (item.count / totalIntents) * 100 : 0;
                      return (
                        <tr key={item.intent} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-zinc-400">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {intentTypeLabels[item.intent as IntentType] || item.intent}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.count.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              pct >= 30 ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' :
                              pct >= 10 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                              'bg-gray-100 text-gray-800 dark:bg-zinc-700 dark:text-zinc-300'
                            }`}>
                              {pct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2 max-w-[200px]">
                              <div
                                className="bg-indigo-500 h-2 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {(!stats.top_intents || stats.top_intents.length === 0) && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-12 text-center">
              <ChartBarIcon className="w-12 h-12 text-gray-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-zinc-400">Nenhum dado disponível para o período selecionado</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default IntentStatsPage;
