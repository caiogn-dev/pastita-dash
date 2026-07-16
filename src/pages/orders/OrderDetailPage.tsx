/**
 * Order Detail Page — full-page route wrapper.
 *
 * The real content + logic lives in <OrderDetailContent />, which is shared with
 * <OrderDetailModal />. This route is kept as a deep-link / print / fallback
 * surface (e.g. opening `/stores/:storeId/orders/:id` directly, or a hard reload
 * with `?pedido=` deep links). Day-to-day the dashboard opens the modal instead.
 */
import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLoading } from '../../components/common';
import { useStore } from '../../hooks';
import { OrderDetailContent } from './OrderDetailContent';

export const OrderDetailPage: React.FC = () => {
  const { id, storeId: routeStoreId } = useParams<{ id: string; storeId?: string }>();
  const navigate = useNavigate();
  const { store, stores } = useStore();

  const storeRouteBase = useMemo(() => {
    if (!routeStoreId) return store?.id || null;
    const match = stores.find(s => s.id === routeStoreId || s.slug === routeStoreId);
    return match?.id || store?.id || null;
  }, [routeStoreId, store?.id, stores]);
  const ordersRoute = storeRouteBase ? `/stores/${storeRouteBase}/orders` : '/stores';

  if (!id) return <PageLoading />;

  return (
    <div className="bg-canvas text-fg-token">
      <div className="mx-auto flex w-full max-w-5xl flex-col pb-16">
        <OrderDetailContent
          orderId={id}
          variant="page"
          onClose={() => navigate(ordersRoute)}
        />
      </div>
    </div>
  );
};

export default OrderDetailPage;
