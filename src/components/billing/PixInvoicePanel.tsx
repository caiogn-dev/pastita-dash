/**
 * PixInvoicePanel — bloco reutilizável de cobrança PIX (copia-e-cola + QR + link + status).
 *
 * Extraído do markup inline de `OrderDetailContent.tsx` (Fase 3, Task 3) para poder ser
 * reaproveitado em outros fluxos de cobrança (ex: página de link de pagamento avulso).
 */
import React from 'react';
import toast from 'react-hot-toast';

export interface PixInvoicePanelProps {
  pixCode?: string | null;
  pixQrCode?: string | null;
  ticketUrl?: string | null;
  amount?: number | null;
  status?: string | null;
  expiresAt?: string | null;
  onCopy?: (code: string) => void;
}

const formatMoney = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

type BadgeTone = 'paid' | 'pending' | 'expired';

const badgeConfig: Record<BadgeTone, { label: string; className: string }> = {
  paid: {
    label: 'Pago',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  },
  pending: {
    label: 'Pendente',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  },
  expired: {
    label: 'Expirado',
    className:
      'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
  },
};

const resolveTone = (status?: string | null): BadgeTone => {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'completed' || normalized === 'paid') return 'paid';
  if (normalized === 'expired') return 'expired';
  return 'pending';
};

export const PixInvoicePanel: React.FC<PixInvoicePanelProps> = ({
  pixCode,
  pixQrCode,
  ticketUrl,
  amount,
  status,
  expiresAt,
  onCopy,
}) => {
  const tone = resolveTone(status);
  const badge = badgeConfig[tone];

  const handleCopy = (code: string) => {
    if (onCopy) {
      onCopy(code);
      return;
    }
    navigator.clipboard?.writeText(code);
    toast.success('Código PIX copiado!');
  };

  const expiresAtLabel = expiresAt
    ? new Date(expiresAt).toLocaleString('pt-BR')
    : null;

  return (
    <div className="space-y-3 rounded-2xl border border-token bg-surface px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {amount != null && (
            <span className="text-sm font-semibold text-fg-token">
              {formatMoney(amount)}
            </span>
          )}
          {expiresAtLabel && (
            <span className="text-xs text-fg-muted-token">
              Vencimento: {expiresAtLabel}
            </span>
          )}
        </div>
        {status != null && (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
      </div>

      {pixCode && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-fg-token">PIX copia e cola</span>
          <div className="flex items-center gap-2">
            <code className="block flex-1 break-all rounded-xl border border-dashed border-token px-3 py-2 text-xs text-fg-token">
              {pixCode}
            </code>
            <button
              type="button"
              onClick={() => handleCopy(pixCode)}
              className="shrink-0 rounded-full border border-token px-3 py-2 text-xs font-medium text-fg-token hover:bg-surface-2"
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      {pixQrCode && (
        <img
          src={
            pixQrCode.startsWith('data:')
              ? pixQrCode
              : `data:image/png;base64,${pixQrCode}`
          }
          alt="QR Code PIX"
          className="h-40 w-40 rounded-xl border border-token"
        />
      )}

      {ticketUrl && (
        <a
          href={ticketUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-full border border-token px-4 py-2 text-sm font-medium text-fg-token hover:bg-surface-2"
        >
          Abrir link de pagamento
        </a>
      )}
    </div>
  );
};

export default PixInvoicePanel;
