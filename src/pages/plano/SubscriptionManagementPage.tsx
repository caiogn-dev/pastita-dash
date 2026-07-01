/**
 * SubscriptionManagementPage — gestão de assinatura da loja (rota /assinatura).
 *
 * Exibe o status atual da assinatura, permite trocar de plano (inicia checkout
 * MercadoPago) e cancelar a assinatura com confirmação.
 */
import { useEffect, useState } from 'react';
import { useStore } from '../../hooks/useStore';
import {
  getSubscription,
  cancelSubscription,
  changePlan,
  getPlans,
  type SubscriptionStatus,
  type Plan,
} from '../../services/billing';

const STATUS_LABEL: Record<string, string> = {
  none:      'Sem assinatura',
  trialing:  'Em trial',
  active:    'Ativa',
  past_due:  'Pagamento atrasado',
  suspended: 'Suspensa',
  canceled:  'Cancelada',
};

export default function SubscriptionManagementPage() {
  const { store } = useStore();
  const slug = (store as { slug?: string } | null)?.slug;

  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = sub?.plan === p.key;
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
                R$ {p.monthly_price.toFixed(2)}
                <span className="text-sm font-normal text-fg-muted-token">/mês</span>
              </p>
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
      </section>

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
