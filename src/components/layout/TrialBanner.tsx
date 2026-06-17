/**
 * TrialBanner — faixa de aviso de trial no topo do painel.
 *
 * Renderiza SOMENTE quando a loja selecionada tem `trial_ends_at` no futuro.
 * Se não houver trial (campo ausente/null) ou já expirou, não renderiza nada
 * (retorna null) — não ocupa espaço nem quebra o layout.
 *
 * Integrado no MainLayout, logo abaixo da Navbar.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useStore } from '../../hooks/useStore';
import { getStoreBilling, trialDaysRemaining } from '../../services/billing';

/** Chave de sessionStorage para o dismiss (volta a aparecer em novo acesso). */
const DISMISS_KEY = 'trial-banner-dismissed';

export const TrialBanner: React.FC = () => {
  const { store } = useStore();
  const [dismissed, setDismissed] = React.useState<boolean>(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === store?.id;
    } catch {
      return false;
    }
  });

  const { trial_ends_at } = getStoreBilling(store);
  const daysLeft = trialDaysRemaining(trial_ends_at);

  // Reabilita o banner se o usuário trocou de loja.
  React.useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === store?.id);
    } catch {
      setDismissed(false);
    }
  }, [store?.id]);

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
      className="z-30 flex items-center gap-3 px-4 py-2 text-sm bg-brand-soft text-brand border-b border-border-token max-sm:px-3"
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
