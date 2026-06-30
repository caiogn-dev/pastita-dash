/**
 * OnboardingChecklist — card premium "Primeiros passos" no topo do dashboard.
 * Progresso 100% derivado (getChecklist, Fase 2). Some quando all_done.
 * Sem localStorage: o card é o ponto de retomada até a loja ficar pronta.
 * Rotas são domínio do front (buildRouteByKey, derivado de App.tsx).
 */
import { useEffect, useState, type FC, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, Image, ShoppingBag, Truck, Clock, MessageCircle, Store, ArrowRight,
} from 'lucide-react';
import { useStore } from '../../hooks/useStore';
import { getChecklist, type OnboardingChecklist as Checklist, type ChecklistKey } from '../../services/onboarding';
import ProgressRing from './ProgressRing';

const ICON_BY_KEY: Record<ChecklistKey, ComponentType<{ className?: string }>> = {
  account: Store,
  logo: Image,
  product: ShoppingBag,
  delivery: Truck,
  hours: Clock,
  whatsapp: MessageCircle,
};

function buildRouteByKey(storeId: string | null | undefined): Record<ChecklistKey, string> {
  return {
    account: '/',
    product: storeId ? `/stores/${storeId}/products` : '/settings',
    delivery: storeId ? `/stores/${storeId}/delivery` : '/settings',
    hours: storeId ? `/stores/${storeId}/settings` : '/settings',
    logo: storeId ? `/stores/${storeId}/storefront` : '/settings',
    whatsapp: '/connections',
  };
}

const OnboardingChecklist: FC = () => {
  const { store, storeId } = useStore();
  const slug = store?.slug;
  const [data, setData] = useState<Checklist | null>(null);

  useEffect(() => {
    if (!slug) return;
    getChecklist(slug).then(setData).catch(() => { /* silencioso: não quebra o home */ });
  }, [slug]);

  if (!data || data.all_done) return null;

  const routeByKey = buildRouteByKey(storeId);

  return (
    <section
      role="region"
      aria-label="Primeiros passos"
      className="mb-6 overflow-hidden rounded-xl border border-border-token bg-surface-token shadow-sm"
    >
      <header className="flex items-center gap-4 border-b border-border-token px-5 py-4">
        <ProgressRing completed={data.completed} total={data.total} />
        <div>
          <h2 className="text-base font-semibold text-fg-token">Primeiros passos</h2>
          <p className="text-sm text-fg-muted-token">
            Falta pouco pra sua loja vender — complete os passos abaixo.
          </p>
        </div>
      </header>
      <ul className="divide-y divide-border-token">
        {data.steps.map((step) => {
          const Icon = ICON_BY_KEY[step.key];
          const rowBase = 'flex items-center gap-3 px-5 py-3 text-sm';
          if (step.done) {
            return (
              <li key={step.key} className={rowBase}>
                <CheckCircle2 className="h-5 w-5 text-brand" />
                <span className="text-fg-muted-token line-through">{step.label}</span>
              </li>
            );
          }
          return (
            <li key={step.key}>
              <Link
                to={routeByKey[step.key]}
                className={`${rowBase} group transition-colors hover:bg-surface-muted-token`}
              >
                <Icon className="h-5 w-5 text-fg-muted-token group-hover:text-brand" />
                <span className="flex-1 text-fg-token">{step.label}</span>
                <ArrowRight className="h-4 w-4 text-fg-muted-token group-hover:text-brand" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default OnboardingChecklist;
