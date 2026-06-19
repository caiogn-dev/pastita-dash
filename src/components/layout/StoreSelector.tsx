import React from 'react';
import { useRootStore } from '../../stores/rootStore';

/**
 * Read-only store picker. Stores are loaded globally by useBootstrapStores;
 * this component only displays them and updates the selection.
 */
export const StoreSelector: React.FC = () => {
  const stores = useRootStore((s) => s.stores);
  const selectedStoreId = useRootStore((s) => s.selectedStoreId);
  const setSelectedStore = useRootStore((s) => s.setSelectedStore);

  if (stores.length === 0) return null;

  return (
    <select
      aria-label="Loja"
      value={selectedStoreId || ''}
      onChange={(e) => setSelectedStore(e.target.value || null)}
      className="rounded-lg border border-border-primary bg-bg-card px-3 py-1.5 text-sm text-fg-primary"
    >
      {stores.map((store) => (
        <option key={store.id} value={store.id}>
          {store.name}
        </option>
      ))}
    </select>
  );
};

export default StoreSelector;
