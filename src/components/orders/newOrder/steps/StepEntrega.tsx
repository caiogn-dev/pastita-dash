import React from 'react';
import type { Customer } from '../types';
import type { UserAddress, RouteQuote } from '../../../../types/crm';
import { fmt } from '../types';
import { TIME_SLOTS } from '../../../../utils/schedulingSlots';
import { rotuloDoEndereco } from '../enderecoDoPedido';

/** Step 2 */
export function StepEntrega({
  customer,
  deliveryMethod,
  setDeliveryMethod,
  selectedAddress,
  setSelectedAddress,
  escolherEnderecoSalvo,
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
  escolherEnderecoSalvo: (a: UserAddress) => void;
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
    // Ação própria: guarda os CAMPOS e escreve o rótulo. Passar pelo
    // `setFreeAddressText` (o caminho de digitar) descartaria o endereço salvo.
    escolherEnderecoSalvo(addr);
    // Só o TEXTO de exibição/cotação. O que vai no pedido é o endereço
    // estruturado — ver `enderecoParaOPedido`.
    const full = rotuloDoEndereco(addr);
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
                ? 'bg-brand border-brand text-on-brand'
                : 'border-border-token text-fg-token hover:bg-surface-2'
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
              <label className="block text-xs font-semibold uppercase tracking-widest text-fg-muted-token mb-2">
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
                        ? 'border-brand bg-brand-soft text-brand-ink'
                        : 'border-border-token text-fg-token hover:bg-surface-2'
                    }`}
                  >
                    <span className="font-semibold">{addr.label}</span>: {rotuloDoEndereco(addr)}
                    {addr.is_default && (
                      <span className="ml-2 text-badge bg-brand-soft text-brand-ink px-1.5 py-0.5 rounded-full">
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
              className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-brand bg-brand-soft text-sm font-semibold text-brand-ink hover:bg-brand-soft disabled:opacity-50 transition-colors"
            >
              📍 {calculatingRoute ? 'Buscando...' : 'Usar localização enviada no WhatsApp'}
            </button>
          )}

          {/* Endereço livre */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-fg-muted-token mb-2">
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
                className="flex-1 px-3 py-2 rounded-xl border border-border-token bg-surface text-sm text-fg-token placeholder:text-fg-muted-token focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <button
                type="button"
                disabled={!freeAddressText.trim() || calculatingRoute}
                onClick={() => onCalculateRoute(freeAddressText.trim())}
                className="px-3 py-2 rounded-xl bg-surface-2 text-sm font-semibold text-fg-token hover:bg-surface-2 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {calculatingRoute ? 'Calc...' : 'Calcular'}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-fg-muted-token">
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
                    `· ~${Math.round(Number(routeQuote.duration_minutes))} min`}
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
        <p className="text-sm text-fg-muted-token py-2">
          O cliente buscará o pedido na loja. Nenhuma taxa de entrega será cobrada.
        </p>
      )}

      {/* Agendamento */}
      <div className="rounded-xl border border-border-token p-3 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enableScheduling}
            onChange={(e) => setEnableScheduling(e.target.checked)}
            className="h-4 w-4 rounded border-border-token text-brand-ink focus:ring-brand"
          />
          <span className="text-sm font-semibold text-fg-token">📅 Agendar pedido</span>
        </label>

        {enableScheduling && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-fg-muted-token mb-2">
                Data
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border-token bg-surface text-sm text-fg-token focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-fg-muted-token mb-2">
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
                        ? 'bg-brand border-brand text-on-brand'
                        : 'border-border-token text-fg-token hover:bg-surface-2'
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
