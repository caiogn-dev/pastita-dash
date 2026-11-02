import React, { useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { useCustomerSearch } from '../../hooks/useCustomerSearch';
import type { CustomerSearchResult } from '../../types/crm';
import { formatCurrency } from '../../utils/formatters';
import { formatarDocumento } from '../../utils/documento';

interface CustomerSearchInputProps {
  storeSlug: string;
  onSelect: (customer: CustomerSearchResult) => void;
  onClear: () => void;
  /** If provided, shows the selected customer as a badge instead of the input */
  selectedCustomer?: CustomerSearchResult | null;
}


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
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-brand bg-brand-soft">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-fg-token truncate">
            {selectedCustomer.name}
          </p>
          <p className="text-xs text-fg-muted-token">
            {selectedCustomer.phone_number}
            {selectedCustomer.total_orders > 0 && (
              <> · {selectedCustomer.total_orders} pedido(s) · {formatCurrency(selectedCustomer.total_spent)}</>
            )}
          </p>
        </div>
        <button aria-label="Limpar busca"
          type="button"
          onClick={handleClear}
          className="p-1 rounded-full text-fg-muted-token hover:text-danger-token hover:bg-danger-soft transition-colors flex-shrink-0"
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
      <div className="flex h-12 items-center gap-3 rounded-lg border border-border-input bg-surface px-4 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
        <MagnifyingGlassIcon className="h-5 w-5 text-fg-muted-token flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Nome, telefone ou CPF/CNPJ"
          aria-label="Buscar cliente"
          className="flex-1 border-0 p-0 shadow-none focus:ring-0 bg-transparent text-base text-fg-token placeholder:text-fg-muted-token outline-none min-w-0"
          autoComplete="off"
        />
        {loading && (
          <span className="text-xs text-fg-muted-token animate-pulse flex-shrink-0">
            Buscando...
          </span>
        )}
        {query && !loading && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => search('')}
            className="rounded-full p-1 text-fg-muted-token hover:bg-surface-2 hover:text-fg-token flex-shrink-0"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {(results.length > 0 || (query.length >= 2 && !loading && results.length === 0)) && (
        <div className="absolute z-50 top-full mt-2 left-0 right-0 max-h-80 overflow-y-auto superficie shadow-xl">
          {results.length === 0 ? (
            // No results — offer "new customer" option
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-surface-2 transition-colors"
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
              <span className="flex items-center justify-center h-9 w-9 rounded-full bg-surface-2 flex-shrink-0">
                <UserPlusIcon className="h-4 w-4 text-fg-muted-token" />
              </span>
              <div>
                <p className="font-medium text-fg-token">
                  Novo cliente: <span className="text-brand-ink">{query}</span>
                </p>
              </div>
            </button>
          ) : (
            results.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => handleSelect(customer)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-surface-2 transition-colors border-b border-border-token last:border-0"
              >
                {/* Avatar */}
                <span className="flex items-center justify-center h-9 w-9 rounded-full bg-brand-soft text-brand-ink text-xs font-bold flex-shrink-0">
                  {customer.name.slice(0, 2).toUpperCase()}
                </span>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-fg-token truncate">
                    {customer.name}
                  </p>
                  <p className="text-xs text-fg-muted-token truncate">
                    {customer.phone_number}
                    {customer.cadastro?.documento && (
                      <> · {customer.cadastro.tipo_pessoa === 'pj' ? 'CNPJ' : 'CPF'} {formatarDocumento(customer.cadastro.documento)}</>
                    )}
                    {customer.total_orders > 0 && (
                      <> · {customer.total_orders} pedido(s)</>
                    )}
                  </p>
                </div>
                {/* Spent */}
                {customer.total_spent > 0 && (
                  <span className="text-sm font-semibold tabular-nums text-fg-token flex-shrink-0">
                    {formatCurrency(customer.total_spent)}
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
