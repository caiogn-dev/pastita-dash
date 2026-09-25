/**
 * O que o cliente pede — intenções que o robô reconheceu nas mensagens.
 *
 * PageShell → quatro números (KpiGrid) → Secao com o ranking. Os cartões eram
 * montados à mão, com índigo e roxo crus nos ícones e rótulos em caixa alta;
 * a falha de carga era um banner vermelho do Tailwind.
 */
import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChartBarIcon, BoltIcon, SparklesIcon, CpuChipIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { intentService, intentTypeLabels } from '../../services';
import type { IntentStats, IntentType } from '../../types';
import { EmptyState, FalhaAoCarregar, KpiGrid, PageShell, RankedList, Secao } from '../../components/ui';
import { Loading } from '../../components/common';
import { formatNumber, formatPercent } from '../../utils/formatters';

export const IntentStatsPage: React.FC = () => {
  const [stats, setStats] = useState<IntentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days] = useState(7);

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setError('Não foi possível carregar o que os clientes pedem');
    } finally {
      setLoading(false);
    }
  };

  const totalIntents = stats?.total_detected || 0;
  const uniqueIntents = stats?.top_intents?.length || 0;
  const periodo = `${format(subDays(new Date(), days), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`;

  return (
    <PageShell
      titulo="O que o cliente pede"
      descricao={`O que o robô entendeu nas mensagens dos últimos ${days} dias.`}
    >
      {error && <FalhaAoCarregar titulo={error} onTentarDeNovo={() => void loadStats()} />}

      {loading && (
        <div className="flex h-48 items-center justify-center">
          <Loading size="md" />
        </div>
      )}

      {!loading && stats && (
        <>
          <KpiGrid
            itens={[
              {
                label: 'Pedidos entendidos',
                value: formatNumber(totalIntents),
                definicao: 'Mensagens em que o robô reconheceu o que o cliente queria.',
                icone: <BoltIcon />,
              },
              {
                label: 'Tipos distintos',
                value: formatNumber(uniqueIntents),
                definicao: 'Quantos assuntos diferentes apareceram no período.',
                icone: <SparklesIcon />,
              },
              {
                label: 'Por padrão',
                value: formatNumber(stats.by_method?.regex || 0),
                definicao: 'Reconhecidas por regra fixa, sem custo de IA.',
                icone: <CodeBracketIcon />,
              },
              {
                label: 'Por IA',
                value: formatNumber(stats.by_method?.llm || 0),
                definicao: 'Reconhecidas pelo modelo de linguagem.',
                icone: <CpuChipIcon />,
              },
            ]}
          />

          {stats.top_intents && stats.top_intents.length > 0 ? (
            <Secao titulo="O que os clientes mais pedem" descricao={periodo}>
              {/* Ranking com barra — o mesmo dos mais vendidos e dos bairros. */}
              <RankedList
                items={stats.top_intents.map((item) => {
                  const intent = (item.intent_type || item.intent) as IntentType;
                  const pct = totalIntents > 0 ? (item.count / totalIntents) * 100 : 0;
                  return {
                    label: intentTypeLabels[intent] || intent,
                    value: item.count,
                    valueLabel: formatNumber(item.count),
                    sub: `${formatPercent(pct, 1)} das mensagens`,
                  };
                })}
              />
            </Secao>
          ) : (
            <div className="superficie">
              <EmptyState
                icone={<ChartBarIcon className="h-12 w-12" />}
                titulo="Nenhum pedido reconhecido no período"
                descricao="Quando os clientes mandarem mensagens, o que eles pedem aparece aqui."
              />
            </div>
          )}
        </>
      )}
    </PageShell>
  );
};

export default IntentStatsPage;
