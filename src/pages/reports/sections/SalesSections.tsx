/**
 * Seções de vendas do BI: heatmap dia×hora (horários de pico), mix por canal
 * e curva ABC + cesta (produtos pedidos juntos).
 */
import React from 'react';
import { Badge } from '../../../components/ui';
import type {
  HeatmapReport, ChannelsReport, AbcReport, BasketReport, MenuMatrixReport, DateRange,
} from '../../../services/reports';
import { useAnalyticsReport } from '../../../hooks/queries/useReports';
import { DonutChart } from '../../../components/reports/DonutChart';
import { SectionCard, EmptyNote, RankedList, ExportCsvButton, formatBRL, paymentLabel, deliveryLabel } from './shared';

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
      error={q.isError}
      onRetry={() => { void q.refetch(); }}
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
              <span key={h} className="text-center text-badge text-fg-muted-token">{h}h</span>
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
          <div className="flex items-center gap-2 mt-3 text-badge text-fg-muted-token">
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

  const mixCard = (
    title: string,
    subtitle: string | undefined,
    rows: Array<{ label: string; sub: string; value: number }>,
  ) => {
    const total = rows.reduce((acc, r) => acc + r.value, 0);
    return (
      <SectionCard title={title} subtitle={subtitle} loading={q.isLoading} error={q.isError} onRetry={() => { void q.refetch(); }}>
        <DonutChart
          data={rows.map((r) => ({ name: r.label, value: r.value }))}
          centerLabel={formatBRL(total)}
          centerSub="no período"
          valueFormat={formatBRL}
        />
        <div className="mt-3">
          <RankedList
            medals={false}
            items={rows.map((r) => ({
              ...r,
              sub: `${r.sub}${total ? ` · ${Math.round((r.value / total) * 100)}%` : ''}`,
              valueLabel: formatBRL(r.value),
            }))}
          />
        </div>
      </SectionCard>
    );
  };

  return (
    <div className="grid grid-cols-3 max-lg:grid-cols-1 gap-6">
      {mixCard(
        'Por canal',
        'Bot × Cardápio × PDV',
        (d?.by_source ?? []).map((r) => ({
          label: CHANNEL_LABELS[r.channel] || r.channel,
          sub: `${r.orders} pedidos · ticket ${formatBRL(r.avg_ticket)}`,
          value: r.revenue,
        })),
      )}
      {mixCard(
        'Por pagamento',
        undefined,
        (d?.by_payment_method ?? []).map((r) => ({
          label: paymentLabel(r.payment_method),
          sub: `${r.orders} pedidos`,
          value: Number(r.revenue),
        })),
      )}
      {mixCard(
        'Entrega × retirada',
        undefined,
        (d?.by_delivery_method ?? []).map((r) => ({
          label: deliveryLabel(r.delivery_method),
          sub: `${r.orders} pedidos`,
          value: Number(r.revenue),
        })),
      )}
    </div>
  );
};

const ABC_TONE: Record<string, 'success' | 'warning' | 'neutral'> = { A: 'success', B: 'warning', C: 'neutral' };

const QUADRANTS: Array<{
  key: MenuMatrixReport['products'][number]['quadrant'];
  label: string;
  hint: string;
  tone: 'success' | 'warning' | 'neutral' | 'danger';
}> = [
  { key: 'estrela', label: '⭐ Estrelas', hint: 'Vendem muito e lucram muito — destaque no cardápio', tone: 'success' },
  { key: 'burro_de_carga', label: '🐴 Burros de carga', hint: 'Vendem muito, lucram pouco — suba o preço ou corte custo', tone: 'warning' },
  { key: 'enigma', label: '❓ Enigmas', hint: 'Lucram muito, vendem pouco — promova mais', tone: 'neutral' },
  { key: 'abacaxi', label: '🍍 Abacaxis', hint: 'Vendem pouco e lucram pouco — repense ou remova', tone: 'danger' },
];

export const MenuMatrixSection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const q = useAnalyticsReport<MenuMatrixReport>('menu-matrix', range, enabled);
  const products = q.data?.products ?? [];
  const missing = q.data?.missing_cost ?? [];

  return (
    <SectionCard
      title="Engenharia de cardápio"
      subtitle="Popularidade × margem de contribuição — precisa do custo preenchido no produto"
      loading={q.isLoading}
      error={q.isError}
      onRetry={() => { void q.refetch(); }}
      action={
        <ExportCsvButton
          rows={products}
          columns={[
            { key: 'product_name', label: 'Produto' }, { key: 'quadrant', label: 'Quadrante' },
            { key: 'quantity', label: 'Qtd' }, { key: 'revenue', label: 'Receita' },
            { key: 'unit_margin', label: 'Margem unit.' }, { key: 'margin_pct', label: '% Margem' },
          ]}
          filename="engenharia_cardapio.csv"
        />
      }
    >
      {products.length === 0 ? (
        <EmptyNote text="Nenhum produto vendido no período tem custo cadastrado — preencha o campo Custo no editor de produto para liberar a matriz." />
      ) : (
        <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-4">
          {QUADRANTS.map((quad) => {
            const items = products.filter((p) => p.quadrant === quad.key);
            return (
              <div key={quad.key} className="border border-border-token rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-fg-token">{quad.label}</span>
                  <Badge tone={quad.tone}>{items.length}</Badge>
                </div>
                <p className="text-xs text-fg-muted-token mb-3">{quad.hint}</p>
                {items.length === 0 ? (
                  <p className="text-xs text-fg-muted-token">Nenhum produto aqui.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {items.map((p) => (
                      <li key={p.product_name} className="flex justify-between gap-2 text-sm">
                        <span className="truncate text-fg-token" title={p.product_name}>{p.product_name}</span>
                        <span className="shrink-0 text-fg-muted-token tabular-nums">
                          {p.quantity}× · {formatBRL(p.unit_margin)}/un
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
      {missing.length > 0 && products.length > 0 && (
        <p className="text-xs text-fg-muted-token mt-4">
          {missing.length} produto{missing.length > 1 ? 's' : ''} fora da matriz por falta de custo cadastrado:{' '}
          {missing.slice(0, 5).map((m) => m.product_name).join(', ')}{missing.length > 5 ? '…' : ''}
        </p>
      )}
    </SectionCard>
  );
};

export const AbcBasketSection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const abc = useAnalyticsReport<AbcReport>('abc', range, enabled);
  const basket = useAnalyticsReport<BasketReport>('basket', range, enabled);
  return (
    <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
      <SectionCard
        title="Curva ABC"
        subtitle={abc.data ? `${abc.data.summary.a_count} produtos (classe A) concentram 80% da receita` : undefined}
        loading={abc.isLoading}
        error={abc.isError}
        onRetry={() => { void abc.refetch(); }}
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
          <RankedList
            items={(abc.data?.products ?? []).slice(0, 20).map((p) => ({
              label: p.product_name,
              badge: <Badge tone={ABC_TONE[p.abc_class]}>{p.abc_class}</Badge>,
              sub: `${p.quantity} vendidos · ${p.cumulative_pct.toFixed(0)}% acumulado`,
              value: p.revenue,
              valueLabel: formatBRL(p.revenue),
            }))}
          />
        )}
      </SectionCard>
      <SectionCard
        title="Pedidos juntos"
        subtitle="Pares mais frequentes — candidatos a combo/upsell"
        loading={basket.isLoading}
        error={basket.isError}
        onRetry={() => { void basket.refetch(); }}
      >
        {(basket.data?.pairs?.length ?? 0) === 0 ? (
          <EmptyNote />
        ) : (
          <RankedList
            items={(basket.data?.pairs ?? []).slice(0, 12).map((p) => ({
              label: `${p.product_a} + ${p.product_b}`,
              sub: 'pedidos juntos no período',
              value: p.orders_together,
              valueLabel: `${p.orders_together}×`,
            }))}
          />
        )}
      </SectionCard>
    </div>
  );
};
