/**
 * PlanoPage — planos do SaaS (rota protegida /plano).
 *
 * Mostra o plano ATUAL da loja selecionada + o catálogo de 3 planos
 * (starter/pro/premium), destacando o atual.
 *
 * IMPORTANTE: pagamento (MercadoPago) ainda NÃO existe. O botão "Assinar" é
 * placeholder — dispara um toast "Cobrança em breve" e não inicia checkout.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { PageTitle, Button, Card, SkeletonCard, EmptyState } from '../../components/common';
import { useStore } from '../../hooks/useStore';
import { formatCurrency } from '../../utils/formatters';
import {
  getPlans,
  subscribe,
  getStoreBilling,
  trialDaysRemaining,
  type Plan,
  type PlanKey,
  type PlanLimits,
} from '../../services/billing';

/** Ordem visual canônica dos planos. */
const PLAN_ORDER: PlanKey[] = ['starter', 'pro', 'premium'];

/** Plano destacado como recomendado quando não há plano atual. */
const RECOMMENDED_PLAN: PlanKey = 'pro';

interface FeatureRow {
  label: string;
  /** Lê o valor do recurso a partir dos limites do plano. */
  value: (limits: PlanLimits) => React.ReactNode;
}

const FEATURE_ROWS: FeatureRow[] = [
  {
    label: 'Produtos no cardápio',
    value: (l) => (l.max_products === null ? 'Ilimitados' : `Até ${l.max_products}`),
  },
  { label: 'Domínio próprio', value: (l) => l.custom_domain },
  { label: 'Bot de WhatsApp', value: (l) => l.whatsapp_bot },
  { label: 'Agente de IA', value: (l) => l.ai_agent },
];

function FeatureValue({ value }: { value: React.ReactNode }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1 text-fg-token">
        <CheckIcon className="w-4 h-4 text-brand" aria-hidden="true" />
        <span className="sr-only">Incluído</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1 text-fg-muted-token">
        <XMarkIcon className="w-4 h-4" aria-hidden="true" />
        <span className="sr-only">Não incluído</span>
      </span>
    );
  }
  return <span className="text-sm font-medium text-fg-token">{value}</span>;
}

function PlanCard({
  plan,
  isCurrent,
  isRecommended,
  onSubscribe,
}: {
  plan: Plan;
  isCurrent: boolean;
  isRecommended: boolean;
  onSubscribe: (plan: Plan) => void;
}) {
  const highlight = isCurrent || isRecommended;

  return (
    <Card
      noPadding
      className={`relative flex flex-col overflow-hidden ${
        highlight ? 'border-brand ring-1 ring-brand' : ''
      }`}
    >
      {(isCurrent || isRecommended) && (
        <div
          className={`flex items-center justify-center gap-1 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            isCurrent ? 'bg-brand text-white' : 'bg-brand-soft text-brand'
          }`}
        >
          {isCurrent ? (
            <>
              <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" /> Plano atual
            </>
          ) : (
            <>
              <SparklesIcon className="w-3.5 h-3.5" aria-hidden="true" /> Recomendado
            </>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-fg-token">{plan.name}</h3>

        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-fg-token">
            {formatCurrency(plan.monthly_price)}
          </span>
          <span className="text-sm text-fg-muted-token">/mês</span>
        </div>
        <p className="mt-1 text-xs text-fg-muted-token">
          {plan.setup_fee > 0
            ? `+ ${formatCurrency(plan.setup_fee)} de adesão (única)`
            : 'Sem taxa de adesão'}
        </p>

        <ul className="mt-5 flex-1 space-y-3 border-t border-border-token pt-4">
          {FEATURE_ROWS.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-fg-muted-token">{row.label}</span>
              <FeatureValue value={row.value(plan.limits)} />
            </li>
          ))}
        </ul>

        <div className="mt-5">
          {isCurrent ? (
            <Button variant="outline" fullWidth isDisabled>
              Plano atual
            </Button>
          ) : (
            <Button
              variant={highlight ? 'primary' : 'outline'}
              fullWidth
              onClick={() => onSubscribe(plan)}
            >
              Assinar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export const PlanoPage: React.FC = () => {
  const { store, isStoreSelected } = useStore();
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const billing = getStoreBilling(store);
  const currentPlanKey = billing.plan ?? null;
  const daysLeft = trialDaysRemaining(billing.trial_ends_at);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPlans();
      setPlans(data);
    } catch {
      setError('Não foi possível carregar os planos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const [subscribing, setSubscribing] = React.useState<PlanKey | null>(null);

  const handleSubscribe = React.useCallback(async (plan: Plan) => {
    if (subscribing) return; // anti-duplo-clique (evita 2 preapprovals)
    const slug = (store as { slug?: string } | null)?.slug;
    if (!slug) {
      toast.error('Selecione uma loja primeiro.');
      return;
    }
    setSubscribing(plan.key);
    try {
      const { init_point } = await subscribe(slug, plan.key);
      if (init_point) {
        // Redireciona pro checkout MercadoPago (dono autoriza o cartão lá).
        window.location.href = init_point;
      } else {
        toast.error('Não foi possível iniciar a assinatura.');
      }
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'Falha ao iniciar a assinatura. Tente novamente.');
    } finally {
      setSubscribing(null);
    }
  }, [store]);

  // Ordena starter → pro → premium; planos desconhecidos vão para o fim.
  const orderedPlans = React.useMemo(() => {
    return [...plans].sort((a, b) => {
      const ia = PLAN_ORDER.indexOf(a.key);
      const ib = PLAN_ORDER.indexOf(b.key);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [plans]);

  const currentPlan = orderedPlans.find((p) => p.key === currentPlanKey) ?? null;
  const hasCurrentPlan = Boolean(currentPlan);

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle
        title="Planos e assinatura"
        subtitle="Escolha o plano ideal para a sua loja."
      />

      {/* Faixa de status atual: plano atual + trial */}
      <Card className="mb-6 flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-fg-muted-token">
            Plano atual
          </span>
          <span className="text-lg font-bold text-fg-token">
            {currentPlan ? currentPlan.name : currentPlanKey ? currentPlanKey : 'Trial / sem plano'}
          </span>
        </div>
        {daysLeft !== null && daysLeft > 0 && (
          <div className="inline-flex items-center gap-2 rounded bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand">
            <ClockIcon className="w-4 h-4" aria-hidden="true" />
            {daysLeft === 1 ? 'Falta 1 dia' : `Faltam ${daysLeft} dias`} de trial
          </div>
        )}
      </Card>

      {!isStoreSelected && (
        <Card className="mb-6 p-4 text-sm text-fg-muted-token">
          Selecione uma loja no menu superior para ver o plano e o trial vinculados a ela.
        </Card>
      )}

      {/* Catálogo */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <EmptyState
          icon={<ArrowPathIcon className="w-8 h-8 text-fg-muted-token" />}
          title="Erro ao carregar planos"
          description={error}
          action={{ label: 'Tentar novamente', onClick: () => void load() }}
        />
      ) : orderedPlans.length === 0 ? (
        <EmptyState
          title="Nenhum plano disponível"
          description="Os planos ainda não foram publicados. Volte mais tarde."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orderedPlans.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              isCurrent={plan.key === currentPlanKey}
              isRecommended={!hasCurrentPlan && plan.key === RECOMMENDED_PLAN}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-fg-muted-token">
        Pagamento online em breve. Precisa de ajuda para escolher?{' '}
        <Link to="/stores" className="text-brand hover:underline">
          Fale com a gente
        </Link>
        .
      </p>
    </div>
  );
};

export default PlanoPage;
