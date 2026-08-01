/**
 * Resumo executivo da Visão Geral: herói de faturamento (com o "hoje" junto)
 * + strip densa de KPIs secundários, todos comparados com o período anterior
 * de mesma duração. Substitui a antiga parede de 12 cards iguais.
 */
import React from 'react';
import { format, parseISO } from 'date-fns';
import { Card } from '../../../components/ui';
import type { DateRange } from '../../../services/reports';
import { useAnalyticsReport, useDashboardStats } from '../../../hooks/queries/useReports';
import { SectionCard, DeltaPill, Spinner, formatBRL } from './shared';

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

const fmtShort = (v: string) => { try { return format(parseISO(v), 'dd/MM'); } catch { return v; } };

const MiniStat: React.FC<{
  label: string;
  value: React.ReactNode;
  delta?: number | null;
  invertDelta?: boolean;
  sub?: string;
  alert?: boolean;
}> = ({ label, value, delta, invertDelta, sub, alert }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted-token truncate">{label}</p>
    <div className="flex items-baseline gap-2 mt-0.5">
      <span className={`text-xl font-bold tabular-nums ${alert ? 'text-red-500' : 'text-fg-token'}`}>{value}</span>
      {delta !== undefined && <DeltaPill pct={delta} invert={invertDelta} />}
    </div>
    {sub && <p className="text-[11px] text-fg-muted-token truncate">{sub}</p>}
  </div>
);

export const OverviewSummarySection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const q = useAnalyticsReport<OverviewReport>('overview', range, enabled);
  const stats = useDashboardStats(enabled);
  const d = q.data;
  const cur = d?.current;
  const prev = d?.previous;
  const today = stats.data?.today;
  const alerts = stats.data?.alerts;

  return (
    <SectionCard
      title="Resumo do período"
      subtitle={
        d
          ? `${fmtShort(d.period.start)} a ${fmtShort(d.period.end)} · comparado com ${fmtShort(d.period.prev_start)} a ${fmtShort(d.period.prev_end)}`
          : undefined
      }
      loading={q.isLoading}
    >
      <div className="grid grid-cols-[minmax(240px,1fr)_2fr] max-lg:grid-cols-1 gap-6">
        {/* Herói: faturamento do período + pulso de hoje */}
        <Card className="p-5 bg-surface-2/50 border-brand/30">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted-token">Faturamento</p>
          <div className="flex items-baseline gap-3 mt-1 flex-wrap">
            <span className="text-4xl font-bold tabular-nums text-brand">{formatBRL(cur?.revenue ?? 0)}</span>
            <DeltaPill pct={d?.delta.revenue_pct} />
          </div>
          <p className="text-xs text-fg-muted-token mt-1">período anterior: {formatBRL(prev?.revenue ?? 0)}</p>
          {stats.isLoading ? (
            <Spinner />
          ) : (
            <div className="mt-4 pt-3 border-t border-border-token/60 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="text-fg-token">
                Hoje: <strong className="tabular-nums">{formatBRL(today?.revenue ?? 0)}</strong> · {today?.orders ?? 0} pedidos
              </span>
              {(alerts?.pending_orders ?? 0) > 0 && (
                <span className="text-amber-500 font-semibold">{alerts?.pending_orders} aguardando ação</span>
              )}
              {(alerts?.low_stock_products ?? 0) > 0 && (
                <span className="text-amber-500 font-semibold">{alerts?.low_stock_products} p/ repor estoque</span>
              )}
            </div>
          )}
        </Card>

        {/* Strip densa de secundários */}
        <div className="grid grid-cols-3 max-sm:grid-cols-2 gap-x-6 gap-y-4 content-center">
          <MiniStat label="Pedidos pagos" value={cur?.orders ?? 0} delta={d?.delta.orders_pct} />
          <MiniStat label="Ticket médio" value={formatBRL(cur?.avg_ticket ?? 0)} delta={d?.delta.avg_ticket_pct} />
          <MiniStat label="Clientes novos" value={cur?.new_customers ?? 0} delta={d?.delta.new_customers_pct} />
          <MiniStat
            label="Cancelamento"
            value={`${cur?.cancel_rate ?? 0}%`}
            sub={`antes: ${prev?.cancel_rate ?? 0}%`}
            alert={(cur?.cancel_rate ?? 0) > (prev?.cancel_rate ?? 0)}
          />
          <MiniStat
            label="Nota média"
            value={cur?.avg_rating != null ? `${cur.avg_rating.toFixed(1)} ★` : '—'}
            sub={cur?.reviews ? `${cur.reviews} avaliações` : 'sem avaliações'}
          />
          <MiniStat
            label="Bot"
            value={`${cur?.bot_conversion ?? 0}%`}
            sub={`${cur?.bot_sessions ?? 0} sessões → pedido`}
          />
        </div>
      </div>
    </SectionCard>
  );
};

export default OverviewSummarySection;
