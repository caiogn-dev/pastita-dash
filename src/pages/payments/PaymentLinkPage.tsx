/**
 * PaymentLinkPage — Link de pagamento AVULSO (Fase 3)
 *
 * Gera uma cobrança PIX de valor arbitrário SEM pedido vinculado (StorePayment.order=null).
 * Fluxo: valor + descrição (+ pagador opcional) → createPaymentLink → PIX copia-e-cola + QR + link.
 *
 * TODO (Fase 3b): listar as cobranças avulsas já geradas. O backend ainda escopa
 * a listagem por order__store, então a lista de avulsas depende de evolução do backend.
 */
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { paymentsService, getErrorMessage } from '../../services';
import { useStore } from '../../hooks';
import { copyToClipboard } from '../../utils/clipboard';

interface GeneratedLink {
  pix_code?: string;
  pix_qr_code?: string;
  ticket_url?: string;
  amount?: number | string;
}

const formatMoney = (value: number | undefined | null) =>
  `R$ ${(value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export const PaymentLinkPage: React.FC = () => {
  const { storeId, storeName, isStoreSelected } = useStore();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedLink | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      toast.error('Selecione uma loja no menu superior.');
      return;
    }
    const parsed = Number(amount.trim().replace(',', '.'));
    if (Number.isNaN(parsed) || parsed <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    setGenerating(true);
    try {
      const { payment } = await paymentsService.createPaymentLink({
        store: storeId,
        amount: parsed,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(payerName.trim() ? { payer_name: payerName.trim() } : {}),
        ...(payerEmail.trim() ? { payer_email: payerEmail.trim() } : {}),
      });
      setGenerated({
        pix_code: (payment.pix_code as string) || undefined,
        pix_qr_code: (payment.pix_qr_code as string) || (payment.qr_code_base64 as string) || undefined,
        ticket_url: (payment.ticket_url as string) || (payment.pix_ticket_url as string) || undefined,
        amount: (payment.amount as number | string) ?? parsed,
      });
      toast.success('Cobrança PIX gerada!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (code: string) => {
    const ok = await copyToClipboard(code);
    if (ok) toast.success('Código PIX copiado!');
    else toast.error('Não foi possível copiar. Copie manualmente.');
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg-token">Link de pagamento</h1>
        <p className="mt-1 text-sm text-fg-muted-token">
          Cobre um valor avulso via PIX, sem precisar de um pedido.
          {storeName ? ` Loja: ${storeName}.` : ''}
        </p>
      </header>

      {!isStoreSelected && (
        <div className="rounded-xl border border-border-token bg-surface px-4 py-3 text-sm text-fg-muted-token">
          Selecione uma loja no menu superior para gerar uma cobrança.
        </div>
      )}

      <form onSubmit={handleGenerate} className="space-y-4 rounded-2xl border border-border-token bg-surface p-5">
        <div>
          <label htmlFor="pl-amount" className="block text-sm font-medium text-fg-token">
            Valor (R$)
          </label>
          <input
            id="pl-amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border-token bg-surface-2 px-3 py-2 text-sm text-fg-token outline-none focus:border-brand"
            placeholder="0,00"
            required
          />
        </div>

        <div>
          <label htmlFor="pl-description" className="block text-sm font-medium text-fg-token">
            Descrição (opcional)
          </label>
          <input
            id="pl-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border-token bg-surface-2 px-3 py-2 text-sm text-fg-token outline-none focus:border-brand"
            placeholder="Ex: Sinal do evento"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pl-payer-name" className="block text-sm font-medium text-fg-token">
              Nome do pagador (opcional)
            </label>
            <input
              id="pl-payer-name"
              type="text"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border-token bg-surface-2 px-3 py-2 text-sm text-fg-token outline-none focus:border-brand"
            />
          </div>
          <div>
            <label htmlFor="pl-payer-email" className="block text-sm font-medium text-fg-token">
              E-mail do pagador (opcional)
            </label>
            <input
              id="pl-payer-email"
              type="email"
              value={payerEmail}
              onChange={(e) => setPayerEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border-token bg-surface-2 px-3 py-2 text-sm text-fg-token outline-none focus:border-brand"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={generating || !isStoreSelected}
          className="w-full rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-[var(--brand-strong)] transition hover:opacity-90 disabled:opacity-60"
        >
          {generating ? 'Gerando...' : 'Gerar cobrança PIX'}
        </button>
      </form>

      {generated && (
        <section className="mt-6 space-y-4 rounded-2xl border border-border-token bg-surface p-5">
          <h2 className="text-base font-semibold text-fg-token">
            Cobrança gerada {generated.amount != null ? `— ${formatMoney(Number(generated.amount))}` : ''}
          </h2>

          {generated.pix_code && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-fg-muted-token">PIX copia e cola</span>
              <div className="flex items-center gap-2">
                <code className="block flex-1 break-all rounded-xl border border-dashed border-border-token px-3 py-2 text-xs text-fg-token">
                  {generated.pix_code}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(generated.pix_code!)}
                  className="shrink-0 rounded-full border border-border-token px-3 py-2 text-xs font-medium text-fg-token hover:bg-surface-2"
                >
                  Copiar
                </button>
              </div>
            </div>
          )}

          {generated.pix_qr_code && (
            <img
              src={generated.pix_qr_code.startsWith('data:')
                ? generated.pix_qr_code
                : `data:image/png;base64,${generated.pix_qr_code}`}
              alt="QR Code PIX"
              className="h-44 w-44 rounded-xl border border-border-token"
            />
          )}

          {generated.ticket_url && (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={generated.ticket_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-border-token px-4 py-2 text-sm font-medium text-fg-token hover:bg-surface-2"
              >
                Abrir link de pagamento
              </a>
              <button
                type="button"
                onClick={() => handleCopy(generated.ticket_url!)}
                className="inline-flex rounded-full border border-border-token px-4 py-2 text-sm font-medium text-fg-token hover:bg-surface-2"
              >
                Copiar link
              </button>
            </div>
          )}
        </section>
      )}

      {/* TODO (Fase 3b): listar cobranças avulsas já geradas (backend ainda escopa por order__store). */}
    </div>
  );
};

export default PaymentLinkPage;
