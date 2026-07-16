/**
 * TrialBanner — faixa de aviso de trial/suspensão no topo do painel.
 *
 * Prioridade de exibição:
 *  1. Rebaixado para o Grátis por falta de pagamento (downgraded_for_nonpayment)
 *     → faixa vermelha NÃO-dismissível com CTA de reativação.
 *  2. Loja suspensa (status=suspended) → faixa vermelha com CTA de reativação.
 *  3. Pagamento atrasado (status=past_due) → faixa âmbar com CTA de regularização.
 *  4. Trial ativo → faixa de contagem regressiva (comportamento original).
 *  5. Caso contrário → nada (retorna null).
 *
 * Integrado no MainLayout, logo abaixo da Navbar.
 */
import { useState, useEffect, type FC } from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useStore } from '../../hooks/useStore';
import {
  getStoreBilling,
  trialDaysRemaining,
  getSubscription,
  type SubscriptionStatus,
} from '../../services/billing';

/** Chave de sessionStorage para o dismiss (volta a aparecer em novo acesso). */
const DISMISS_KEY = 'trial-banner-dismissed';

export const TrialBanner: FC = () => {
  const { store } = useStore();
  const slug = (store as { slug?: string } | null)?.slug ?? null;

  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === store?.id;
    } catch {
      return false;
    }
  });

  const [subStatus, setSubStatus] = useState<SubscriptionStatus['status'] | null>(null);
  const [downgraded, setDowngraded] = useState<boolean>(false);
  const [subPlan, setSubPlan] = useState<SubscriptionStatus['plan']>(undefined);

  const { trial_ends_at } = getStoreBilling(store);
  const daysLeft = trialDaysRemaining(trial_ends_at);

  // Reabilita o banner de trial se o usuário trocou de loja.
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === store?.id);
    } catch {
      setDismissed(false);
    }
  }, [store?.id]);

  // Busca o status da assinatura para detectar suspended/past_due.
  useEffect(() => {
    if (!slug) return;
    getSubscription(slug)
      .then((s) => {
        setSubStatus(s.status);
        setDowngraded(s.downgraded_for_nonpayment === true);
        setSubPlan(s.plan ?? undefined);
      })
      .catch(() => {/* ignora erros silenciosamente */});
  }, [slug]);

  // --- Rebaixado para o plano Grátis por falta de pagamento: faixa vermelha
  //     NÃO-dismissível com CTA de reativação (maior prioridade). ---
  if (downgraded) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex items-center gap-3 px-4 py-2 text-sm bg-red-600 text-white border-b border-red-700 max-sm:px-3"
      >
        <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <p className="flex-1 min-w-0 leading-tight">
          <span className="font-semibold">Você voltou pro plano Grátis por falta de pagamento.</span>
          <span className="max-sm:hidden">
            {' '}
            Reative {subPlan ? `o ${subPlan}` : 'seu plano'} pra recuperar seus recursos.
          </span>
        </p>
        <Link
          to="/assinatura"
          className="flex-shrink-0 rounded bg-surface px-3 py-1 text-xs font-semibold text-danger-token transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1"
        >
          Reativar
        </Link>
      </div>
    );
  }

  // --- Loja suspensa: faixa vermelha com CTA de reativação ---
  if (subStatus === 'suspended') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex items-center gap-3 px-4 py-2 text-sm bg-red-600 text-white border-b border-red-700 max-sm:px-3"
      >
        <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <p className="flex-1 min-w-0 leading-tight">
          <span className="font-semibold">Loja suspensa</span>
          <span className="max-sm:hidden"> — regularize o pagamento para reativar.</span>
        </p>
        <Link
          to="/assinatura"
          className="flex-shrink-0 rounded bg-surface px-3 py-1 text-xs font-semibold text-danger-token transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1"
        >
          Reativar
        </Link>
      </div>
    );
  }

  // --- Pagamento atrasado: faixa âmbar com CTA de regularização ---
  if (subStatus === 'past_due') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex items-center gap-3 px-4 py-2 text-sm bg-amber-500 text-white border-b border-amber-600 max-sm:px-3"
      >
        <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <p className="flex-1 min-w-0 leading-tight">
          <span className="font-semibold">Pagamento atrasado</span>
          <span className="max-sm:hidden"> — regularize para evitar a suspensão da loja.</span>
        </p>
        <Link
          to="/assinatura"
          className="flex-shrink-0 rounded bg-surface px-3 py-1 text-xs font-semibold text-warning-token transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1"
        >
          Regularize
        </Link>
      </div>
    );
  }

  // Sem trial ativo (null) ou expirado (0) → nada a mostrar.
  if (daysLeft === null || daysLeft <= 0 || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      if (store?.id) sessionStorage.setItem(DISMISS_KEY, store.id);
    } catch {
      /* ignore storage errors */
    }
  };

  const dayLabel = daysLeft === 1 ? 'dia' : 'dias';

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 px-4 py-2 text-sm bg-brand-soft text-brand border-b border-border-token max-sm:px-3"
    >
      <ClockIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <p className="flex-1 min-w-0 leading-tight">
        <span className="font-semibold">
          {daysLeft === 1 ? 'Falta' : 'Faltam'} {daysLeft} {dayLabel} de trial
        </span>
        <span className="max-sm:hidden"> — escolha um plano para continuar usando.</span>
      </p>
      <Link
        to="/plano"
        className="flex-shrink-0 rounded bg-brand px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
      >
        Ver planos
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dispensar aviso de trial"
        className="flex-shrink-0 rounded p-1 text-brand/70 transition-colors hover:bg-brand/10 hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <XMarkIcon className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default TrialBanner;
