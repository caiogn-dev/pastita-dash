/**
 * Resumo executivo da Visão Geral: KPIs do período selecionado comparados
 * com o período anterior de mesma duração (endpoint reports/overview/).
 * É o que amarra as abas: cada KPI vem de um relatório detalhado.
 */
import React from 'react';
import { format, parseISO } from 'date-fns';
import { StatCard } from '../../../components/ui';
import type { DateRange } from '../../../services/reports';
import { useAnalyticsReport } from '../../../hooks/queries/useReports';
import { SectionCard, formatBRL } from './shared';

interface OverviewReport {
  current: {
    orders: number; revenue: number; avg_ticket: number; cancel_rate: number;
    new_customers: number; avg_rating: number | null; reviews: number;
    bot_sessions: number; bot_conversion: number;
  };
  previous: OverviewReport['current'];
  delta: {
    revenue_pct: number | null; orders_pct: number | null;
    avg_ticket_pct: number | null; new_customers_pct: number | null;
  };
  period: { start: string; end: string; prev_start: string; prev_end: string };
}

const deltaSub = (pct: number | null | undefined, prevLabel: string) => {
  if (pct == null) return `período anterior: ${prevLabel}`;
  const arrow = pct >= 0 ? '▲' : '▼';
  return `${arrow} ${Math.abs(pct).toFixed(1)}% vs período anterior (${prevLabel})`;
};

const fmtShort = (v: string) => { try { return format(parseISO(v), 'dd/MM'); } catch { return v; } };

export const OverviewSummarySection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const q = useAnalyticsReport<OverviewReport>('overview', range, enabled);
  const d = q.data;
  const cur = d?.current;
  const prev = d?.previous;

  return (
    <SectionCard
      title="Resumo do período"
      subtitle={
        d
          ? `${fmtShort(d.period.start)} a ${fmtShort(d.period.end)} comparado com ${fmtShort(d.period.prev_start)} a ${fmtShort(d.period.prev_end)}`
          : undefined
      }
      loading={q.isLoading}
    >
      <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
        <StatCard
          label="Faturamento"
          value={formatBRL(cur?.revenue ?? 0)}
          sub={deltaSub(d?.delta.revenue_pct, formatBRL(prev?.revenue ?? 0))}
          tone={d?.delta.revenue_pct != null && d.delta.revenue_pct < 0 ? 'warning' : 'brand'}
        />
        <StatCard
          label="Pedidos pagos"
          value={cur?.orders ?? 0}
          sub={deltaSub(d?.delta.orders_pct, String(prev?.orders ?? 0))}
        />
        <StatCard
          label="Ticket médio"
          value={formatBRL(cur?.avg_ticket ?? 0)}
          sub={deltaSub(d?.delta.avg_ticket_pct, formatBRL(prev?.avg_ticket ?? 0))}
        />
        <StatCard
          label="Clientes novos"
          value={cur?.new_customers ?? 0}
          sub={deltaSub(d?.delta.new_customers_pct, String(prev?.new_customers ?? 0))}
        />
        <StatCard
          label="Cancelamento"
          value={`${cur?.cancel_rate ?? 0}%`}
          sub={`antes: ${prev?.cancel_rate ?? 0}% · detalhe na aba Operação`}
          tone={(cur?.cancel_rate ?? 0) > (prev?.cancel_rate ?? 0) ? 'warning' : 'default'}
        />
        <StatCard
          label="Nota média"
          value={cur?.avg_rating != null ? `${cur.avg_rating.toFixed(1)} ★` : '—'}
          sub={cur?.reviews ? `${cur.reviews} avaliações no período` : 'sem avaliações no período'}
        />
        <StatCard
          label="Sessões do bot"
          value={cur?.bot_sessions ?? 0}
          sub="detalhe na aba Bot & Avaliações"
        />
        <StatCard
          label="Conversão do bot"
          value={`${cur?.bot_conversion ?? 0}%`}
          sub="conversas que viraram pedido"
        />
      </div>
    </SectionCard>
  );
};

export default OverviewSummarySection;
