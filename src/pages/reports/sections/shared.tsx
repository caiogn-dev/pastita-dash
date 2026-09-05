/** Utilitários compartilhados das seções de analytics (BI Fase 1). */
import React from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Card } from '../../../components/ui';
import { toCsv, downloadCsv } from '../../../utils/csv';

// A lista ranqueada mudou de casa para `components/ui` — é o formato
// canônico de 'pessoas com um valor' e era invisível enterrada aqui.
// Reexportada para os relatórios seguirem importando do mesmo lugar.
export { EmptyNote, RankedList, type RankedItem } from '../../../components/ui/RankedList';

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
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted-token hover:text-brand-ink transition-colors shrink-0"
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
