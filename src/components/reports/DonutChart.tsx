/**
 * DonutChart — mix de participação (canal, pagamento, entrega). Usado quando
 * há POUCAS fatias (2-5); acima disso, ranking em barras lê melhor.
 * Total no centro; legenda com % fica por conta do RankedList ao lado.
 */
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export interface DonutSlice { name: string; value: number }

// Ouro da marca primeiro; demais cores do mapa de zonas (já validadas no tema)
const COLORS = ['#D4AF37', '#F97316', '#4CAF50', '#2196F3', '#9C27B0', '#607D8B'];

export const DonutChart: React.FC<{
  data: DonutSlice[];
  /** rótulo central (ex.: total formatado). */
  centerLabel?: string;
  centerSub?: string;
  height?: number;
  valueFormat?: (v: number) => string;
}> = ({ data, centerLabel, centerSub, height = 180, valueFormat }) => {
  const slices = data.filter((d) => d.value > 0);
  if (!slices.length) return null;
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            stroke="var(--surface, #fff)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {slices.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: number, name: string) => [valueFormat ? valueFormat(value) : String(value), name]) as any}
            contentStyle={{
              background: 'var(--surface, #fff)',
              border: '1px solid var(--border, #e5e7eb)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <p className="text-base font-bold text-fg-token tabular-nums leading-tight">{centerLabel}</p>
            {centerSub && <p className="text-[11px] text-fg-muted-token">{centerSub}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default DonutChart;
