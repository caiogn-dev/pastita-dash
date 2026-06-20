import React from 'react';

interface Props {
  value: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}

export const InlineStockStepper: React.FC<Props> = ({ value, disabled, onChange }) => (
  <div className="inline-flex items-center gap-1">
    <button
      type="button"
      aria-label="diminuir estoque"
      disabled={disabled}
      className="h-7 w-7 rounded border text-danger-token disabled:opacity-40"
      onClick={() => onChange(Math.max(0, value - 1))}
    >−</button>
    <span className="min-w-[2ch] text-center tabular-nums">{value}</span>
    <button
      type="button"
      aria-label="aumentar estoque"
      disabled={disabled}
      className="h-7 w-7 rounded border text-success-token disabled:opacity-40"
      onClick={() => onChange(value + 1)}
    >+</button>
  </div>
);
