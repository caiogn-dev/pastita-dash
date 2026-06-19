// src/mobile/screens/MobileNewOrderScreen.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useRootStore } from '../../stores/rootStore';
import { useNewOrderWizard } from '../../components/orders/newOrder/useNewOrderWizard';
import { NewOrderSteps } from '../../components/orders/newOrder/NewOrderSteps';
import { STEP_LABELS } from '../../components/orders/newOrder/types';

export const MobileNewOrderScreen: React.FC = () => {
  const navigate = useNavigate();
  const storeId = useRootStore((s) => s.selectedStoreId);
  const stores = useRootStore((s) => s.stores);
  const slug = stores.find((s) => s.id === storeId)?.slug ?? '';

  const goToOrders = () => navigate('/?tab=pedidos');
  const wiz = useNewOrderWizard({ storeSlug: slug, storeId: storeId ?? undefined, onCreated: goToOrders });

  if (!storeId || !slug) {
    return <div className="p-6 text-center text-fg-muted">Selecione uma loja para criar um pedido.</div>;
  }

  const isLast = wiz.step === 4;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg-secondary text-fg-primary">
      <header className="flex items-center gap-2 border-b border-border-primary bg-bg-card px-3 py-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
        <button type="button" aria-label="Fechar" onClick={goToOrders} className="p-2">
          <XMarkIcon className="h-5 w-5 text-fg-muted" />
        </button>
        <div className="flex-1">
          <div className="text-sm font-semibold text-fg-primary">Novo pedido</div>
          <div className="text-xs text-fg-muted">Passo {wiz.step + 1} de {STEP_LABELS.length}: {STEP_LABELS[wiz.step]}</div>
        </div>
      </header>
      <div className="flex gap-1 px-3 py-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className={`h-1 flex-1 rounded-full ${i <= wiz.step ? 'bg-brand-500' : 'bg-bg-card'}`} />
        ))}
      </div>

      <main className="flex-1 overflow-auto px-3 py-3">
        <NewOrderSteps wiz={wiz} />
      </main>

      <footer className="flex items-center justify-between gap-2 border-t border-border-primary bg-bg-card px-3 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}>
        {wiz.step > 0 ? (
          <button type="button" onClick={wiz.back} className="flex items-center gap-1 rounded-xl border border-border-primary px-4 py-2.5 text-sm text-fg-secondary">
            <ChevronLeftIcon className="h-4 w-4" /> Voltar
          </button>
        ) : <span />}
        {isLast ? (
          <button type="button" disabled={wiz.submitting || !wiz.canProceed()} onClick={wiz.handleSubmit}
            className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {wiz.submitting ? 'Enviando...' : 'Finalizar pedido'}
          </button>
        ) : (
          <button type="button" disabled={!wiz.canProceed()} onClick={wiz.next}
            className="flex items-center gap-1 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            Próximo <ChevronRightIcon className="h-4 w-4" />
          </button>
        )}
      </footer>
    </div>
  );
};
