import React, { useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { useCustomerSearch } from '../../hooks/useCustomerSearch';
import type { CustomerSearchResult } from '../../types/crm';

interface CustomerSearchInputProps {
  storeSlug: string;
  onSelect: (customer: CustomerSearchResult) => void;
  onClear: () => void;
  /** If provided, shows the selected customer as a badge instead of the input */
  selectedCustomer?: CustomerSearchResult | null;
}

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const CustomerSearchInput: React.FC<CustomerSearchInputProps> = ({
  storeSlug,
  onSelect,
  onClear,
  selectedCustomer,
}) => {
  const { query, results, loading, search, selectCustomer, clear } =
    useCustomerSearch(storeSlug);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        // don't clear selection, just collapse dropdown
        search('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [search]);

  const handleSelect = (customer: CustomerSearchResult) => {
    selectCustomer(customer);
    onSelect(customer);
  };

  const handleClear = () => {
    clear();
    onClear();
  };

  // If a customer is already selected, show a badge
  if (selectedCustomer) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {selectedCustomer.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            {selectedCustomer.phone_number}
            {selectedCustomer.total_orders > 0 && (
              <> · {selectedCustomer.total_orders} pedido(s) · {fmt(selectedCustomer.total_spent)}</>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
          title="Remover cliente"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition-colors">
        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Buscar cliente por nome ou telefone..."
          className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none min-w-0"
          autoComplete="off"
        />
        {loading && (
          <span className="text-xs text-gray-400 animate-pulse flex-shrink-0">
            Buscando...
          </span>
        )}
        {query && !loading && (
          <button
            type="button"
            onClick={() => search('')}
            className="p-0.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <XMarkIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {(results.length > 0 || (query.length >= 2 && !loading && results.length === 0)) && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
          {results.length === 0 ? (
            // No results — offer "new customer" option
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              onClick={() => {
                // Create a placeholder customer with query as name
                const newCustomer: CustomerSearchResult = {
                  id: '',
                  name: query,
                  phone_number: query.replace(/\D/g, '').length >= 8 ? query : '',
                  total_orders: 0,
                  total_spent: 0,
                  addresses: [],
                };
                handleSelect(newCustomer);
              }}
            >
              <span className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex-shrink-0">
                <UserPlusIcon className="h-4 w-4 text-gray-500" />
              </span>
              <div>
                <p className="font-medium text-gray-700 dark:text-zinc-200">
                  Novo cliente: <span className="text-primary-600">{query}</span>
                </p>
                <p className="text-xs text-gray-400">Cliente não encontrado — criar novo</p>
              </div>
            </button>
          ) : (
            results.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => handleSelect(customer)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors border-b border-gray-100 dark:border-zinc-800 last:border-0"
              >
                {/* Avatar */}
                <span
                  className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: '#6366f1' }}
                >
                  {customer.name.slice(0, 2).toUpperCase()}
                </span>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {customer.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                    {customer.phone_number}
                    {customer.total_orders > 0 && (
                      <> · {customer.total_orders} pedido(s)</>
                    )}
                  </p>
                </div>
                {/* Spent */}
                {customer.total_spent > 0 && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    {fmt(customer.total_spent)}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSearchInput;
