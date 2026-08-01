/**
 * Geografia de entrega: ranking de bairros, anéis de distância e zonas.
 * (Mapa de pontos lat/lng fica para a fase do mapa interativo — os dados já
 * vêm no endpoint em `points`.)
 */
import React from 'react';
import { RankBarList } from '../../../components/reports/RankBarList';
import type { GeographyReport, DateRange } from '../../../services/reports';
import { useAnalyticsReport } from '../../../hooks/queries/useReports';
import { SectionCard, EmptyNote, MiniTable, formatBRL } from './shared';

export const GeographySection: React.FC<{ range: DateRange; enabled: boolean }> = ({ range, enabled }) => {
  const q = useAnalyticsReport<GeographyReport>('geography', range, enabled);
  const d = q.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
        <SectionCard
          title="Bairros que mais pedem"
          subtitle="Receita por bairro de entrega no período"
          loading={q.isLoading}
        >
          {(d?.neighborhoods?.length ?? 0) === 0 ? (
            <EmptyNote text="Nenhum pedido de entrega com bairro no período." />
          ) : (
            <MiniTable
              headers={[
                { label: 'Bairro' }, { label: 'Cidade' },
                { label: 'Pedidos', align: 'right' }, { label: 'Receita', align: 'right' },
              ]}
              rows={(d?.neighborhoods ?? []).slice(0, 15).map((n) => [
                n.name, n.city || '—', n.orders, formatBRL(n.revenue),
              ])}
            />
          )}
        </SectionCard>
        <div className="flex flex-col gap-6">
          <SectionCard title="Distância de entrega" subtitle="Pedidos por anel de distância" loading={q.isLoading}>
            <RankBarList
              items={(d?.distance_bands ?? []).map((b) => ({ label: b.band, value: b.orders }))}
              hideZero={false}
            />
          </SectionCard>
          <SectionCard title="Zonas de entrega" loading={q.isLoading}>
            {(d?.zones?.length ?? 0) === 0 ? (
              <EmptyNote text="Sem zona registrada nos pedidos do período." />
            ) : (
              <RankBarList
                items={(d?.zones ?? []).map((z) => ({ label: z.name, value: z.revenue }))}
                valueFormat={formatBRL}
              />
            )}
          </SectionCard>
        </div>
      </div>
      {(d?.points?.length ?? 0) > 0 && (
        <p className="text-xs text-fg-muted-token">
          {d?.points.length} pedidos com coordenada exata no período (base do futuro mapa de calor).
        </p>
      )}
    </div>
  );
};

export default GeographySection;
