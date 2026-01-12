/**
 * Store Selector Component
 * Dropdown to select the active store for dashboard operations.
 * Used in the Header to provide global store context.
 */
import React, { useEffect } from 'react';
import { Store, ChevronDown, RefreshCw, AlertCircle } from 'lucide-react';
import { useStoreContextStore } from '../../stores';

export const StoreSelector: React.FC = () => {
  const { 
    stores, 
    selectedStore, 
    loading, 
    error,
    initialized,
    fetchStores, 
    setSelectedStore 
  } = useStoreContextStore();

  // Fetch stores on mount if not initialized
  useEffect(() => {
    if (!initialized) {
      fetchStores();
    }
  }, [initialized, fetchStores]);

  // Loading state
  if (loading && !initialized) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg animate-pulse">
        <Store className="w-4 h-4 text-gray-400" />
        <div className="w-32 h-4 bg-gray-200 rounded" />
      </div>
    );
  }

  // Error state
  if (error && stores.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">Erro ao carregar lojas</span>
        <button 
          onClick={() => fetchStores()}
          className="p-1 hover:bg-red-100 rounded"
          title="Tentar novamente"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // No stores available
  if (stores.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg">
        <Store className="w-4 h-4" />
        <span className="text-sm">Nenhuma loja disponível</span>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      <Store className="w-4 h-4 text-gray-500" />
      <div className="relative">
        <select
          value={selectedStore?.id || ''}
          onChange={(e) => {
            const store = stores.find(s => s.id === e.target.value);
            setSelectedStore(store || null);
          }}
          className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer min-w-[180px]"
          disabled={loading}
        >
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      
      {/* Refresh button */}
      <button
        onClick={() => fetchStores()}
        disabled={loading}
        className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${loading ? 'animate-spin' : ''}`}
        title="Atualizar lojas"
      >
        <RefreshCw className="w-4 h-4 text-gray-400" />
      </button>
      
      {/* Store status indicator */}
      {selectedStore && (
        <div 
          className={`w-2 h-2 rounded-full ${
            selectedStore.status === 'active' ? 'bg-green-500' : 
            selectedStore.status === 'inactive' ? 'bg-gray-400' :
            selectedStore.status === 'suspended' ? 'bg-red-500' :
            'bg-yellow-500'
          }`}
          title={`Status: ${selectedStore.status}`}
        />
      )}
    </div>
  );
};

export default StoreSelector;
