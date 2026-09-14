/** Utilitários compartilhados das seções de analytics (BI Fase 1). */
import React from 'react';
import { ArrowDownTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Card } from '../../../components/ui';
import { toCsv, downloadCsv } from '../../../utils/csv';
import { Loading } from '../../../components/common';

// A lista ranqueada mudou de casa para `components/ui` — é o formato
// canônico de 'pessoas com um valor' e era invisível enterrada aqui.
// Reexportada para os relatórios seguirem importando do mesmo lugar.
export { EmptyNote, RankedList, type RankedItem } from '../../../components/ui/RankedList';

export { formatCurrency as formatBRL } from '../../../utils/formatters';

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
    <Loading size="md" />
  </div>
);

/**
 * Aviso de falha da seção — usado quando a query da seção erra. Sem ele, a
 * seção cairia no ramo "sem dados" e diria ao operador que não há pedidos/
 * clientes quando na verdade a requisição falhou (número zerado enganoso).
 */
export const SectionError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div
    role="alert"
    className="flex flex-col items-center gap-2 py-8 text-center"
  >
    <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
    <p className="text-sm text-fg-muted-token">
      Não foi possível carregar esta seção. Os números podem estar incompletos.
    </p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 rounded-lg border border-border-token px-3 py-1.5 text-sm font-medium text-fg-token hover:bg-surface-2 transition-colors"
      >
        Tentar novamente
      </button>
    )}
  </div>
);

export const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  loading?: boolean;
  /** quando true, mostra aviso de falha no lugar do conteúdo (não confundir com "sem dados"). */
  error?: boolean;
  /** callback do botão "Tentar novamente" exibido no estado de erro. */
  onRetry?: () => void;
  /** ação no canto do header (ex.: botão de export da seção). */
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, loading, error, onRetry, action, children }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-border-token/60">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted-token">{title}</h2>
        {subtitle && <p className="text-sm text-fg-token mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
    {loading ? <Spinner /> : error ? <SectionError onRetry={onRetry} /> : children}
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

