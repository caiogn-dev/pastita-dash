/**
 * TimeSeriesChart — gráfico de série temporal reutilizável (base de Relatórios).
 *
 * Uma única série (magnitude ao longo do tempo): sem legenda, o título nomeia a
 * série. Eixos/grade são "recessivos" e theme-aware via `currentColor` (a cor do
 * texto vem do container, então funciona em claro e escuro sem hardcode). A cor
 * da série é um parâmetro (default = cor da marca da loja, `var(--brand)`).
 *
 * Antes cada página desenhava um <AreaChart> inline com cores fixas (#166534,
 * #e5e7eb, #6b7280) que não seguiam o tema nem a marca. Este componente
 * centraliza isso.
 */
import React, { useId } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';

export interface TimeSeriesChartProps {
  // recharts é loosely-typed; aceita qualquer linha de dados com as chaves x/y.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  /** chave do eixo X (categoria/tempo). */
  xKey: string;
  /** chave numérica do eixo Y. */
  yKey: string;
  /** nome da série (tooltip + aria). */
  label: string;
  /** cor da série. Default: cor da marca. */
  color?: string;
  type?: 'area' | 'bar';
  height?: number;
  /** formata o valor no tooltip (detalhe completo). */
  valueFormat?: (v: number) => string;
  /** formata o tick do eixo Y (compacto). Default: = valueFormat. */
  yTickFormat?: (v: number) => string;
  /** formata o rótulo do eixo X (tick). */
  xTickFormat?: (v: string) => string;
  /** formata o rótulo (data) no cabeçalho do tooltip. */
  tooltipLabelFormat?: (v: string) => string;
}

const defaultValueFormat = (v: number) => new Intl.NumberFormat('pt-BR').format(v);

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  xKey,
  yKey,
  label,
  color = 'var(--brand)',
  type = 'area',
  height = 320,
  valueFormat = defaultValueFormat,
  yTickFormat,
  xTickFormat,
  tooltipLabelFormat,
}) => {
  const gradientId = useId().replace(/[:]/g, '');
  const axisFormat = yTickFormat ?? valueFormat;

  const commonAxes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.12} vertical={false} />
      <XAxis
        dataKey={xKey}
        tickFormatter={xTickFormat}
        stroke="currentColor"
        strokeOpacity={0.4}
        tick={{ fontSize: 12, fill: 'currentColor', fillOpacity: 0.7 }}
        minTickGap={20}
        tickLine={false}
      />
      <YAxis
        tickFormatter={(v) => axisFormat(Number(v) || 0)}
        stroke="currentColor"
        strokeOpacity={0.4}
        tick={{ fontSize: 12, fill: 'currentColor', fillOpacity: 0.7 }}
        width={64}
        tickLine={false}
        axisLine={false}
      />
      <RechartsTooltip
        cursor={{ stroke: color, strokeOpacity: 0.3, strokeWidth: 1 }}
        formatter={(v: unknown) => [valueFormat(Number(v) || 0), label]}
        labelFormatter={tooltipLabelFormat ? (l) => tooltipLabelFormat(String(l)) : undefined}
        contentStyle={{
          backgroundColor: 'var(--surface, #fff)',
          border: '1px solid var(--border, #e5e7eb)',
          borderRadius: '10px',
          color: 'var(--fg, #171717)',
          fontSize: '12px',
        }}
      />
    </>
  );

  return (
    <div className="text-fg-muted-token">
      <ResponsiveContainer width="100%" height={height}>
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {commonAxes}
            <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={44} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            {commonAxes}
            <Area
              type="monotone"
              dataKey={yKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: color }}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default TimeSeriesChart;
