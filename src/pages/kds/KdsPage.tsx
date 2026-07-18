import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useRootStore } from '../../stores/rootStore';
import { useRealTimeOrders } from '../../hooks/useRealTimeOrders';
import { updateOrderStatus, getOrders } from '../../services/storesApi';
import type { StoreOrder } from '../../services/storesApi';
import { KDS_COLUMNS, groupKdsOrders } from './kdsColumns';
import { getStageStart } from '../orders/orderSla';
import { Skeleton } from '../../components/ui';

const EMPTY_ORDERS: StoreOrder[] = [];

const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  todo: { status: 'preparing', label: 'Iniciar preparo' },
  preparing: { status: 'ready', label: 'Pronto!' },
  ready: { status: 'out_for_delivery', label: 'Saiu / Entregue' },
};

/**
 * Estilo por coluna — tokens do tema (Dark Luxe):
 * pendente = warning, em preparo = marca (ouro), pronto = success.
 * Botões: ação de cozinha = ouro sólido (principal); despacho = secundário.
 */
const COLUMN_STYLES: Record<string, { header: string; button: string }> = {
  todo: {
    header: 'bg-[var(--warning-soft)] text-warning-token',
    button: 'bg-brand text-white hover:bg-brand-hover',
  },
  preparing: {
    header: 'bg-brand-soft text-brand',
    button: 'bg-brand text-white hover:bg-brand-hover',
  },
  ready: {
    header: 'bg-[var(--success-soft)] text-success-token',
    button:
      'bg-surface-2 text-fg-token border-2 border-border-strong hover:bg-brand-soft hover:text-brand',
  },
};

const elapsedMinutes = (iso: string, now: number) =>
  Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

/** KDS — tela de cozinha fullscreen com fonte grande e atualização em tempo real. */
const KdsPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const [now, setNow] = useState(() => Date.now());
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const storeOrders = useRootStore(
    (s) => (storeId ? s.orders[storeId] : undefined),
  ) ?? EMPTY_ORDERS;

  useRealTimeOrders({
    enabled: Boolean(storeId),
    apiUrl: import.meta.env.VITE_API_URL,
    // Base only: o client já monta /ws/stores/<slug>/orders/ — passar o path
    // aqui duplicava o caminho (e "undefined/..." quando a env não existia).
    wsUrl: import.meta.env.VITE_WS_URL,
  });

  // Carga inicial (o WebSocket só entrega eventos novos)
  useEffect(() => {
    if (!storeId) return undefined;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    getOrders({ store: storeId })
      .then((response) => {
        if (cancelled) return;
        useRootStore.getState().setOrders(storeId, response.results);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, reloadKey]);

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

  const handleRetry = useCallback(() => setReloadKey((k) => k + 1), []);

  return (
    <div className="min-h-screen bg-canvas text-fg-token p-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold uppercase tracking-widest text-fg-token">
          Cozinha — {storeId}
        </h1>
        <span className="text-sm font-semibold text-fg-muted-token" aria-live="polite">
          {loading
            ? 'Carregando…'
            : `${grouped.todo.length + grouped.preparing.length + grouped.ready.length} pedidos ativos`}
        </span>
      </header>

      {loadError && !loading && (
        <div
          role="alert"
          className="mb-4 rounded-2xl border-2 border-[var(--danger)] bg-[var(--danger-soft)] p-6 text-center"
        >
          <p className="text-lg font-bold text-danger-token mb-3">
            Erro ao carregar pedidos
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 text-lg font-bold text-white transition-colors hover:bg-brand-hover"
          >
            <ArrowPathIcon className="h-5 w-5" aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
        {KDS_COLUMNS.map((col) => (
          <section
            key={col.id}
            aria-label={col.label}
            aria-busy={loading}
            className="rounded-2xl bg-surface border border-border-token p-3 min-h-[70vh]"
          >
            <h2
              className={[
                'text-center text-sm font-bold uppercase tracking-widest py-2 rounded-xl mb-3',
                COLUMN_STYLES[col.id]?.header ?? 'bg-surface-2 text-fg-token',
              ].join(' ')}
            >
              {col.label} ({grouped[col.id].length})
            </h2>

            <div className="flex flex-col gap-3">
              {loading && grouped[col.id].length === 0 ? (
                <Skeleton variant="card" count={2} />
              ) : (
                <>
                  {grouped[col.id].map((order) => {
                    const minutes = elapsedMinutes(getStageStart(order), now);
                    const urgent = minutes >= 20;
                    return (
                      <article
                        key={order.id}
                        className={[
                          'rounded-xl bg-surface-2 p-4 border-2',
                          urgent
                            ? 'border-[var(--danger)] animate-pulse'
                            : 'border-border-token',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-black text-fg-token">
                            #{order.order_number?.slice(-4) || '—'}
                          </span>
                          <span
                            className={`text-lg font-bold ${
                              urgent ? 'text-danger-token' : 'text-fg-muted-token'
                            }`}
                          >
                            {minutes}min
                          </span>
                        </div>

                        <ul className="space-y-1 mb-3">
                          {(order.items || []).map((item) => {
                            // Seleções do combo (saladas/sabores) ligadas a esta linha
                            const combo = (order.combo_items || []).find(
                              (c) => c.order_item === item.id,
                            );
                            const comboPicks = combo?.selected_variants_data || [];
                            return (
                              <li key={item.id} className="text-lg leading-snug text-fg-token">
                                <span className="font-bold">{item.quantity}×</span>{' '}
                                {item.product_name}
                                {item.variant_name ? ` (${item.variant_name})` : ''}
                                {comboPicks.map((sv, i) => (
                                  <span key={i} className="block text-base pl-6 text-success-token">
                                    {(sv.quantity ?? 1)}× {sv.product_name || sv.variant_name}
                                    {sv.group_name ? ` — ${sv.group_name}` : ''}
                                  </span>
                                ))}
                                {item.notes && (
                                  <p className="text-sm font-semibold text-warning-token pl-6">
                                    Obs.: {item.notes}
                                  </p>
                                )}
                              </li>
                            );
                          })}
                        </ul>

                        {order.customer_notes && (
                          <p className="text-sm font-semibold text-warning-token mb-3">
                            Pedido: {order.customer_notes}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => handleAdvance(order, col.id)}
                          disabled={advancing === order.id}
                          className={[
                            'w-full py-3 rounded-lg text-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                            COLUMN_STYLES[col.id]?.button ?? 'bg-brand text-white hover:bg-brand-hover',
                          ].join(' ')}
                        >
                          {NEXT_STATUS[col.id].label}
                        </button>
                      </article>
                    );
                  })}
                  {grouped[col.id].length === 0 && (
                    <p className="text-center text-fg-muted-token py-8 text-sm">
                      {loadError ? '—' : 'Sem pedidos'}
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default KdsPage;
