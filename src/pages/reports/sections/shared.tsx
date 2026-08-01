/** Utilitários compartilhados das seções de analytics (BI Fase 1). */
import React from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Card } from '../../../components/ui';
import { toCsv, downloadCsv } from '../../../utils/csv';

export const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// Rótulos pt-BR dos valores crus que a API devolve (payment_method,
// delivery_method etc.). Sempre passar por aqui antes de exibir.
const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  card: 'Cartão',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  mercadopago: 'Mercado Pago',
  nao_informado: 'Não informado',
};
const DELIVERY_LABELS: Record<string, string> = {
  delivery: 'Entrega',
  pickup: 'Retirada',
  digital: 'Digital',
  nao_informado: 'Não informado',
};

export const paymentLabel = (v: unknown) => PAYMENT_LABELS[String(v)] || String(v);
export const deliveryLabel = (v: unknown) => DELIVERY_LABELS[String(v)] || String(v);

export const Spinner: React.FC = () => (
  <div className="flex justify-center py-12">
    <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
  </div>
);

export const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  loading?: boolean;
  /** ação no canto do header (ex.: botão de export da seção). */
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, loading, action, children }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-border-token/60">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted-token">{title}</h2>
        {subtitle && <p className="text-sm text-fg-token mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
    {loading ? <Spinner /> : children}
  </Card>
);

export const EmptyNote: React.FC<{ text?: string }> = ({ text = 'Sem dados no período.' }) => (
  <p className="text-sm text-fg-muted-token py-4">{text}</p>
);

/** Pill de variação ▲/▼ — verde quando bom, vermelho quando ruim. */
export const DeltaPill: React.FC<{ pct: number | null | undefined; invert?: boolean }> = ({ pct, invert }) => {
  if (pct == null) return null;
  const good = invert ? pct <= 0 : pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
        good
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : 'bg-red-500/15 text-red-600 dark:text-red-400'
      }`}
    >
      {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
};

export interface RankedItem {
  label: string;
  /** linha secundária sob o rótulo (ex.: cidade, qtd vendida). */
  sub?: string;
  /** magnitude que dimensiona a barra. */
  value: number;
  /** texto exibido à direita (default: value formatado pt-BR). */
  valueLabel?: string;
  /** chip opcional ao lado do rótulo (ex.: classe ABC). */
  badge?: React.ReactNode;
  /** ações à direita (links/botões). */
  actions?: React.ReactNode;
  /** barra em tom de alerta (ex.: nota baixa). */
  danger?: boolean;
}

const MEDAL_STYLES = [
  'bg-[color-mix(in_srgb,var(--brand)_85%,#fff)] text-black',            // ouro
  'bg-[color-mix(in_srgb,#c0c0c0_80%,transparent)] text-black',          // prata
  'bg-[color-mix(in_srgb,#cd7f32_70%,transparent)] text-white',          // bronze
];

/**
 * Lista ranqueada — o formato canônico dos rankings de relatório: medalha
 * nos 3 primeiros, barra proporcional dourada e valor à direita. Substitui
 * as tabelas nos rankings (tabela fica só para dados de conferência, ex.
 * fechamento de caixa).
 */
export const RankedList: React.FC<{
  items: RankedItem[];
  /** escala máxima da barra (default: maior value da lista). */
  max?: number;
  medals?: boolean;
}> = ({ items, max, medals = true }) => {
  if (!items.length) return <EmptyNote />;
  const peak = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-1">
      {items.map((item, idx) => {
        const pct = Math.max(3, Math.round((item.value / peak) * 100));
        return (
          <div
            key={`${item.label}-${idx}`}
            className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2 transition-colors"
          >
            <span
              className={`shrink-0 w-7 h-7 rounded-full grid place-items-center text-xs font-bold tabular-nums ${
                medals && idx < 3 ? MEDAL_STYLES[idx] : 'bg-surface-2 text-fg-muted-token'
              }`}
            >
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-fg-token" title={item.label}>
                  {item.label}
                </span>
                {item.badge}
              </div>
              {item.sub && <p className="text-xs text-fg-muted-token truncate">{item.sub}</p>}
              <div className="mt-1.5 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: item.danger
                      ? '#dc2626'
                      : 'linear-gradient(90deg, color-mix(in srgb, var(--brand) 55%, transparent), var(--brand))',
                  }}
                />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-sm font-semibold text-fg-token tabular-nums">
                {item.valueLabel ?? new Intl.NumberFormat('pt-BR').format(item.value)}
              </span>
              {item.actions}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Botão de exportação CSV da seção (client-side, dados já carregados). */
export function ExportCsvButton<T extends object>({
  rows,
  columns,
  filename,
}: {
  rows: T[];
  columns: Array<{ key: string; label: string }>;
  filename: string;
}) {
  if (!rows.length) return null;
  return (
    <button
      type="button"
      onClick={() => downloadCsv(toCsv(rows, columns), filename)}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted-token hover:text-brand transition-colors shrink-0"
      title="Exportar CSV"
    >
      <ArrowDownTrayIcon className="w-4 h-4" />
      CSV
    </button>
  );
}

/** Tabela simples padrão das seções (headers à esquerda, números à direita). */
export const MiniTable: React.FC<{
  headers: Array<{ label: string; align?: 'left' | 'right' }>;
  rows: Array<Array<React.ReactNode>>;
}> = ({ headers, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border-token">
          {headers.map((h) => (
            <th
              key={h.label}
              className={`pb-2 px-2 first:pl-1 text-xs font-semibold uppercase tracking-wide text-fg-muted-token ${h.align === 'right' ? 'text-right' : 'text-left'}`}
            >
              {h.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr
            key={i}
            className="border-b border-border-token/40 last:border-0 odd:bg-surface-2/40 hover:bg-surface-2 transition-colors"
          >
            {cells.map((cell, j) => (
              <td
                key={j}
                className={`py-2.5 px-2 first:pl-1 text-fg-token ${headers[j]?.align === 'right' ? 'text-right tabular-nums' : ''}`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
