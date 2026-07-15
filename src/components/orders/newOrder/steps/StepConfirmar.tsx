import React from 'react';
import { PAYMENT_LABELS, fmt } from '../types';
import type { CartItem, PaymentMethod } from '../types';
import type { DiscountType, RouteQuote } from '../../../../types/crm';

/** Step 5 — resumo + forma de pagamento (o submit vive no rodapé do container) */
export function StepConfirmar({
  cart,
  deliveryMethod,
  deliveryAddress,
  routeQuote,
  discountType,
  discountValue,
  surchargeValue,
  paymentMethod,
  setPaymentMethod,
  onEditItems,
  suppressNotifications,
  setSuppressNotifications,
}: {
  cart: CartItem[];
  deliveryMethod: 'delivery' | 'pickup';
  deliveryAddress: string;
  routeQuote: RouteQuote | null;
  discountType: DiscountType;
  discountValue: string;
  surchargeValue: string;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  onEditItems?: () => void;
  suppressNotifications: boolean;
  setSuppressNotifications: (v: boolean) => void;
}) {
  const subtotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);
  const deliveryFee = deliveryMethod === 'delivery' ? (routeQuote?.fee ?? 0) : 0;
  const surcharge = parseFloat(surchargeValue) || 0;
  const discountRaw = parseFloat(discountValue) || 0;
  const discountAmount =
    discountType === 'percent' ? subtotal * (discountRaw / 100) : discountRaw;
  const total = subtotal + deliveryFee + surcharge - discountAmount;

  return (
    <div className="space-y-4">
      {/* Summary rows */}
      {onEditItems && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
            Resumo
          </span>
          <button
            type="button"
            onClick={onEditItems}
            className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            Editar itens
          </button>
        </div>
      )}
      <div className="rounded-xl border border-gray-100 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800 overflow-hidden">
        {cart.map((item) => (
          <div key={item.product.id} className="flex justify-between px-3 py-2 text-sm">
            <span className="text-gray-700 dark:text-zinc-300">
              {item.quantity}× {item.product.name}
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {fmt(item.product.price * item.quantity)}
            </span>
          </div>
        ))}
        <div className="flex justify-between px-3 py-2 text-sm">
          <span className="text-gray-500 dark:text-zinc-400">Subtotal</span>
          <span className="text-gray-900 dark:text-white">{fmt(subtotal)}</span>
        </div>
        {deliveryMethod === 'delivery' && (
          <div className="flex justify-between px-3 py-2 text-sm">
            <span className="text-gray-500 dark:text-zinc-400">
              Taxa de entrega
              {deliveryAddress && ` (${deliveryAddress.slice(0, 25)}...)`}
            </span>
            <span className="text-gray-900 dark:text-white">{fmt(deliveryFee)}</span>
          </div>
        )}
        {surcharge > 0 && (
          <div className="flex justify-between px-3 py-2 text-sm">
            <span className="text-gray-500 dark:text-zinc-400">Acréscimo</span>
            <span className="text-gray-900 dark:text-white">+ {fmt(surcharge)}</span>
          </div>
        )}
        {discountAmount > 0 && (
          <div className="flex justify-between px-3 py-2 text-sm">
            <span className="text-gray-500 dark:text-zinc-400">Desconto</span>
            <span className="text-emerald-600 dark:text-emerald-400">- {fmt(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between px-3 py-3 bg-gray-50 dark:bg-zinc-800/50">
          <span className="font-bold text-gray-900 dark:text-white">Total</span>
          <span className="font-bold text-lg text-primary-600 dark:text-primary-400">
            {fmt(total)}
          </span>
        </div>
      </div>

      {/* Payment method */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-2">
          Forma de pagamento
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPaymentMethod(m)}
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                paymentMethod === m
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              {PAYMENT_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Pedido de balcão: silenciar mensagens automáticas de status */}
      <label className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-zinc-700 px-3 py-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={suppressNotifications}
          onChange={(e) => setSuppressNotifications(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span>
          <span className="block text-sm font-semibold text-gray-900 dark:text-white">
            Não notificar o cliente
          </span>
          <span className="block text-xs text-gray-500 dark:text-zinc-400">
            Nenhuma mensagem automática de status será enviada no WhatsApp (ex.: cliente no balcão).
          </span>
        </span>
      </label>
    </div>
  );
}
