/**
 * SubscriptionManagementPage — gestão de assinatura da loja (rota /assinatura).
 *
 * Exibe o status atual da assinatura, permite trocar de plano (inicia checkout
 * MercadoPago) e cancelar a assinatura com confirmação.
 */
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../hooks/useStore';
import {
  getSubscription,
  cancelSubscription,
  changePlan,
  getPlans,
  getCurrentInvoice,
  listInvoices,
  type SubscriptionStatus,
  type Plan,
  type Invoice,
} from '../../services/billing';
import PixInvoicePanel from '../../components/billing/PixInvoicePanel';

const STATUS_LABEL: Record<string, string> = {
  none:      'Sem assinatura',
  trialing:  'Em trial',
  active:    'Ativa',
  past_due:  'Pagamento atrasado',
  suspended: 'Suspensa',
  canceled:  'Cancelada',
};

const INVOICE_POLL_MS = 15000;

/** Uma fatura é considerada quitada quando tem `paid_at` ou status completed/paid. */
function isInvoicePaid(invoice: Invoice): boolean {
  if (invoice.paid_at) return true;
  const status = (invoice.status || '').toLowerCase();
  return status === 'completed' || status === 'paid';
}

const OPEN_INVOICE_STATUSES = new Set(['pending', 'processing', '']);

/**
 * Uma fatura só deve manter o polling ativo quando ainda está genuinamente
 * aberta. Não paga NÃO significa pendente: `cancelled`/`failed`/`refunded`/
 * qualquer status desconhecido são terminais e devem parar o polling.
 */
function isInvoicePending(invoice: Invoice | null): boolean {
  if (!invoice) return false;
  if (isInvoicePaid(invoice)) return false;
  const status = (invoice.status || '').toLowerCase();
  return OPEN_INVOICE_STATUSES.has(status);
}

export default function SubscriptionManagementPage() {
  const { store } = useStore();
  const slug = (store as { slug?: string } | null)?.slug;

  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');

  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [invoiceHistory, setInvoiceHistory] = useState<Invoice[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!slug) {
      // Sem loja selecionada: não fica preso no "Carregando…" pra sempre.
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([getSubscription(slug), getPlans()])
      .then(([s, p]) => {
        setSub(s);
        setPlans(p);
      })
      .catch(() => setError('Não foi possível carregar a assinatura.'))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    mountedRef.current = true;
    listInvoices(slug)
      .then((invoices) => {
        if (mountedRef.current) setInvoiceHistory(invoices);
      })
      .catch(() => {
        /* histórico é auxiliar: falha silenciosa não bloqueia a página */
      });
    return () => {
      mountedRef.current = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchInvoice = async () => {
      try {
        const invoice = await getCurrentInvoice(slug);
        if (cancelled) return;
        setCurrentInvoice(invoice);
        if (!isInvoicePending(invoice) && intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } catch {
        /* fatura atual é auxiliar: falha silenciosa não bloqueia a página */
      }
    };

    void fetchInvoice();
    intervalId = setInterval(() => {
      void fetchInvoice();
    }, INVOICE_POLL_MS);

    return () => {
      cancelled = true;
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [slug]);

  async function handleCancel() {
    if (!slug || !confirm('Cancelar a assinatura? A loja será rebaixada ao fim do período.')) return;
    setBusy(true);
    try {
      const r = await cancelSubscription(slug);
      setSub((prev) => prev ? { ...prev, status: r.status as SubscriptionStatus['status'] } : prev);
    } catch {
      setError('Falha ao cancelar.');
    } finally {
      setBusy(false);
    }
  }

  async function handleChange(plan: Plan) {
    if (!slug) return;
    setBusy(true);
    try {
      const r = await changePlan(slug, plan.key);
      window.location.href = r.init_point;
    } catch {
      setError('Falha ao trocar de plano.');
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-fg-muted-token">Carregando assinatura…</div>;
  }

  if (!slug) {
    return <div className="p-6 text-fg-muted-token">Nenhuma loja selecionada.</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-fg-token">Assinatura</h1>
        <p className="mt-1 text-sm text-fg-muted-token">
          Status:{' '}
          <strong className="text-fg-token">
            {STATUS_LABEL[sub?.status ?? 'none']}
          </strong>
          {sub?.plan && (
            <>
              {' '}— plano <strong className="text-fg-token">{sub.plan}</strong>
            </>
          )}
          {sub?.current_period_end && (
            <>
              {' '}— próxima cobrança{' '}
              <strong className="text-fg-token">
                {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}
              </strong>
            </>
          )}
        </p>
      </header>

      {sub?.status === 'suspended' && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 text-sm">
          Sua loja está suspensa por falta de pagamento. Reative assinando um plano abaixo.
        </div>
      )}

      {sub?.status === 'past_due' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-700 text-sm">
          Pagamento atrasado. Regularize sua assinatura para evitar a suspensão da loja.
        </div>
      )}

      {currentInvoice && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-fg-token">Fatura atual</h2>
          {isInvoicePaid(currentInvoice) ? (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-700 text-sm">
              Pagamento em dia
              {currentInvoice.paid_at && (
                <>
                  {' '}— pago em{' '}
                  {new Date(currentInvoice.paid_at).toLocaleDateString('pt-BR')}
                </>
              )}
              .
            </div>
          ) : (
            <PixInvoicePanel
              pixCode={currentInvoice.pix_code}
              pixQrCode={currentInvoice.pix_qr_code}
              ticketUrl={currentInvoice.ticket_url}
              amount={currentInvoice.amount}
              status={currentInvoice.status}
              expiresAt={currentInvoice.expires_at}
            />
          )}
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-fg-muted-token">
            Tudo incluso, 0% de comissão, com bot + IA.
          </p>
          <div className="inline-flex rounded-full border border-border-token p-1 text-xs">
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                cycle === 'monthly' ? 'bg-brand text-white' : 'text-fg-muted-token'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setCycle('annual')}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                cycle === 'annual' ? 'bg-brand text-white' : 'text-fg-muted-token'
              }`}
            >
              Anual
            </button>
          </div>
        </div>
        {cycle === 'annual' && (
          <p className="mb-3 text-xs text-fg-muted-token">
            Cobrança anual chega em breve — por enquanto a assinatura é mensal.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = sub?.plan === p.key;
            const annualPrice = p.annual_price ?? p.monthly_price * 10;
            return (
              <div
                key={p.key}
                className={`rounded-lg border p-5 flex flex-col gap-3 ${
                  isCurrent ? 'border-brand ring-1 ring-brand' : 'border-border-token'
                }`}
              >
                {isCurrent && (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-brand">
                    Plano atual
                  </span>
                )}
                <h2 className="text-base font-bold text-fg-token">{p.name}</h2>
                <p className="text-lg font-semibold text-fg-token">
                  {p.monthly_price === 0 ? (
                    'Grátis'
                  ) : cycle === 'annual' ? (
                    <>
                      R$ {annualPrice.toFixed(2)}
                      <span className="text-sm font-normal text-fg-muted-token">/ano</span>
                    </>
                  ) : (
                    <>
                      R$ {p.monthly_price.toFixed(2)}
                      <span className="text-sm font-normal text-fg-muted-token">/mês</span>
                    </>
                  )}
                </p>
                {cycle === 'annual' && p.monthly_price > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-600">
                    2 meses grátis
                  </span>
                )}
                {p.setup_fee > 0 && (
                  <p className="text-xs text-fg-muted-token">
                    + R$ {p.setup_fee.toFixed(2)} de adesão (única)
                  </p>
                )}
                <button
                  disabled={busy || isCurrent}
                  onClick={() => void handleChange(p)}
                  className="mt-auto w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {isCurrent ? 'Plano atual' : 'Mudar para este'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {invoiceHistory.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-fg-token">Histórico de faturas</h2>
          <ul className="divide-y divide-border-token rounded-lg border border-border-token">
            {invoiceHistory.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"
              >
                <span className="text-fg-token">{inv.period_key ?? '—'}</span>
                <span className="text-fg-muted-token">R$ {inv.amount.toFixed(2)}</span>
                <span className="text-fg-muted-token">{inv.status}</span>
                {inv.paid_at && (
                  <span className="text-xs text-fg-muted-token">
                    pago em {new Date(inv.paid_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sub && sub.status !== 'none' && sub.status !== 'canceled' && (
        <div className="border-t border-border-token pt-4">
          <button
            disabled={busy}
            onClick={() => void handleCancel()}
            className="text-sm text-red-600 underline underline-offset-2 disabled:opacity-50 hover:text-red-700 transition-colors"
          >
            Cancelar assinatura
          </button>
        </div>
      )}
    </div>
  );
}
