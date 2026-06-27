/**
 * PaymentLinkPage — Link de pagamento AVULSO (Fase 3)
 *
 * Gera um LINK DE PAGAMENTO (Checkout Pro / preference do Mercado Pago) de valor
 * arbitrário SEM pedido vinculado (StorePayment.order=null). É uma página hospedada
 * onde o cliente escolhe cartão/PIX/boleto — não apenas um PIX copia-e-cola.
 * Fluxo: valor + descrição (+ pagador opcional) → createPaymentLink → payment_url.
 *
 * TODO (Fase 3b): listar as cobranças avulsas já geradas. O backend ainda escopa
 * a listagem por order__store, então a lista de avulsas depende de evolução do backend.
 */
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { paymentsService, getErrorMessage } from '../../services';
import { useStore } from '../../hooks';

interface GeneratedLink {
  payment_url?: string;
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
      const url = (payment.payment_url as string) || (payment.init_point as string) || undefined;
      if (!url) {
        toast.error('Não foi possível gerar o link. Verifique as credenciais de pagamento da loja.');
        return;
      }
      setGenerated({
        payment_url: url,
        amount: (payment.amount as number | string) ?? parsed,
      });
      toast.success('Link de pagamento gerado!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    toast.success('Link copiado!');
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg-token">Link de pagamento</h1>
        <p className="mt-1 text-sm text-fg-muted-token">
          Gere um link para cobrar um valor avulso, sem precisar de um pedido. O cliente
          abre o link e paga por cartão, PIX ou boleto.
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
          {generating ? 'Gerando...' : 'Gerar link de pagamento'}
        </button>
      </form>

      {generated && (
        <section className="mt-6 space-y-4 rounded-2xl border border-border-token bg-surface p-5">
          <h2 className="text-base font-semibold text-fg-token">
            Link gerado {generated.amount != null ? `— ${formatMoney(Number(generated.amount))}` : ''}
          </h2>

          {generated.payment_url && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-fg-muted-token">Link de pagamento</span>
              <div className="flex items-center gap-2">
                <code className="block flex-1 break-all rounded-xl border border-dashed border-border-token px-3 py-2 text-xs text-fg-token">
                  {generated.payment_url}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(generated.payment_url!)}
                  className="shrink-0 rounded-full border border-border-token px-3 py-2 text-xs font-medium text-fg-token hover:bg-surface-2"
                >
                  Copiar
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={generated.payment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-[var(--brand-strong)] transition hover:opacity-90"
                >
                  Abrir link de pagamento
                </a>
                <span className="text-xs text-fg-muted-token">
                  Envie este link para o cliente — ele paga por cartão, PIX ou boleto.
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TODO (Fase 3b): listar cobranças avulsas já geradas (backend ainda escopa por order__store). */}
    </div>
  );
};

export default PaymentLinkPage;
