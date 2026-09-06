import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChartBarIcon,
  BoltIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { intentService, intentTypeLabels } from '../../services';
import type { IntentStats, IntentType } from '../../types';
import { PageShell, RankedList } from '../../components/ui';


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
    <PageShell
      titulo="O que o cliente pede"
    >

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
            <div className="bg-surface dark:bg-zinc-900 rounded-xl border border-border-token dark:border-zinc-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <BoltIcon className="w-4 h-4 text-indigo-500" />
                <span className="text-xs text-fg-muted-token font-medium uppercase tracking-wide">Total</span>
              </div>
              <div className="text-3xl font-bold text-fg-token">{totalIntents.toLocaleString()}</div>
              <div className="text-sm text-fg-muted-token mt-0.5">Pedidos que o robô entendeu</div>
            </div>

            <div className="bg-surface dark:bg-zinc-900 rounded-xl border border-border-token dark:border-zinc-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <SparklesIcon className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-fg-muted-token font-medium uppercase tracking-wide">Únicas</span>
              </div>
              <div className="text-3xl font-bold text-fg-token">{uniqueIntents}</div>
              <div className="text-sm text-fg-muted-token mt-0.5">Tipos distintos</div>
            </div>

            <div className="bg-surface dark:bg-zinc-900 rounded-xl border border-border-token dark:border-zinc-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-fg-muted-token font-medium uppercase tracking-wide">Regex / Padrão</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">{(stats.by_method?.regex || 0).toLocaleString()}</div>
              <div className="text-sm text-fg-muted-token mt-0.5">Detecções por padrão</div>
            </div>

            <div className="bg-surface dark:bg-zinc-900 rounded-xl border border-border-token dark:border-zinc-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-fg-muted-token font-medium uppercase tracking-wide">IA / LLM</span>
              </div>
              <div className="text-3xl font-bold text-purple-600">{(stats.by_method?.llm || 0).toLocaleString()}</div>
              <div className="text-sm text-fg-muted-token mt-0.5">Detecções por IA</div>
            </div>
          </div>

          {/* Top Intents Table */}
          {stats.top_intents && stats.top_intents.length > 0 && (
            <div className="bg-surface dark:bg-zinc-900 rounded-xl border border-border-token dark:border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-border-token dark:border-zinc-800">
                <h2 className="text-base font-semibold text-fg-token">O que os clientes mais pedem</h2>
                <p className="text-sm text-fg-muted-token mt-0.5">
                  {format(subDays(new Date(), days), 'dd/MM/yyyy', { locale: ptBR })} — {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
              {/* Isto nunca foi uma tabela: é um ranking com barra, e o
                  painel já tem um — o mesmo que desenha os mais vendidos e os
                  bairros que mais compram. A versão à mão aqui pintava
                  `indigo-500` cru, uma cor que não existe em nenhuma outra
                  tela. */}
              <RankedList
                items={stats.top_intents.map((item) => {
                  const intent = (item.intent_type || item.intent) as IntentType;
                  const pct = totalIntents > 0 ? (item.count / totalIntents) * 100 : 0;
                  return {
                    label: intentTypeLabels[intent] || intent,
                    value: item.count,
                    valueLabel: item.count.toLocaleString('pt-BR'),
                    sub: `${pct.toFixed(1)}% das mensagens`,
                  };
                })}
              />
            </div>
          )}

          {/* Empty state */}
          {(!stats.top_intents || stats.top_intents.length === 0) && (
            <div className="bg-surface dark:bg-zinc-900 rounded-xl border border-border-token dark:border-zinc-800 p-12 text-center">
              <ChartBarIcon className="w-12 h-12 text-gray-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-fg-muted-token">Nenhum dado disponível para o período selecionado</p>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
};

export default IntentStatsPage;
