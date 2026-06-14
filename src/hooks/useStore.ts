/**
 * Store Context Hook
 *
 * Provides easy access to the currently selected store.
 * Uses rootStore (Zustand) as single source of truth.
 *
 * @example
 * const { storeId, storeSlug, storeName, requireStore } = useStore();
 */

import { useCallback, useMemo } from 'react';
import { useRootStore } from '../stores/rootStore';
import type { Store as ApiStore } from '../services/storesApi';
import { DEFAULT_STORE_SLUG, resolveStoreSlug } from '../config/storeConfig';

export interface UseStoreReturn {
  /** UUID of the selected store */
  storeId: string | null;
  /** URL-friendly slug of the selected store */
  storeSlug: string | null;
  /** Display name of the selected store */
  storeName: string | null;
  /** Whether a store is currently selected */
  isStoreSelected: boolean;
  /** The full store object */
  store: ApiStore | null;
  /** All available stores */
  stores: ApiStore[];
  /** Loading state */
  loading: boolean;
  /** Throws an error if no store is selected */
  requireStore: () => string;
  /** Get store ID or throw with custom message */
  getStoreIdOrThrow: (message?: string) => string;
}

/**
 * Hook to access the currently selected store context.
 * Uses rootStore as single source of truth.
 */
export function useStore(): UseStoreReturn {
  const {
    selectedStoreId,
    stores,
  } = useRootStore();

  const selectedStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId) || null;
  }, [selectedStoreId, stores]);

  const storeId = selectedStoreId || null;
  const storeSlug = selectedStore?.slug || null;
  const storeName = selectedStore?.name || null;
  const isStoreSelected = selectedStoreId !== null;

  const requireStore = useCallback((): string => {
    if (!selectedStoreId) {
      throw new Error('Nenhuma loja selecionada. Por favor, selecione uma loja no menu superior.');
    }
    return selectedStoreId;
  }, [selectedStoreId]);

  const getStoreIdOrThrow = useCallback((message?: string): string => {
    if (!selectedStoreId) {
      throw new Error(message || 'Store ID is required but no store is selected.');
    }
    return selectedStoreId;
  }, [selectedStoreId]);

  return {
    storeId,
    storeSlug,
    storeName,
    isStoreSelected,
    store: selectedStore,
    stores,
    loading: false,
    requireStore,
    getStoreIdOrThrow,
  };
}

/**
 * Get store ID outside of React components (non-hook context).
 */
export function getStoreId(): string | null {
  // NOTE: Cannot use hooks outside components.
  // For services, use useRootStore directly in a component wrapper.
  // Or pass storeId as parameter to service functions.
  console.warn('getStoreId() called from non-component context. Use useStore() hook instead.');
  return null;
}

/**
 * Get store slug outside of React components.
 */
export function getStoreSlug(): string | null {
  console.warn('getStoreSlug() called from non-component context. Use useStore() hook instead.');
  return null;
}

/**
 * Get store slug/id with fallback.
 * Lê a loja SELECIONADA no rootStore primeiro (corrige relatórios/exports que
 * iam sem store em produção multi-tenant, onde DEFAULT_STORE_SLUG é vazio).
 * O backend aceita id (UUID) ou slug, então retornar o id resolvido é válido.
 */
export function getStoreSlugWithFallback(): string | null {
  const { selectedStoreId, stores } = useRootStore.getState();
  if (selectedStoreId) {
    const match = stores.find((s) => s.id === selectedStoreId || s.slug === selectedStoreId);
    if (match?.slug) return match.slug;
    return selectedStoreId; // já pode ser um slug; backend resolve id ou slug
  }
  return resolveStoreSlug(null, DEFAULT_STORE_SLUG);
}

/**
 * Get store ID with fallback (lê a loja selecionada no rootStore).
 */
export function getStoreIdWithFallback(): string | null {
  return useRootStore.getState().selectedStoreId
    ?? resolveStoreSlug(null, DEFAULT_STORE_SLUG);
}

export default useStore;
