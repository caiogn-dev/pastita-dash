/**
 * Route-based order-detail modal state, backed by the `?pedido=<id>` search
 * param. This keeps the open modal in the URL so it supports deep linking and
 * the browser back button (back removes the param → modal closes), while never
 * triggering a full page navigation. Other params (e.g. `?status=`) are
 * preserved via the functional updater.
 */
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const PARAM = 'pedido';

export interface UseOrderDetailModal {
  /** Currently open order id, or null when the modal is closed. */
  orderId: string | null;
  /** Open the modal for an order (adds `?pedido=<id>`). */
  openOrder: (id: string) => void;
  /** Close the modal (removes `?pedido`). */
  closeOrder: () => void;
}

export function useOrderDetailModal(): UseOrderDetailModal {
  const [searchParams, setSearchParams] = useSearchParams();
  const orderId = searchParams.get(PARAM);

  const openOrder = useCallback((id: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(PARAM, id);
        return next;
      },
      { replace: false },
    );
  }, [setSearchParams]);

  const closeOrder = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(PARAM);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return { orderId, openOrder, closeOrder };
}

export default useOrderDetailModal;
