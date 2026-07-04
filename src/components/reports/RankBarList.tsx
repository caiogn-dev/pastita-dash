/**
 * RankBarList — lista de barras horizontais para distribuições/rankings
 * (ex.: pedidos por status, produtos por receita). Escolha deliberada de forma:
 * comparar magnitudes entre categorias lê melhor em barras que em pizza/donut.
 *
 * Cor única por padrão (a identidade vem do rótulo em texto, não da cor), então
 * não precisa de paleta categórica validada. Um item pode marcar `tone: 'danger'`
 * pra destacar estados negativos (ex.: cancelado) sem virar arco-íris.
 */
import React from 'react';

export interface RankBarItem {
  label: string;
  value: number;
  tone?: 'brand' | 'danger' | 'muted';
}

export interface RankBarListProps {
  items: RankBarItem[];
  /** formata o valor exibido à direita. Default: número pt-BR. */
  valueFormat?: (v: number) => string;
  /** esconde itens com valor 0 (default true). */
  hideZero?: boolean;
  /** limita a N itens (mantém os maiores). */
  max?: number;
}

const toneColor: Record<NonNullable<RankBarItem['tone']>, string> = {
  brand: 'var(--brand)',
  danger: '#dc2626',
  muted: 'var(--fg-muted, #9ca3af)',
};

const defaultValueFormat = (v: number) => new Intl.NumberFormat('pt-BR').format(v);

export const RankBarList: React.FC<RankBarListProps> = ({
  items,
  valueFormat = defaultValueFormat,
  hideZero = true,
  max,
}) => {
  const visible = items
    .filter((i) => (hideZero ? i.value > 0 : true))
    .sort((a, b) => b.value - a.value)
    .slice(0, max ?? items.length);

  const peak = Math.max(1, ...visible.map((i) => i.value));

  if (visible.length === 0) {
    return <p className="text-sm text-fg-muted-token py-4">Sem dados no período.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {visible.map((item) => {
        const pct = Math.max(2, Math.round((item.value / peak) * 100));
        const color = toneColor[item.tone ?? 'brand'];
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-sm text-fg-token" title={item.label}>
              {item.label}
            </span>
            <div className="relative h-2.5 flex-1 rounded-full bg-surface-2">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-sm font-semibold text-fg-token tabular-nums">
              {valueFormat(item.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default RankBarList;
