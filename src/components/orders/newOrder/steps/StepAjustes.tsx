import React from 'react';
import type { DiscountType } from '../../../../types/crm';

/** Step 4 */
export function StepAjustes({
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  discountReason,
  setDiscountReason,
  surchargeValue,
  setSurchargeValue,
  surchargeReason,
  setSurchargeReason,
}: {
  discountType: DiscountType;
  setDiscountType: (v: DiscountType) => void;
  discountValue: string;
  setDiscountValue: (v: string) => void;
  discountReason: string;
  setDiscountReason: (v: string) => void;
  surchargeValue: string;
  setSurchargeValue: (v: string) => void;
  surchargeReason: string;
  setSurchargeReason: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Desconto */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-fg-muted-token">
          Desconto (opcional)
        </p>
        <div className="flex gap-2">
          {(['percent', 'fixed'] as DiscountType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDiscountType(t)}
              className={`flex-1 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
                discountType === t
                  ? 'bg-brand border-brand text-on-brand'
                  : 'border-border-token text-fg-muted-token hover:bg-surface-2'
              }`}
            >
              {t === 'percent' ? '% Percentual' : 'R$ Fixo'}
            </button>
          ))}
        </div>
        <input
          type="number"
          min="0"
          step="0.01"
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
          placeholder={discountType === 'percent' ? 'Ex: 10 (para 10%)' : 'Ex: 5.00'}
          className="w-full px-3 py-2 rounded-xl border border-border-token bg-surface text-sm text-fg-token placeholder:text-fg-muted-token focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <input
          type="text"
          value={discountReason}
          onChange={(e) => setDiscountReason(e.target.value)}
          placeholder="Motivo do desconto"
          className="w-full px-3 py-2 rounded-xl border border-border-token bg-surface text-sm text-fg-token placeholder:text-fg-muted-token focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {/* Acréscimo */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-fg-muted-token">
          Acréscimo (opcional)
        </p>
        <input
          type="number"
          min="0"
          step="0.01"
          value={surchargeValue}
          onChange={(e) => setSurchargeValue(e.target.value)}
          placeholder="Ex: 2.50"
          className="w-full px-3 py-2 rounded-xl border border-border-token bg-surface text-sm text-fg-token placeholder:text-fg-muted-token focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <input
          type="text"
          value={surchargeReason}
          onChange={(e) => setSurchargeReason(e.target.value)}
          placeholder="Motivo do acréscimo"
          className="w-full px-3 py-2 rounded-xl border border-border-token bg-surface text-sm text-fg-token placeholder:text-fg-muted-token focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      <p className="text-xs text-fg-muted-token">
        Desconto e acréscimo são aplicados ao total do pedido.
      </p>
    </div>
  );
}
