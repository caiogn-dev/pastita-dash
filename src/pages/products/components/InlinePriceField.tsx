import React, { useState } from 'react';

interface Props {
  value: number;
  onCommit: (next: number) => void;
}

export const InlinePriceField: React.FC<Props> = ({ value, onCommit }) => {
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    const parsed = parseFloat(draft.replace(',', '.'));
    if (!Number.isNaN(parsed) && parsed !== value) onCommit(parsed);
  };
  return (
    <input
      aria-label="preço"
      inputMode="decimal"
      className="w-24 rounded border px-2 py-1 text-right tabular-nums"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
};
