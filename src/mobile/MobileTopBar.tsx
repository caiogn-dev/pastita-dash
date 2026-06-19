// src/mobile/MobileTopBar.tsx
import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useRootStore } from '../stores/rootStore';
import { MobileStoreSwitcher } from './MobileStoreSwitcher';

export const MobileTopBar: React.FC = () => {
  const stores = useRootStore((s) => s.stores);
  const selectedStoreId = useRootStore((s) => s.selectedStoreId);
  const [open, setOpen] = useState(false);

  const active = stores.find((s) => s.id === selectedStoreId);
  const name = active?.name ?? (stores.length === 0 ? 'Sem loja' : 'Selecione');
  const canSwitch = stores.length >= 2;

  return (
    <header
      className="sticky top-0 z-40 flex items-center border-b border-border-primary bg-bg-card px-4 py-3"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
    >
      {canSwitch ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-base font-semibold text-fg-primary"
        >
          {name}
          <ChevronDownIcon className="h-4 w-4 text-fg-muted" />
        </button>
      ) : (
        <span className="text-base font-semibold text-fg-primary">{name}</span>
      )}
      {canSwitch && <MobileStoreSwitcher open={open} onClose={() => setOpen(false)} />}
    </header>
  );
};
