/**
 * Example: Orders page with real-time WebSocket updates
 * 
 * Shows how to integrate useRealTimeOrders hook into a page
 */

import { useEffect } from 'react';
import { useRootStore } from '../../stores/rootStore';
import { useRealTimeOrders } from '../../hooks/useRealTimeOrders';

export function OrdersPageWithRealTime() {
  const { selectedStoreId, orders } = useRootStore();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

  // Initialize real-time updates
  const { isConnected, reconnect, refreshOrders } = useRealTimeOrders({
    enabled: true,
    apiUrl,
    wsUrl,
  });

  // Fetch initial orders on mount
  useEffect(() => {
    refreshOrders();
  }, [selectedStoreId]);

  if (!selectedStoreId) {
    return <div>No store selected</div>;
  }

  const storeOrders = orders[selectedStoreId] || [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Orders</h1>
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Live' : 'Offline'}
          </span>
          {!isConnected && (
            <button
              onClick={reconnect}
              className="ml-4 px-3 py-1 bg-blue-500 text-white rounded text-sm"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {storeOrders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No orders yet
        </div>
      ) : (
        <div className="grid gap-4">
          {storeOrders.map((order: any) => (
            <div
              key={order.id}
              className="border rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">
                    Order #{order.order_number}
                  </h3>
                  <p className="text-gray-600">{order.customer_name}</p>
                  <p className="text-sm text-gray-500">{order.customer_phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">R$ {order.total}</p>
                  <span
                    className={`inline-block px-3 py-1 rounded text-sm font-medium mt-2 ${
                      order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : order.status === 'confirmed'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'delivered'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Real-time indicator */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
        <p>
          💡 <strong>Real-time updates enabled</strong> — Changes appear instantly
          as customers place orders or statuses update.
        </p>
      </div>
    </div>
  );
}
