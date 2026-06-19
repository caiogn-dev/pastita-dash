import React from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { BottomSheet } from './ui/BottomSheet';
import { useRootStore } from '../stores/rootStore';

interface Props { open: boolean; onClose: () => void; }

export const MobileStoreSwitcher: React.FC<Props> = ({ open, onClose }) => {
  const stores = useRootStore((s) => s.stores);
  const selectedStoreId = useRootStore((s) => s.selectedStoreId);
  const setSelectedStore = useRootStore((s) => s.setSelectedStore);

  const pick = (id: string) => { setSelectedStore(id); onClose(); };

  return (
    <BottomSheet open={open} onClose={onClose} title="Trocar de loja">
      <ul className="divide-y divide-border-primary">
        {stores.map((store) => (
          <li key={store.id}>
            <button
              type="button"
              onClick={() => pick(store.id)}
              className="flex w-full items-center justify-between px-4 py-4 text-left text-fg-primary active:bg-bg-secondary"
            >
              <span>{store.name}</span>
              {store.id === selectedStoreId && <CheckIcon className="h-5 w-5 text-brand-500" />}
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
};
