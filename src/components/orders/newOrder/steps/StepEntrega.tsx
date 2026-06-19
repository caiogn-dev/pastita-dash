import React from 'react';
import type { Customer } from '../types';
import type { UserAddress, RouteQuote } from '../../../../types/crm';
import { fmt } from '../types';

/** Step 2 */
export function StepEntrega({
  customer,
  deliveryMethod,
  setDeliveryMethod,
  selectedAddress,
  setSelectedAddress,
  freeAddressText,
  setFreeAddressText,
  routeQuote,
  calculatingRoute,
  onCalculateRoute,
}: {
  customer: Customer | null;
  deliveryMethod: 'delivery' | 'pickup';
  setDeliveryMethod: (m: 'delivery' | 'pickup') => void;
  selectedAddress: UserAddress | null;
  setSelectedAddress: (a: UserAddress | null) => void;
  freeAddressText: string;
  setFreeAddressText: (v: string) => void;
  routeQuote: RouteQuote | null;
  calculatingRoute: boolean;
  onCalculateRoute: (address: string) => void;
}) {
  const addresses = customer?.addresses ?? [];

  const handleSelectSaved = (addr: UserAddress) => {
    setSelectedAddress(addr);
    const full = `${addr.street}, ${addr.number} — ${addr.neighborhood}, ${addr.city}-${addr.state}`;
    setFreeAddressText(full);
    onCalculateRoute(full);
  };

  return (
    <div className="space-y-4">
      {/* Radio: Entrega / Retirada */}
      <div className="flex gap-2">
        {(['delivery', 'pickup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setDeliveryMethod(m)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              deliveryMethod === m
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
            }`}
          >
            {m === 'delivery' ? '🚚 Entrega' : '🏠 Retirada'}
          </button>
        ))}
      </div>

      {deliveryMethod === 'delivery' && (
        <>
          {/* Endereços salvos */}
          {addresses.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-2">
                Endereços do cliente
              </label>
              <div className="space-y-1.5">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelectSaved(addr)}
                    className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
                      selectedAddress?.id === addr.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="font-semibold">{addr.label}</span>: {addr.street}, {addr.number} — {addr.neighborhood}, {addr.city}
                    {addr.is_default && (
                      <span className="ml-2 text-[10px] bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 px-1.5 py-0.5 rounded-full">
                        padrão
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Endereço livre */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-2">
              Ou digitar endereço
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={freeAddressText}
                onChange={(e) => {
                  setFreeAddressText(e.target.value);
                  setSelectedAddress(null);
                }}
                placeholder="Rua das Flores, 123, Palmas-TO"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              <button
                type="button"
                disabled={!freeAddressText.trim() || calculatingRoute}
                onClick={() => onCalculateRoute(freeAddressText.trim())}
                className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {calculatingRoute ? 'Calc...' : 'Calcular'}
              </button>
            </div>
          </div>

          {/* Resultado da rota */}
          {routeQuote && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Taxa de entrega
                </span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {fmt(routeQuote.fee)}
                </span>
              </div>
              {routeQuote.distance_km != null && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {Number(routeQuote.distance_km).toFixed(1)} km
                  {routeQuote.duration_minutes != null &&
                    ` · ~${Math.round(Number(routeQuote.duration_minutes))} min`}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {deliveryMethod === 'pickup' && (
        <p className="text-sm text-gray-500 dark:text-zinc-400 py-2">
          O cliente buscará o pedido na loja. Nenhuma taxa de entrega será cobrada.
        </p>
      )}
    </div>
  );
}
