/**
 * Relatórios › Operação › Equipe: ranking por entregador e por atendente.
 *
 * Era a página "Equipe e entregas", em Pedidos, com seletor de período próprio
 * e o cadastro de entregadores embaixo (26/10). Relatório mora em Relatórios e
 * obedece ao período do relatório; o cadastro foi para Configurações → Equipe.
 *
 * Entregador é atribuído no pedido; atendente é quem lançou o pedido no
 * painel. "Sem entregador" vem junto: ranking que ignora metade das entregas
 * premia quem foi anotado, não quem trabalhou.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, FalhaAoCarregar, Secao, Skeleton, Tabela } from '../../../components/ui';
import { useStore } from '../../../hooks/useStore';
import { operacaoService, type RankingDaOperacao } from '../../../services/operacao';
import type { DateRange } from '../../../services/reports';
import { formatCurrency } from '../../../utils/formatters';

const DIAS: Record<NonNullable<DateRange['period']>, number> = {
  hoje: 1, ontem: 2, '7d': 7, '30d': 30, mes: 30, '90d': 90, '1y': 365,
};

/** O ranking conta "últimos N dias"; o relatório fala em período. */
export function diasDoPeriodo(range: DateRange): number {
  if (range.start_date && range.end_date) {
    const ms = new Date(range.end_date).getTime() - new Date(range.start_date).getTime();
    return Math.max(1, Math.round(ms / 86_400_000) + 1);
  }
  return DIAS[range.period ?? '30d'] ?? 30;
}

export const EquipeSection: React.FC<{ range: DateRange }> = ({ range }) => {
  const { store } = useStore();
  const slug = (store as { slug?: string } | null)?.slug;
  const dias = diasDoPeriodo(range);
  const [ranking, setRanking] = useState<RankingDaOperacao | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!slug) return;
    let vivo = true;
    setFalhou(false);
    operacaoService.ranking(slug, dias)
      .then((r) => { if (vivo) setRanking(r); })
      .catch(() => { if (vivo) setFalhou(true); });
    return () => { vivo = false; };
  }, [slug, dias, tentativa]);

  if (falhou) {
    return <FalhaAoCarregar titulo="Não foi possível carregar o ranking da equipe" onTentarDeNovo={() => setTentativa((n) => n + 1)} />;
  }
  if (!ranking) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Secao titulo="Entregadores">
        {ranking.entregadores.length === 0 ? (
          <EmptyState titulo="Nenhuma entrega atribuída no período" />
        ) : (
          <Tabela
            itens={ranking.entregadores}
            chave={(e) => String(e.id)}
            rotuloDaLinha={(e) => e.nome}
            colunas={[
              { chave: 'nome', cabecalho: 'Entregador', render: (e) => <span className="font-medium">{e.nome}</span> },
              { chave: 'entregas', cabecalho: 'Entregas', alinhamento: 'direita', render: (e) => e.entregas },
              { chave: 'rua', cabecalho: 'Tempo de entrega', alinhamento: 'direita', render: (e) => (e.minutos_medios == null ? '—' : `${e.minutos_medios} min`) },
              { chave: 'frete', cabecalho: 'Frete', alinhamento: 'direita', render: (e) => formatCurrency(e.frete) },
            ]}
          />
        )}
        {ranking.sem_entregador > 0 && (
          <p className="mt-3 text-sm text-fg-muted-token">
            {ranking.sem_entregador} {ranking.sem_entregador === 1 ? 'entrega ficou' : 'entregas ficaram'} sem entregador no período.
          </p>
        )}
      </Secao>

      <Secao
        titulo="Atendentes"
        acoes={(
          <Link to="/colaboradores" className="text-sm font-medium text-fg-token underline-offset-2 hover:underline">
            Gerenciar equipe
          </Link>
        )}
      >
        {ranking.atendentes.length === 0 ? (
          <EmptyState titulo="Nenhum pedido lançado no painel no período" />
        ) : (
          <Tabela
            itens={ranking.atendentes}
            chave={(a) => String(a.id)}
            rotuloDaLinha={(a) => a.nome}
            colunas={[
              { chave: 'nome', cabecalho: 'Atendente', render: (a) => <span className="font-medium">{a.nome}</span> },
              { chave: 'pedidos', cabecalho: 'Pedidos', alinhamento: 'direita', render: (a) => a.pedidos },
              { chave: 'vendido', cabecalho: 'Vendido', alinhamento: 'direita', render: (a) => formatCurrency(a.faturado) },
            ]}
          />
        )}
      </Secao>
    </div>
  );
};

export default EquipeSection;
