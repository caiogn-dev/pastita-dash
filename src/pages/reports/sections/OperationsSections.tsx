/**
 * Operação: SLA por etapa do pedido, cancelamentos, agendados, histórico de
 * caixa e produtividade de staff (PDV).
 */
import React from 'react';
import { format, parseISO } from 'date-fns';
import { StatCard } from '../../../components/ui';
import { TimeSeriesChart } from '../../../components/reports/TimeSeriesChart';
import type {
  SlaReport, CancellationsReport, SchedulingReport, CashHistoryReport, StaffReport, DateRange,
} from '../../../services/reports';
import { useAnalyticsReport } from '../../../hooks/queries/useReports';
import { SectionCard, EmptyNote, MiniTable, RankedList, ExportCsvButton, formatBRL } from './shared';

const STAGE_LABELS: Record<string, string> = {
  confirmacao: 'Até confirmar',
  preparo: 'Preparo',
  entrega: 'Entrega',
  total: 'Total (criado→entregue)',
};

const fmtMin = (v: number | null) => (v == null ? '—' : v >= 90 ? `${(v / 60).toFixed(1)}h` : `${Math.round(v)}min`);
const fmtDate = (v: string) => { try { return format(parseISO(v), 'dd/MM'); } catch { return v; } };

export const OperationsSection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const sla = useAnalyticsReport<SlaReport>('sla', range, enabled);
  const cancel = useAnalyticsReport<CancellationsReport>('cancellations', range, enabled);
  const sched = useAnalyticsReport<SchedulingReport>('scheduling', range, enabled);
  const cash = useAnalyticsReport<CashHistoryReport>('cash-history', range, enabled);
  const staff = useAnalyticsReport<StaffReport>('staff', range, enabled);

  return (
    <div className="flex flex-col gap-6">
      {/* SLA por etapa */}
      <SectionCard title="Tempo por etapa" subtitle="Média e p90 dos pedidos do período" loading={sla.isLoading}>
        <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
          {(sla.data?.stages ?? []).map((s) => (
            <StatCard
              key={s.stage}
              label={STAGE_LABELS[s.stage] || s.stage}
              value={fmtMin(s.avg_minutes)}
              sub={s.count ? `p90 ${fmtMin(s.p90_minutes)} · ${s.count} pedidos` : 'sem dados'}
            />
          ))}
        </div>
      </SectionCard>

      {/* Cancelamentos */}
      <SectionCard
        title="Cancelamentos"
        subtitle={cancel.data ? `${cancel.data.summary.rate}% dos pedidos · ${formatBRL(cancel.data.summary.lost_value)} perdidos` : undefined}
        loading={cancel.isLoading}
      >
        {(cancel.data?.timeline?.length ?? 0) === 0 ? (
          <EmptyNote text="Nenhum cancelamento no período. 🎉" />
        ) : (
          /* Vermelho é semântico aqui — cancelamento é ruim — mas pelo token,
             não em hex: assim acompanha claro e escuro. */
          <TimeSeriesChart
            data={cancel.data?.timeline ?? []}
            xKey="date"
            yKey="cancelled"
            label="Cancelados"
            type="bar"
            color="var(--danger)"
            height={220}
            xTickFormat={fmtDate}
          />
        )}
      </SectionCard>

      <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
        {/* Agendados */}
        <SectionCard
          title="Pedidos agendados"
          subtitle={sched.data ? `${sched.data.total} agendados criados no período` : undefined}
          loading={sched.isLoading}
        >
          {(sched.data?.by_slot?.length ?? 0) === 0 ? (
            <EmptyNote text="Nenhum agendamento no período." />
          ) : (
            <RankedList
              medals={false}
              items={(sched.data?.by_slot ?? []).map((s) => ({
                label: s.slot === 'sem_horario' ? 'Sem horário' : s.slot,
                value: s.orders,
                valueLabel: `${s.orders} pedido${s.orders > 1 ? 's' : ''}`,
              }))}
            />
          )}
        </SectionCard>

        {/* Staff PDV */}
        <SectionCard title="Produtividade PDV" subtitle="Pedidos lançados por operador" loading={staff.isLoading}>
          {(staff.data?.staff?.length ?? 0) === 0 ? (
            <EmptyNote text="Nenhum pedido lançado pelo PDV no período." />
          ) : (
            <RankedList
              items={(staff.data?.staff ?? []).map((s) => ({
                label: s.name,
                sub: `${s.orders} pedido${s.orders > 1 ? 's' : ''} · ${formatBRL(s.manual_discounts)} em descontos manuais`,
                value: s.revenue,
                valueLabel: formatBRL(s.revenue),
              }))}
            />
          )}
        </SectionCard>
      </div>

      {/* Caixa */}
      <SectionCard
        title="Histórico de caixa"
        subtitle={cash.data ? `${cash.data.summary.count} fechamentos · quebra acumulada ${formatBRL(cash.data.summary.total_difference)}` : undefined}
        loading={cash.isLoading}
        action={
          <ExportCsvButton
            rows={cash.data?.sessions ?? []}
            columns={[
              { key: 'opened_at', label: 'Abertura' }, { key: 'closed_at', label: 'Fechamento' },
              { key: 'closed_by', label: 'Operador' }, { key: 'expected_amount', label: 'Esperado' },
              { key: 'counted_amount', label: 'Contado' }, { key: 'difference', label: 'Quebra' },
            ]}
            filename="caixas.csv"
          />
        }
      >
        {(cash.data?.sessions?.length ?? 0) === 0 ? (
          <EmptyNote text="Nenhum caixa fechado no período." />
        ) : (
          <MiniTable
            headers={[
              { label: 'Abertura' }, { label: 'Operador' },
              { label: 'Esperado', align: 'right' }, { label: 'Contado', align: 'right' }, { label: 'Quebra', align: 'right' },
            ]}
            rows={(cash.data?.sessions ?? []).map((s) => [
              fmtDate(s.opened_at),
              s.closed_by || s.opened_by || '—',
              s.expected_amount != null ? formatBRL(s.expected_amount) : '—',
              s.counted_amount != null ? formatBRL(s.counted_amount) : '—',
              <span key="d" className={s.difference != null && s.difference < 0 ? 'text-red-500 font-semibold' : ''}>
                {s.difference != null ? formatBRL(s.difference) : '—'}
              </span>,
            ])}
          />
        )}
      </SectionCard>
    </div>
  );
};

export default OperationsSection;
