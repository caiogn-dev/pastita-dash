import { useState, useCallback, useRef } from 'react';
import { crmApi } from '../services/crmApi';
import type { CustomerSearchResult } from '../types/crm';

export function useCustomerSearch(storeSlug: string) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CustomerSearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  // Tracks the latest request so stale responses are discarded
  const requestIdRef = useRef(0);

  const search = useCallback(
    (q: string) => {
      setQuery(q);
      clearTimeout(debounceRef.current);
      if (q.length < 2) {
        setResults([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        const requestId = ++requestIdRef.current;
        setLoading(true);
        try {
          const { data } = await crmApi.searchCustomers(storeSlug, q);
          if (requestId !== requestIdRef.current) return;
          setResults(Array.isArray(data) ? data : []);
        } catch {
          if (requestId === requestIdRef.current) setResults([]);
        } finally {
          if (requestId === requestIdRef.current) setLoading(false);
        }
      }, 300);
    },
    [storeSlug]
  );

  const selectCustomer = useCallback((customer: CustomerSearchResult) => {
    setSelected(customer);
    setResults([]);
    setQuery(customer.name);
  }, []);

  const clear = useCallback(() => {
    setSelected(null);
    setQuery('');
    setResults([]);
    clearTimeout(debounceRef.current);
  }, []);

  return { query, results, loading, selected, search, selectCustomer, clear };
}
