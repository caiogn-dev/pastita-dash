/**
 * DonutChart — mix de participação (canal, pagamento, entrega). Usado quando
 * há POUCAS fatias (2-5); acima disso, ranking em barras lê melhor.
 * Total no centro; legenda com % fica por conta do RankedList ao lado.
 *
 * ── POR QUE É SVG PRÓPRIO ───────────────────────────────────────────────────
 * Este componente e o `TimeSeriesChart` eram os dois únicos motivos de o
 * recharts estar no projeto — 110 kB comprimidos, o maior peso do painel. Um
 * anel de 2 a 5 fatias é um punhado de arcos: `stroke-dasharray` sobre um
 * círculo, que é mais simples e mais leve do que qualquer biblioteca.
 *
 * As props não mudaram; `DonutChart.contrato.test.tsx` guarda isso.
 */
import React, { useState } from 'react';

export interface DonutSlice { name: string; value: number }

// Ouro da marca primeiro; demais cores do mapa de zonas (já validadas no tema)
const CORES = ['#D4AF37', '#F97316', '#4CAF50', '#2196F3', '#9C27B0', '#607D8B'];

const RAIO = 42;              // num viewBox 100x100
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
const ESPESSURA = 13;

export const DonutChart: React.FC<{
  data: DonutSlice[];
  /** rótulo central (ex.: total formatado). */
  centerLabel?: string;
  centerSub?: string;
  height?: number;
  valueFormat?: (v: number) => string;
}> = ({ data, centerLabel, centerSub, height = 180, valueFormat }) => {
  const [ativa, setAtiva] = useState<number | null>(null);

  const fatias = data.filter((d) => d.value > 0);
  if (!fatias.length) return null;

  const total = fatias.reduce((s, f) => s + f.value, 0);
  const formatar = valueFormat ?? ((v: number) => String(v));

  // Cada fatia é um traço do círculo: comprimento proporcional ao valor,
  // deslocado pelo que já foi desenhado antes dela.
  let percorrido = 0;
  const arcos = fatias.map((fatia, i) => {
    const proporcao = fatia.value / total;
    const comprimento = proporcao * CIRCUNFERENCIA;
    const arco = {
      ...fatia,
      i,
      proporcao,
      comprimento,
      deslocamento: -percorrido,
      cor: CORES[i % CORES.length],
    };
    percorrido += comprimento;
    return arco;
  });

  const descricao = arcos
    .map((a) => `${a.name} ${Math.round(a.proporcao * 100)}%`)
    .join(', ');

  const fatiaAtiva = ativa != null ? arcos[ativa] : null;

  return (
    <div className="relative" style={{ height: `${height}px` }}>
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={descricao}
        className="h-full w-full -rotate-90"
      >
        {arcos.map((a) => (
          <circle
            key={a.i}
            data-fatia
            cx="50" cy="50" r={RAIO}
            fill="none"
            stroke={a.cor}
            strokeWidth={ativa === a.i ? ESPESSURA + 3 : ESPESSURA}
            // O 0.6 abre um respiro entre fatias vizinhas sem inventar uma
            // fatia falsa: some quando há uma só, que aí o anel é inteiro.
            strokeDasharray={`${Math.max(0, a.comprimento - (arcos.length > 1 ? 0.6 : 0))} ${CIRCUNFERENCIA}`}
            strokeDashoffset={a.deslocamento}
            opacity={ativa == null || ativa === a.i ? 1 : 0.45}
            onMouseEnter={() => setAtiva(a.i)}
            onMouseLeave={() => setAtiva(null)}
            style={{ transition: 'stroke-width 160ms var(--mola), opacity 160ms ease' }}
          />
        ))}
      </svg>

      {centerLabel && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <p className="text-base font-bold text-fg-token tabular-nums leading-tight">{centerLabel}</p>
            {centerSub && <p className="text-badge text-fg-muted-token">{centerSub}</p>}
          </div>
        </div>
      )}

      {fatiaAtiva && (
        <div
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1 rounded-md border border-border-token bg-surface-token px-2.5 py-1.5 text-xs shadow-[var(--elev-flutuante)]"
        >
          <div className="text-fg-muted-token">{fatiaAtiva.name}</div>
          <div className="font-semibold tabular-nums text-fg-token">
            {formatar(fatiaAtiva.value)} · {Math.round(fatiaAtiva.proporcao * 100)}%
          </div>
        </div>
      )}
    </div>
  );
};

export default DonutChart;
