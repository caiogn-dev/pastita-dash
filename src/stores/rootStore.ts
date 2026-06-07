import { create } from 'zustand';
import type { StoreOrder } from '../services/storesApi';

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

interface Store {
  id: string;
  slug: string;
  name: string;
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

export const useRootStore = create<RootStore>((set) => ({
  // Auth
  auth: {
    user: null,
    token: null,
  },
  setAuth: (auth) => set({ auth }),
  clearAuth: () => set({ auth: { user: null, token: null } }),

  // Stores
  stores: [],
  setStores: (stores) => set({ stores }),

  // Selected store
  selectedStoreId: null,
  setSelectedStore: (storeId) => set({ selectedStoreId: storeId }),

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
