import React from 'react';
import { PAYMENT_LABELS, fmt } from '../types';
import type { CartItem, PaymentMethod } from '../types';
import type { DiscountType, RouteQuote } from '../../../../types/crm';
import { precoVigenteDoProduto } from '../../../../utils/precoVigente';

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
  const subtotal = cart.reduce((s, c) => s + precoVigenteDoProduto(c.product) * c.quantity, 0);
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
          <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted-token">
            Resumo
          </span>
          <button
            type="button"
            onClick={onEditItems}
            className="text-xs font-semibold text-brand-ink hover:underline"
          >
            Editar itens
          </button>
        </div>
      )}
      <div className="rounded-xl border border-border-token divide-y divide-border-token overflow-hidden">
        {cart.map((item) => (
          <div key={item.product.id} className="flex justify-between px-3 py-2 text-sm">
            <span className="text-fg-token">
              {item.quantity}× {item.product.name}
            </span>
            <span className="font-medium text-fg-token">
              {fmt(precoVigenteDoProduto(item.product) * item.quantity)}
            </span>
          </div>
        ))}
        <div className="flex justify-between px-3 py-2 text-sm">
          <span className="text-fg-muted-token">Subtotal</span>
          <span className="text-fg-token">{fmt(subtotal)}</span>
        </div>
        {deliveryMethod === 'delivery' && (
          <div className="flex justify-between px-3 py-2 text-sm">
            <span className="text-fg-muted-token">
              Taxa de entrega
              {deliveryAddress && `(${deliveryAddress.slice(0, 25)}...)`}
            </span>
            <span className="text-fg-token">{fmt(deliveryFee)}</span>
          </div>
        )}
        {surcharge > 0 && (
          <div className="flex justify-between px-3 py-2 text-sm">
            <span className="text-fg-muted-token">Acréscimo</span>
            <span className="text-fg-token">+ {fmt(surcharge)}</span>
          </div>
        )}
        {discountAmount > 0 && (
          <div className="flex justify-between px-3 py-2 text-sm">
            <span className="text-fg-muted-token">Desconto</span>
            <span className="text-emerald-600 dark:text-emerald-400">- {fmt(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between px-3 py-3 bg-surface-2">
          <span className="font-bold text-fg-token">Total</span>
          <span className="font-bold text-lg text-brand-ink">
            {fmt(total)}
          </span>
        </div>
      </div>

      {/* Payment method */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-fg-muted-token mb-2">
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
                  ? 'bg-brand border-brand text-on-brand'
                  : 'border-border-token text-fg-muted-token hover:bg-surface-2'
              }`}
            >
              {PAYMENT_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Pedido de balcão: silenciar mensagens automáticas de status */}
      <label className="flex items-start gap-3 rounded-xl border border-border-token px-3 py-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={suppressNotifications}
          onChange={(e) => setSuppressNotifications(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border-token text-brand-ink focus:ring-brand"
        />
        <span>
          <span className="block text-sm font-semibold text-fg-token">
            Não notificar o cliente
          </span>
          <span className="block text-xs text-fg-muted-token">
            Nenhuma mensagem automática de status será enviada no WhatsApp (ex.: cliente no balcão).
          </span>
        </span>
      </label>
    </div>
  );
}
