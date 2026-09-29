import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { PAYMENT_LABELS, fmt } from '../types';
import type { CartItem, PaymentMethod } from '../types';
import type { DiscountType, RouteQuote } from '../../../../types/crm';
import { precoVigenteDoProduto } from '../../../../utils/precoVigente';
import { Input, Textarea } from '../../../ui';

/** Último passo — resumo, ajustes recolhidos e pagamento (o submit vive no rodapé do container) */
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
  observacoes,
  setObservacoes,
  setDiscountType,
  setDiscountValue,
  discountReason = '',
  setDiscountReason,
  setSurchargeValue,
  surchargeReason = '',
  setSurchargeReason,
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
  /** Sai impresso na comanda. Vem preenchido quando o pedido nasce da conversa. */
  observacoes?: string;
  setObservacoes?: (v: string) => void;
  setDiscountType?: (v: DiscountType) => void;
  setDiscountValue?: (v: string) => void;
  discountReason?: string;
  setDiscountReason?: (v: string) => void;
  setSurchargeValue?: (v: string) => void;
  surchargeReason?: string;
  setSurchargeReason?: (v: string) => void;
}) {
  // Aberto de saída só quando já existe ajuste: quem não mexe não vê campo.
  const [ajustesAbertos, setAjustesAbertos] = useState(
    Boolean(parseFloat(discountValue) || parseFloat(surchargeValue)),
  );
  const podeAjustar = Boolean(setDiscountValue && setSurchargeValue);
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
            <span className="text-success-token">- {fmt(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between px-3 py-3 bg-surface-2">
          <span className="font-bold text-fg-token">Total</span>
          <span className="font-bold text-lg text-brand-ink">
            {fmt(total)}
          </span>
        </div>
      </div>

      {podeAjustar && (
        <div className="rounded-xl border border-border-token">
          <button
            type="button"
            onClick={() => setAjustesAbertos((v) => !v)}
            aria-expanded={ajustesAbertos}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-fg-token"
          >
            Desconto ou acréscimo
            <ChevronDownIcon className={`h-4 w-4 text-fg-muted-token transition-transform ${ajustesAbertos ? 'rotate-180' : ''}`} />
          </button>
          {ajustesAbertos && (
            <div className="space-y-3 border-t border-border-token px-3 py-3">
              <div className="flex gap-2">
                {(['percent', 'fixed'] as DiscountType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDiscountType?.(t)}
                    aria-pressed={discountType === t}
                    className={`flex-1 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
                      discountType === t
                        ? 'bg-brand border-brand text-on-brand'
                        : 'border-border-token text-fg-muted-token hover:bg-surface-2'
                    }`}
                  >
                    {t === 'percent' ? '%' : 'R$'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Valor do desconto"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={discountValue}
                  onChange={(e) => setDiscountValue?.(e.target.value)}
                  placeholder={discountType === 'percent' ? '10' : '5,00'}
                />
                <Input
                  label="Motivo"
                  value={discountReason}
                  onChange={(e) => setDiscountReason?.(e.target.value)}
                />
                <Input
                  label="Acréscimo (R$)"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={surchargeValue}
                  onChange={(e) => setSurchargeValue?.(e.target.value)}
                  placeholder="2,50"
                />
                <Input
                  label="Motivo do acréscimo"
                  value={surchargeReason}
                  onChange={(e) => setSurchargeReason?.(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}

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

      {setObservacoes && (
        <Textarea
          label="Observações do pedido"
          rows={2}
          value={observacoes ?? ''}
          onChange={(e) => setObservacoes(e.target.value)}
                    maxLength={500}
        />
      )}

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
            Não avisar o cliente no WhatsApp
          </span>
        </span>
      </label>
    </div>
  );
}
