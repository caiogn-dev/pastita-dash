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
