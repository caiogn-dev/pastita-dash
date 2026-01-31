/**
 * Store Resolver Hook
 * 
 * Resolve store identifiers (slug or UUID) to full store objects.
 * This is critical for routes that receive store slug in URL params
 * but need UUID for API calls.
 * 
 * @example
 * // Route: /stores/pastita/delivery
 * const { storeId, isLoading, error } = useStoreResolver('pastita');
 * // Returns: { storeId: 'b2a737a7-3e9e-43d5-add4-759b53498123', ... }
 */

import { useState, useEffect, useMemo } from 'react';
import { useStoreContextStore } from '../stores/storeContextStore';
import { getStores, Store } from '../services/storesApi';
import logger from '../services/logger';

interface UseStoreResolverReturn {
  /** Resolved store UUID */
  storeId: string | null;
  /** Store slug */
  storeSlug: string | null;
  /** Store name */
  storeName: string | null;
  /** Whether store is resolved and valid */
  isResolved: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error if resolution failed */
  error: string | null;
}

/**
 * Check if a string is a valid UUID
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Hook to resolve store identifier (slug or UUID) to store data
 */
export function useStoreResolver(storeIdentifier: string | undefined): UseStoreResolverReturn {
  const [resolvedStore, setResolvedStore] = useState<{ id: string; slug: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { stores, selectedStore, fetchStores } = useStoreContextStore();

  useEffect(() => {
    if (!storeIdentifier) {
      setResolvedStore(null);
      setError(null);
      return;
    }

    // If it's already a UUID, use it directly
    if (isUUID(storeIdentifier)) {
      const store = stores.find(s => s.id === storeIdentifier) || selectedStore;
      if (store?.id === storeIdentifier) {
        setResolvedStore({
          id: store.id,
          slug: store.slug,
          name: store.name,
        });
        setError(null);
        return;
      }
    }

    // It's a slug, need to resolve
    const resolveStore = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First check in already loaded stores
        const existingStore = stores.find(s => s.slug === storeIdentifier);
        if (existingStore) {
          setResolvedStore({
            id: existingStore.id,
            slug: existingStore.slug,
            name: existingStore.name,
          });
          return;
        }

        // Check if selected store matches
        if (selectedStore?.slug === storeIdentifier) {
          setResolvedStore({
            id: selectedStore.id,
            slug: selectedStore.slug,
            name: selectedStore.name,
          });
          return;
        }

        // Fetch from API and filter by slug
        const response = await getStores();
        const store = response.results?.find(s => s.slug === storeIdentifier);
        
        if (store) {
          setResolvedStore({
            id: store.id,
            slug: store.slug,
            name: store.name,
          });
        } else {
          setError(`Loja "${storeIdentifier}" não encontrada`);
          setResolvedStore(null);
        }
      } catch (err) {
        logger.error('Failed to resolve store:', err);
        setError('Erro ao buscar loja');
        setResolvedStore(null);
      } finally {
        setIsLoading(false);
      }
    };

    resolveStore();
  }, [storeIdentifier, stores, selectedStore]);

  return useMemo(() => ({
    storeId: resolvedStore?.id || null,
    storeSlug: resolvedStore?.slug || null,
    storeName: resolvedStore?.name || null,
    isResolved: !!resolvedStore?.id,
    isLoading,
    error,
  }), [resolvedStore, isLoading, error]);
}

/**
 * Hook to get current store ID, resolving from URL param if needed
 * Use this in pages that have :storeId in route
 */
export function useResolvedStoreId(): {
  storeId: string | null;
  isLoading: boolean;
  error: string | null;
} {
  const { selectedStore } = useStoreContextStore();
  
  // If we have a selected store, use its ID
  if (selectedStore?.id) {
    return { storeId: selectedStore.id, isLoading: false, error: null };
  }

  // Otherwise return null - component should handle loading state
  return { storeId: null, isLoading: false, error: null };
}

export default useStoreResolver;
