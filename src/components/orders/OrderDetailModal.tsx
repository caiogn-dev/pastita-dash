/**
 * OrderDetailModal — dashboard overlay for the order detail.
 *
 * Reads the `?pedido=<id>` search param (via useOrderDetailModal) and renders
 * <OrderDetailContent /> inside the canonical <Modal /> so users inspect and act
 * on an order without leaving the current page (Kanban board, dashboard home).
 *
 * Close behavior is covered on three fronts: Escape and overlay click come from
 * <Modal />; the content's own back button calls closeOrder. Animations reuse
 * the design-system's `animate-fade-in` / `animate-scale-in` (Modal built-ins).
 */
import React, { useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Modal } from '../common';
import { OrderDetailContent } from '../../pages/orders/OrderDetailContent';
import { useOrderDetailModal } from '../../hooks/useOrderDetailModal';
import type { Order } from '../../types';

interface OrderDetailModalProps {
  /**
   * Bubble mutations up so the host surface (board/list) reflects status,
   * payment and edit changes without a full reload.
   */
  onOrderChanged?: (order: Order) => void;
  /**
   * Ids dos pedidos "irmãos" do aberto (ex.: a mesma coluna de status do
   * board), na ordem exibida. Quando presente e o pedido aberto pertence à
   * lista, o modal ganha navegação anterior/próximo + contador — dá pra
   * percorrer a fila sem fechar o modal.
   */
  siblings?: string[];
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ onOrderChanged, siblings }) => {
  const { orderId, openOrder, closeOrder } = useOrderDetailModal();
  // Quando um sub-modal interno (cancelar/editar/Uber) está aberto, suspende o
  // fechamento por Escape / click-fora — senão o Escape fecharia o pedido inteiro
  // (e destruiria a gaveta de edição no meio, perdendo o que foi digitado).
  const [nestedOpen, setNestedOpen] = useState(false);

  // Se o modal fecha por completo, zera o sinal (o conteúdo desmonta sem
  // disparar onNestedOpenChange(false)).
  useEffect(() => {
    if (!orderId) setNestedOpen(false);
  }, [orderId]);

  const siblingIndex = orderId && siblings ? siblings.indexOf(orderId) : -1;
  const hasNav = siblingIndex >= 0 && (siblings?.length ?? 0) > 1;
  const prevId = hasNav && siblingIndex > 0 ? siblings![siblingIndex - 1] : null;
  const nextId = hasNav && siblingIndex < siblings!.length - 1 ? siblings![siblingIndex + 1] : null;

  return (
    <Modal
      open={Boolean(orderId)}
      onClose={closeOrder}
      size="full"
      showCloseButton={false}
      closeOnEscape={!nestedOpen}
      closeOnOverlayClick={!nestedOpen}
      className="!max-w-5xl bg-canvas text-fg-token"
    >
      {orderId && (
        <>
          {hasNav && (
            <div className="flex items-center justify-between gap-3 border-b border-border-token bg-surface px-4 py-2 sm:px-6">
              <button
                type="button"
                onClick={() => prevId && openOrder(prevId)}
                disabled={!prevId}
                className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-sm font-medium text-fg-token transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Pedido anterior"
              >
                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Pedido anterior</span>
              </button>
              <span className="text-xs font-medium tabular-nums text-fg-muted-token" aria-live="polite">
                {siblingIndex + 1} de {siblings!.length}
              </span>
              <button
                type="button"
                onClick={() => nextId && openOrder(nextId)}
                disabled={!nextId}
                className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-sm font-medium text-fg-token transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Próximo pedido"
              >
                <span className="hidden sm:inline">Próximo pedido</span>
                <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            <OrderDetailContent
              orderId={orderId}
              variant="modal"
              onClose={closeOrder}
              onOrderChanged={onOrderChanged}
              onNestedOpenChange={setNestedOpen}
            />
          </div>
        </>
      )}
    </Modal>
  );
};

export default OrderDetailModal;
