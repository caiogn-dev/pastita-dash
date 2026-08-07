/**
 * KpiGrid — a faixa de indicadores de uma página.
 *
 * Duas decisões que o componente IMPÕE, porque deixá-las opcionais foi o que
 * criou o problema:
 *
 * 1. `definicao` é obrigatória. "Faturamento R$ 1.557,04" não diz se inclui
 *    frete, se conta pedido cancelado, ou se o dia é o do pagamento ou o do
 *    pedido. Quem lê preenche a lacuna com um palpite — e reclama do número
 *    quando o palpite não bate. Já custou auditoria de backend por engano.
 *
 * 2. A definição é IMPRESSA no card, não escondida em tooltip. Tooltip não
 *    existe no celular, e é no celular que o dono olha o painel.
 *
 * O número de colunas vive aqui e em nenhum outro lugar: quatro no desktop
 * (a linha que cabe sem apertar), duas no tablet, uma no celular.
 */
import React from 'react';

import { cn } from '../../utils/cn';
import { StatCard, StatCardComparativo, StatCardTone } from './StatCard';

export interface KpiItem {
  label: string;
  value: React.ReactNode;
  /** O que este número significa e o que ele inclui. Sempre visível. */
  definicao: string;
  comparativo?: StatCardComparativo;
  tone?: StatCardTone;
  onClick?: () => void;
}

export interface KpiGridProps {
  itens: KpiItem[];
  /** Rótulo de seção acima do grid (ex.: "Indicadores do período"). */
  titulo?: string;
  className?: string;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ itens, titulo, className }) => {
  if (!itens.length) return null;

  return (
    <section className={cn('flex flex-col gap-2', className)} aria-label={titulo}>
      {titulo && <h2 className="overline">{titulo}</h2>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {itens.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            sub={kpi.definicao}
            tone={kpi.tone}
            comparativo={kpi.comparativo}
            onClick={kpi.onClick}
          />
        ))}
      </div>
    </section>
  );
};

KpiGrid.displayName = 'KpiGrid';

export default KpiGrid;
