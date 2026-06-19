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
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
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
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
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
          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
        <input
          type="text"
          value={discountReason}
          onChange={(e) => setDiscountReason(e.target.value)}
          placeholder="Motivo do desconto"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* Acréscimo */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-zinc-400">
          Acréscimo (opcional)
        </p>
        <input
          type="number"
          min="0"
          step="0.01"
          value={surchargeValue}
          onChange={(e) => setSurchargeValue(e.target.value)}
          placeholder="Ex: 2.50"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
        <input
          type="text"
          value={surchargeReason}
          onChange={(e) => setSurchargeReason(e.target.value)}
          placeholder="Motivo do acréscimo"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <p className="text-xs text-gray-400 dark:text-zinc-500">
        Desconto e acréscimo são aplicados ao total do pedido.
      </p>
    </div>
  );
}
