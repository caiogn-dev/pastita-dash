/**
 * Geografia de entrega: ranking de bairros, anéis de distância e zonas.
 * (Mapa de pontos lat/lng fica para a fase do mapa interativo — os dados já
 * vêm no endpoint em `points`.)
 */
import React from 'react';
import { OrdersHeatMap } from '../../../components/maps/OrdersHeatMap';
import type { GeographyReport, DateRange } from '../../../services/reports';
import { useAnalyticsReport } from '../../../hooks/queries/useReports';
import { useStore } from '../../../hooks/useStore';
import { SectionCard, EmptyNote, RankedList, ExportCsvButton, formatBRL } from './shared';

export const GeographySection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const q = useAnalyticsReport<GeographyReport>('geography', range, enabled);
  const { storeId } = useStore();
  const d = q.data;

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Mapa de calor de pedidos"
        subtitle={
          (d?.points?.length ?? 0) > 0
            ? `${d?.points.length} pedidos com localização exata — toque num círculo para ver cliente, pedido e valor`
            : undefined
        }
        loading={q.isLoading}
      >
        {(d?.points?.length ?? 0) === 0 ? (
          <EmptyNote text="Nenhum pedido com coordenada exata no período (pedidos do bot e pins de WhatsApp alimentam o mapa)." />
        ) : (
          <OrdersHeatMap
            points={d?.points ?? []}
            orderUrlBase={storeId ? `/stores/${storeId}/orders` : undefined}
          />
        )}
      </SectionCard>

      <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
        <SectionCard
          title="Bairros que mais pedem"
          subtitle="Receita por bairro de entrega no período"
          loading={q.isLoading}
          action={
            <ExportCsvButton
              rows={d?.neighborhoods ?? []}
              columns={[
                { key: 'name', label: 'Bairro' }, { key: 'city', label: 'Cidade' },
                { key: 'orders', label: 'Pedidos' }, { key: 'revenue', label: 'Receita' },
              ]}
              filename="bairros.csv"
            />
          }
        >
          {(d?.neighborhoods?.length ?? 0) === 0 ? (
            <EmptyNote text="Nenhum pedido de entrega com bairro no período." />
          ) : (
            <RankedList
              items={(d?.neighborhoods ?? []).slice(0, 15).map((n) => ({
                label: n.name,
                sub: [n.city, `${n.orders} pedido${n.orders > 1 ? 's' : ''}`].filter(Boolean).join(' · '),
                value: n.revenue,
                valueLabel: formatBRL(n.revenue),
              }))}
            />
          )}
        </SectionCard>
        <div className="flex flex-col gap-6">
          <SectionCard title="Distância de entrega" subtitle="Pedidos por anel de distância" loading={q.isLoading}>
            <RankedList
              medals={false}
              items={(d?.distance_bands ?? []).map((b) => ({
                label: b.band,
                sub: formatBRL(b.revenue),
                value: b.orders,
                valueLabel: `${b.orders} pedido${b.orders > 1 ? 's' : ''}`,
              }))}
            />
          </SectionCard>
          <SectionCard title="Zonas de entrega" loading={q.isLoading}>
            {(d?.zones?.length ?? 0) === 0 ? (
              <EmptyNote text="Sem zona registrada nos pedidos do período." />
            ) : (
              <RankedList
                items={(d?.zones ?? []).map((z) => ({
                  label: z.name,
                  sub: `${z.orders} pedido${z.orders > 1 ? 's' : ''}`,
                  value: z.revenue,
                  valueLabel: formatBRL(z.revenue),
                }))}
              />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default GeographySection;
