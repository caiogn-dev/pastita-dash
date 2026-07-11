/**
 * NewOrderDrawer — PDV: criação manual de pedido em 5 passos
 *
 * Passo 1: Cliente (busca + seleção)
 * Passo 2: Entrega (delivery/pickup + endereço + cálculo de taxa)
 * Passo 3: Itens (busca de produto + carrinho)
 * Passo 4: Ajustes (desconto / acréscimo opcionais)
 * Passo 5: Confirmar (resumo + forma de pagamento + botão criar)
 *
 * NOTA BACKEND: O endpoint POST /stores/{slug}/orders/ é o usado pelo dashboard.
 * Os campos manual_discount_* e surcharge_* dependem das migrações da Fase 1.
 * Enquanto não estiverem prontos, o pedido é criado sem esses campos extras.
 */
import React, { useEffect } from 'react';
import {
  XMarkIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import type { CustomerSearchResult } from '../../types/crm';
import { STEP_LABELS } from './newOrder/types';
import { useNewOrderWizard } from './newOrder/useNewOrderWizard';
import { NewOrderSteps } from './newOrder/NewOrderSteps';

// ── Props ──────────────────────────────────────────────────────────────────────

interface NewOrderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  storeSlug: string;
  /**
   * Store UUID — used for product search via productsService.
   * Falls back to storeSlug if not provided (backend may accept both).
   */
  storeId?: string;
  /** If provided, the drawer opens with this customer pre-filled */
  initialCustomer?: CustomerSearchResult | null;
  /** Called after a successful order creation */
  onOrderCreated?: () => void;
}

// ── Main Drawer ────────────────────────────────────────────────────────────────

export const NewOrderDrawer: React.FC<NewOrderDrawerProps> = ({
  isOpen,
  onClose,
  storeSlug,
  storeId,
  initialCustomer = null,
  onOrderCreated,
}) => {
  const wiz = useNewOrderWizard({
    storeSlug,
    storeId,
    initialCustomer,
    onCreated: () => { onOrderCreated?.(); doClose(); },
  });

  const doClose = () => { wiz.reset(); onClose(); };

  // Sync on open: reset + apply initialCustomer
  useEffect(() => {
    if (isOpen) {
      wiz.reset();
      wiz.setCustomer((initialCustomer ?? null) as never);
    }
  }, [isOpen, initialCustomer]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={doClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-[60] w-full max-w-md flex flex-col bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Novo Pedido (PDV)</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500">
              Passo {wiz.step + 1} de {STEP_LABELS.length}: {STEP_LABELS[wiz.step]}
            </p>
          </div>
          <button
            type="button"
            onClick={doClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator — etapas já visitadas são clicáveis pra voltar direto */}
        <div className="flex px-4 py-2 gap-1 flex-shrink-0">
          {STEP_LABELS.map((label, i) =>
            i < wiz.step ? (
              <button
                key={i}
                type="button"
                aria-label={`Ir para ${label}`}
                title={`Voltar para ${label}`}
                onClick={() => !wiz.submitting && wiz.setStep(i)}
                className="flex-1 h-2 -my-0.5 rounded-full bg-primary-600 hover:bg-primary-500 transition-colors cursor-pointer"
              />
            ) : (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  i <= wiz.step
                    ? 'bg-primary-600'
                    : 'bg-gray-200 dark:bg-zinc-700'
                }`}
              />
            )
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <NewOrderSteps wiz={wiz} />
        </div>

        {/* Footer navigation — Voltar disponível em TODAS as etapas (inclusive
            na confirmação, pra corrigir um item errado antes de criar) */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-zinc-800 flex-shrink-0">
          <button
            type="button"
            onClick={wiz.back}
            disabled={wiz.step === 0 || wiz.submitting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-default transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Voltar
          </button>
          {wiz.step < 4 ? (
            <button
              type="button"
              onClick={wiz.next}
              disabled={!wiz.canProceed()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-default text-white text-sm font-semibold transition-colors"
            >
              Próximo
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={wiz.handleSubmit}
              disabled={wiz.submitting || wiz.cart.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-default text-white text-sm font-semibold transition-colors"
            >
              {wiz.submitting ? 'Criando pedido...' : 'Criar Pedido'}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default NewOrderDrawer;
