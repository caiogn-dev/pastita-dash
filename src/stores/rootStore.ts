import { create } from 'zustand';
import type { Store, StoreOrder } from '../services/storesApi';

/**
 * Root Store - Single source of truth for app state
 *
 * Consolidates all global state in one place to prevent:
 * - Duplicate state across pages
 * - useState scattered everywhere
 * - Prop drilling 3+ levels
 */

interface User {
  id: string;
  email: string;
  name?: string;
}

interface RootStore {
  // Auth state
  auth: {
    user: User | null;
    token: string | null;
  };
  setAuth: (auth: { user: User | null; token: string | null }) => void;
  clearAuth: () => void;

  // Stores list
  stores: Store[];
  setStores: (stores: Store[]) => void;

  // Selected store
  selectedStoreId: string | null;
  setSelectedStore: (storeId: string | null) => void;

  // Orders cache (by store ID)
  orders: { [storeId: string]: StoreOrder[] };
  setOrders: (storeId: string, orders: StoreOrder[]) => void;
  clearOrders: (storeId: string) => void;
}

const SELECTED_STORE_KEY = 'cardapidex_selected_store';

const readPersistedStore = (): string | null => {
  try {
    return localStorage.getItem(SELECTED_STORE_KEY);
  } catch {
    return null;
  }
};

export const useRootStore = create<RootStore>((set) => ({
  // Auth
  auth: {
    user: null,
    token: null,
  },
  setAuth: (auth) => set({ auth }),
  clearAuth: () => set({ auth: { user: null, token: null } }),

  // Stores — ao carregar a lista, auto-seleciona a primeira loja se nada
  // estiver selecionado (sem isso, todo reload derrubava os links por loja
  // para /stores, porque selectedStoreId começava null)
  stores: [],
  setStores: (stores) =>
    set((state) => {
      const valid = state.selectedStoreId
        && stores.some((s) => s.id === state.selectedStoreId || s.slug === state.selectedStoreId);
      if (valid || stores.length === 0) return { stores };
      const persisted = readPersistedStore();
      const fromPersisted = persisted
        ? stores.find((s) => s.id === persisted || s.slug === persisted)
        : null;
      return { stores, selectedStoreId: (fromPersisted || stores[0]).id };
    }),

  // Selected store (persistido entre reloads)
  selectedStoreId: readPersistedStore(),
  setSelectedStore: (storeId) => {
    try {
      if (storeId) localStorage.setItem(SELECTED_STORE_KEY, storeId);
      else localStorage.removeItem(SELECTED_STORE_KEY);
    } catch { /* storage indisponível */ }
    set({ selectedStoreId: storeId });
  },

  // Orders
  orders: {},
  setOrders: (storeId, orders) =>
    set((state) => ({
      orders: {
        ...state.orders,
        [storeId]: orders,
      },
    })),
  clearOrders: (storeId) =>
    set((state) => {
      const { [storeId]: _, ...rest } = state.orders;
      return { orders: rest };
    }),
}));
