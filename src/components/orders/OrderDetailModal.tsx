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
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ onOrderChanged }) => {
  const { orderId, closeOrder } = useOrderDetailModal();
  // Quando um sub-modal interno (cancelar/editar/Uber) está aberto, suspende o
  // fechamento por Escape / click-fora — senão o Escape fecharia o pedido inteiro
  // (e destruiria a gaveta de edição no meio, perdendo o que foi digitado).
  const [nestedOpen, setNestedOpen] = useState(false);

  // Se o modal fecha por completo, zera o sinal (o conteúdo desmonta sem
  // disparar onNestedOpenChange(false)).
  useEffect(() => {
    if (!orderId) setNestedOpen(false);
  }, [orderId]);

  return (
    <Modal
      open={Boolean(orderId)}
      onClose={closeOrder}
      size="full"
      showCloseButton={false}
      closeOnEscape={!nestedOpen}
      closeOnOverlayClick={!nestedOpen}
      className="!max-w-[1400px] bg-canvas text-fg-token"
    >
      {orderId && (
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <OrderDetailContent
            orderId={orderId}
            variant="modal"
            onClose={closeOrder}
            onOrderChanged={onOrderChanged}
            onNestedOpenChange={setNestedOpen}
          />
        </div>
      )}
    </Modal>
  );
};

export default OrderDetailModal;
