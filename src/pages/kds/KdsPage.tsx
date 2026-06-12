import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useRootStore } from '../../stores/rootStore';
import { useRealTimeOrders } from '../../hooks/useRealTimeOrders';
import { updateOrderStatus, getOrders } from '../../services/storesApi';
import type { StoreOrder } from '../../services/storesApi';
import { KDS_COLUMNS, groupKdsOrders } from './kdsColumns';
import { getStageStart } from '../orders/orderSla';

const EMPTY_ORDERS: StoreOrder[] = [];

const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  todo: { status: 'preparing', label: 'Iniciar preparo' },
  preparing: { status: 'ready', label: 'Pronto!' },
  ready: { status: 'out_for_delivery', label: 'Saiu / Entregue' },
};

const elapsedMinutes = (iso: string, now: number) =>
  Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

/** KDS — tela de cozinha fullscreen com fonte grande e atualização em tempo real. */
const KdsPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const [now, setNow] = useState(() => Date.now());
  const [advancing, setAdvancing] = useState<string | null>(null);

  const storeOrders = useRootStore(
    (s) => (storeId ? s.orders[storeId] : undefined),
  ) ?? EMPTY_ORDERS;

  useRealTimeOrders({
    enabled: Boolean(storeId),
    apiUrl: import.meta.env.VITE_API_URL,
    wsUrl: `${import.meta.env.VITE_WS_URL}/stores/${storeId}/orders/`,
  });

  // Carga inicial (o WebSocket só entrega eventos novos)
  useEffect(() => {
    if (!storeId) return;
    getOrders({ store: storeId })
      .then((response) => {
        useRootStore.getState().setOrders(storeId, response.results);
      })
      .catch(() => toast.error('Erro ao carregar pedidos'));
  }, [storeId]);

  // Relógio dos cards (minuto a minuto)
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const grouped = useMemo(() => groupKdsOrders(storeOrders), [storeOrders]);

  const handleAdvance = useCallback(async (order: StoreOrder, columnId: string) => {
    const next = NEXT_STATUS[columnId];
    if (!next || advancing) return;
    setAdvancing(order.id);
    try {
      await updateOrderStatus(order.id, next.status);
      // Otimista: atualizar a store local imediatamente
      const { orders, setOrders } = useRootStore.getState();
      const current = orders[storeId as string] || [];
      setOrders(storeId as string, current.map((o: StoreOrder) =>
        o.id === order.id ? { ...o, status: next.status } : o,
      ));
    } catch {
      toast.error('Erro ao atualizar pedido');
    } finally {
      setAdvancing(null);
    }
  }, [advancing, storeId]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold uppercase tracking-widest text-zinc-300">
          Cozinha — {storeId}
        </h1>
        <span className="text-sm text-zinc-500">
          {grouped.todo.length + grouped.preparing.length + grouped.ready.length} pedidos ativos
        </span>
      </header>

      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
        {KDS_COLUMNS.map((col) => (
          <section key={col.id} className="rounded-2xl bg-zinc-900 p-3 min-h-[70vh]">
            <h2 className={[
              'text-center text-sm font-bold uppercase tracking-widest py-2 rounded-xl mb-3',
              col.id === 'todo' ? 'bg-blue-600' : col.id === 'preparing' ? 'bg-orange-600' : 'bg-emerald-600',
            ].join(' ')}>
              {col.label} ({grouped[col.id].length})
            </h2>

            <div className="flex flex-col gap-3">
              {grouped[col.id].map((order) => {
                const minutes = elapsedMinutes(getStageStart(order), now);
                const urgent = minutes >= 20;
                return (
                  <article
                    key={order.id}
                    className={[
                      'rounded-xl bg-zinc-800 p-4 border-2',
                      urgent ? 'border-red-500 animate-pulse' : 'border-transparent',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-black">#{order.order_number?.slice(-4) || '—'}</span>
                      <span className={`text-lg font-bold ${urgent ? 'text-red-400' : 'text-zinc-400'}`}>
                        {minutes}min
                      </span>
                    </div>

                    <ul className="space-y-1 mb-3">
                      {(order.items || []).map((item) => (
                        <li key={item.id} className="text-lg leading-snug">
                          <span className="font-bold">{item.quantity}×</span>{' '}
                          {item.product_name}
                          {item.variant_name ? ` (${item.variant_name})` : ''}
                          {item.notes && (
                            <p className="text-sm text-amber-400 pl-6">Obs.: {item.notes}</p>
                          )}
                        </li>
                      ))}
                    </ul>

                    {order.customer_notes && (
                      <p className="text-sm text-amber-400 mb-3">Pedido: {order.customer_notes}</p>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAdvance(order, col.id)}
                      disabled={advancing === order.id}
                      className={[
                        'w-full py-3 rounded-lg text-lg font-bold transition-colors disabled:opacity-50',
                        col.id === 'todo' ? 'bg-orange-600 hover:bg-orange-500'
                          : col.id === 'preparing' ? 'bg-emerald-600 hover:bg-emerald-500'
                          : 'bg-indigo-600 hover:bg-indigo-500',
                      ].join(' ')}
                    >
                      {NEXT_STATUS[col.id].label}
                    </button>
                  </article>
                );
              })}
              {grouped[col.id].length === 0 && (
                <p className="text-center text-zinc-600 py-8 text-sm">Vazio</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default KdsPage;
