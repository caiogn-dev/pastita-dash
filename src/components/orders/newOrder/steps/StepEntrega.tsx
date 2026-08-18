import React from 'react';
import type { Customer } from '../types';
import type { UserAddress, RouteQuote } from '../../../../types/crm';
import { fmt } from '../types';
import { TIME_SLOTS } from '../../../../utils/schedulingSlots';

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
  onUseSharedLocation,
  customerHasPhone,
  enableScheduling,
  setEnableScheduling,
  scheduledDate,
  setScheduledDate,
  scheduledTime,
  setScheduledTime,
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
  onCalculateRoute: (address: string, coords?: { lat: number; lng: number } | null) => void;
  onUseSharedLocation: () => void;
  customerHasPhone: boolean;
  enableScheduling: boolean;
  setEnableScheduling: (v: boolean) => void;
  scheduledDate: string;
  setScheduledDate: (v: string) => void;
  scheduledTime: string;
  setScheduledTime: (v: string) => void;
}) {
  const addresses = customer?.addresses ?? [];

  const handleSelectSaved = (addr: UserAddress) => {
    setSelectedAddress(addr);
    const full = `${addr.street}, ${addr.number} — ${addr.neighborhood}, ${addr.city}-${addr.state}`;
    setFreeAddressText(full);
    // Endereço salvo com lat/lng calcula por coordenada (distância real), sem
    // depender de geocodificar o texto montado.
    const coords = addr.lat != null && addr.lng != null ? { lat: addr.lat, lng: addr.lng } : null;
    onCalculateRoute(full, coords);
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
                      <span className="ml-2 text-badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 px-1.5 py-0.5 rounded-full">
                        padrão
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {customerHasPhone && (
            <button
              type="button"
              onClick={() => onUseSharedLocation()}
              disabled={calculatingRoute}
              className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-primary-300 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 text-sm font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 disabled:opacity-50 transition-colors"
            >
              📍 {calculatingRoute ? 'Buscando...' : 'Usar localização enviada no WhatsApp'}
            </button>
          )}

          {/* Endereço livre */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-2">
              Endereço ou localização do cliente
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={freeAddressText}
                onChange={(e) => {
                  setFreeAddressText(e.target.value);
                  setSelectedAddress(null);
                }}
                onBlur={() => {
                  // Auto-calcula ao sair do campo — sem depender de lembrar do
                  // botão. Se colaram o link do Maps, calcula pelo pin.
                  if (freeAddressText.trim() && !routeQuote && !calculatingRoute) {
                    onCalculateRoute(freeAddressText.trim());
                  }
                }}
                placeholder="Endereço, ou cole o link do Google Maps que o cliente enviou"
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
            <p className="mt-1.5 text-xs text-gray-400 dark:text-zinc-500">
              Cole o link de localização do WhatsApp/Maps para calcular a taxa pelo pin exato.
            </p>
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

          {/* Sem taxa calculada, "Avançar" fica travado — o pedido da Ana Paula
              foi enviado com frete 0 justamente por não ter passado por aqui. */}
          {!routeQuote && !calculatingRoute && freeAddressText.trim().length > 0 && (
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Calcule a taxa de entrega para continuar.
            </p>
          )}
        </>
      )}

      {deliveryMethod === 'pickup' && (
        <p className="text-sm text-gray-500 dark:text-zinc-400 py-2">
          O cliente buscará o pedido na loja. Nenhuma taxa de entrega será cobrada.
        </p>
      )}

      {/* Agendamento */}
      <div className="rounded-xl border border-gray-200 dark:border-zinc-700 p-3 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enableScheduling}
            onChange={(e) => setEnableScheduling(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300">📅 Agendar pedido</span>
        </label>

        {enableScheduling && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-2">
                Data
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-2">
                Janela de horário
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setScheduledTime(slot)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                      scheduledTime === slot
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
