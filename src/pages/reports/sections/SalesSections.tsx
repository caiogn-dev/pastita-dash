/**
 * Seções de vendas do BI: heatmap dia×hora (horários de pico), mix por canal
 * e curva ABC + cesta (produtos pedidos juntos).
 */
import React from 'react';
import { Badge } from '../../../components/ui';
import { RankBarList } from '../../../components/reports/RankBarList';
import type {
  HeatmapReport, ChannelsReport, AbcReport, BasketReport, DateRange,
} from '../../../services/reports';
import { useAnalyticsReport } from '../../../hooks/queries/useReports';
import { SectionCard, EmptyNote, MiniTable, ExportCsvButton, formatBRL, paymentLabel, deliveryLabel } from './shared';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const CHANNEL_LABELS: Record<string, string> = { web: 'Cardápio Web', bot: 'Bot WhatsApp', pdv: 'PDV/Balcão' };

export const HeatmapSection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const q = useAnalyticsReport<HeatmapReport>('heatmap', range, enabled);
  const cells = q.data?.cells ?? [];
  const peak = q.data?.peak ?? null;
  const byKey = new Map(cells.map((c) => [`${c.weekday}-${c.hour}`, c]));
  const maxOrders = Math.max(1, ...cells.map((c) => c.orders));
  // Só renderiza a faixa de horas com movimento (evita grade 24h quase vazia)
  const hours = cells.length
    ? Array.from(
        { length: Math.max(...cells.map((c) => c.hour)) - Math.min(...cells.map((c) => c.hour)) + 1 },
        (_, i) => Math.min(...cells.map((c) => c.hour)) + i,
      )
    : [];

  return (
    <SectionCard
      title="Horários de pico"
      subtitle={peak ? `Pico: ${WEEKDAYS[peak.weekday]} às ${peak.hour}h (${peak.orders} pedidos)` : undefined}
      loading={q.isLoading}
      action={
        <ExportCsvButton
          rows={cells.map((c) => ({ dia: WEEKDAYS[c.weekday], hora: `${c.hour}h`, pedidos: c.orders, receita: c.revenue }))}
          columns={[
            { key: 'dia', label: 'Dia' }, { key: 'hora', label: 'Hora' },
            { key: 'pedidos', label: 'Pedidos' }, { key: 'receita', label: 'Receita' },
          ]}
          filename="horarios_pico.csv"
        />
      }
    >
      {cells.length === 0 ? (
        <EmptyNote />
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-grid gap-1" style={{ gridTemplateColumns: `3rem repeat(${hours.length}, 2rem)` }}>
            <span />
            {hours.map((h) => (
              <span key={h} className="text-center text-[11px] text-fg-muted-token">{h}h</span>
            ))}
            {WEEKDAYS.map((label, wd) => (
              <React.Fragment key={label}>
                <span className="text-xs text-fg-muted-token self-center">{label}</span>
                {hours.map((h) => {
                  const cell = byKey.get(`${wd}-${h}`);
                  const intensity = cell ? Math.max(12, Math.round((cell.orders / maxOrders) * 100)) : 0;
                  return (
                    <span
                      key={h}
                      className="h-8 rounded border border-border-token/40"
                      title={cell ? `${label} ${h}h — ${cell.orders} pedidos · ${formatBRL(cell.revenue)}` : `${label} ${h}h — sem pedidos`}
                      style={cell ? { backgroundColor: `color-mix(in srgb, var(--brand) ${intensity}%, transparent)` } : undefined}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-[11px] text-fg-muted-token">
            <span>menos</span>
            {[15, 35, 60, 85, 100].map((p) => (
              <span
                key={p}
                className="h-3 w-6 rounded-sm border border-border-token/40"
                style={{ backgroundColor: `color-mix(in srgb, var(--brand) ${p}%, transparent)` }}
              />
            ))}
            <span>mais pedidos</span>
          </div>
        </div>
      )}
    </SectionCard>
  );
};

export const ChannelsSection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const q = useAnalyticsReport<ChannelsReport>('channels', range, enabled);
  const d = q.data;
  return (
    <div className="grid grid-cols-3 max-lg:grid-cols-1 gap-6">
      <SectionCard title="Por canal" subtitle="Bot × Cardápio × PDV" loading={q.isLoading}>
        <RankBarList
          items={(d?.by_source ?? []).map((r) => ({ label: CHANNEL_LABELS[r.channel] || r.channel, value: r.revenue }))}
          valueFormat={formatBRL}
        />
      </SectionCard>
      <SectionCard title="Por pagamento" loading={q.isLoading}>
        <RankBarList
          items={(d?.by_payment_method ?? []).map((r) => ({ label: paymentLabel(r.payment_method), value: Number(r.revenue) }))}
          valueFormat={formatBRL}
        />
      </SectionCard>
      <SectionCard title="Entrega × retirada" loading={q.isLoading}>
        <RankBarList
          items={(d?.by_delivery_method ?? []).map((r) => ({ label: deliveryLabel(r.delivery_method), value: Number(r.revenue) }))}
          valueFormat={formatBRL}
        />
      </SectionCard>
    </div>
  );
};

const ABC_TONE: Record<string, 'success' | 'warning' | 'neutral'> = { A: 'success', B: 'warning', C: 'neutral' };

export const AbcBasketSection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const abc = useAnalyticsReport<AbcReport>('abc', range, enabled);
  const basket = useAnalyticsReport<BasketReport>('basket', range, enabled);
  return (
    <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
      <SectionCard
        title="Curva ABC"
        subtitle={abc.data ? `${abc.data.summary.a_count} produtos (classe A) concentram 80% da receita` : undefined}
        loading={abc.isLoading}
        action={
          <ExportCsvButton
            rows={abc.data?.products ?? []}
            columns={[
              { key: 'product_name', label: 'Produto' }, { key: 'abc_class', label: 'Classe' },
              { key: 'quantity', label: 'Qtd' }, { key: 'revenue', label: 'Receita' },
              { key: 'revenue_pct', label: '% Receita' }, { key: 'cumulative_pct', label: '% Acumulado' },
            ]}
            filename="curva_abc.csv"
          />
        }
      >
        {(abc.data?.products?.length ?? 0) === 0 ? (
          <EmptyNote />
        ) : (
          <MiniTable
            headers={[
              { label: 'Produto' }, { label: 'Classe' },
              { label: 'Qtd', align: 'right' }, { label: 'Receita', align: 'right' }, { label: '% acum.', align: 'right' },
            ]}
            rows={(abc.data?.products ?? []).slice(0, 20).map((p) => [
              p.product_name,
              <Badge key="b" tone={ABC_TONE[p.abc_class]}>{p.abc_class}</Badge>,
              p.quantity,
              formatBRL(p.revenue),
              `${p.cumulative_pct.toFixed(0)}%`,
            ])}
          />
        )}
      </SectionCard>
      <SectionCard
        title="Pedidos juntos"
        subtitle="Pares mais frequentes — candidatos a combo/upsell"
        loading={basket.isLoading}
      >
        {(basket.data?.pairs?.length ?? 0) === 0 ? (
          <EmptyNote />
        ) : (
          <RankBarList
            items={(basket.data?.pairs ?? []).map((p) => ({
              label: `${p.product_a} + ${p.product_b}`,
              value: p.orders_together,
            }))}
            max={12}
          />
        )}
      </SectionCard>
    </div>
  );
};
