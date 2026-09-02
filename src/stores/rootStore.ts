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

/**
 * Chave canônica do cache de pedidos: sempre o uuid da loja.
 *
 * Aceita uuid ou slug porque as duas coisas circulam pelo app — o slug vem do
 * parâmetro da rota (`/stores/:storeId/...`) e o uuid vem do rootStore. Se a
 * lista de lojas ainda não carregou, devolve o valor recebido: pior caso o
 * bucket se corrige sozinho quando `setStores` chega.
 *
 * Exportada porque os LEITORES precisam da mesma normalização — normalizar só
 * na escrita deixaria quem lê por slug olhando um bucket vazio.
 */
export const resolveStoreKey = (stores: Store[], value?: string | null): string => {
  if (!value) return '';
  const found = stores.find((s) => s.id === value || s.slug === value);
  return found?.id ?? value;
};

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

const gravarSelecao = (storeId: string | null): void => {
  try {
    if (storeId) localStorage.setItem(SELECTED_STORE_KEY, storeId);
    else localStorage.removeItem(SELECTED_STORE_KEY);
  } catch { /* storage indisponível */ }
};

/**
 * Reescreve o localStorage quando a normalização mudou o valor guardado.
 *
 * Sem isto o slug sobrevive ao reload: `selectedStoreId` nasce de
 * readPersistedStore(), e um slug lá dentro reabre o painel na loja errada
 * até a lista chegar.
 */
const persistirSelecao = <T extends { selectedStoreId: string }>(
  next: T,
  anterior: string | null,
): T => {
  if (next.selectedStoreId !== anterior) gravarSelecao(next.selectedStoreId);
  return next;
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
      if (stores.length === 0) return { stores };
      // A seleção pode ter chegado como SLUG: /stores/:storeId traz o slug e
      // StoreDetailPage repassava esse valor direto. Aqui é o primeiro momento
      // em que existe lista para traduzir, então traduzimos — o resto do app
      // resolve a loja por `find(s => s.id === ...)` e um slug não casa.
      const atual = state.selectedStoreId
        && stores.find((s) => s.id === state.selectedStoreId || s.slug === state.selectedStoreId);
      if (atual) return persistirSelecao({ stores, selectedStoreId: atual.id }, state.selectedStoreId);
      const persisted = readPersistedStore();
      const fromPersisted = persisted
        ? stores.find((s) => s.id === persisted || s.slug === persisted)
        : null;
      return persistirSelecao(
        { stores, selectedStoreId: (fromPersisted || stores[0]).id },
        state.selectedStoreId,
      );
    }),

  // Selected store (persistido entre reloads)
  selectedStoreId: readPersistedStore(),
  setSelectedStore: (storeId) =>
    set((state) => {
      // Normaliza slug -> uuid. Quem chama nem sempre tem o uuid na mão:
      // StoreDetailPage passa o :storeId da rota, que é o slug.
      const uuid = storeId ? resolveStoreKey(state.stores, storeId) : null;
      gravarSelecao(uuid);
      return { selectedStoreId: uuid };
    }),

  // Orders
  //
  // A chave do cache é SEMPRE o uuid da loja, normalizado por resolveStoreKey.
  // Antes cada consumidor usava o que tinha na mão: OrdersPage e KdsPage gravavam
  // por slug (vem da URL) e o useRealTimeOrders gravava por selectedStoreId (uuid).
  // Resultado: o WebSocket escrevia num bucket que o board nunca lia, e o pedido
  // novo só aparecia com refresh manual — no desktop, todo dia. O mobile parecia
  // funcionar só porque useStoreOrdersFeed já gravava por uuid.
  orders: {},
  setOrders: (storeId, orders) =>
    set((state) => ({
      orders: {
        ...state.orders,
        [resolveStoreKey(state.stores, storeId)]: orders,
      },
    })),
  clearOrders: (storeId) =>
    set((state) => {
      const key = resolveStoreKey(state.stores, storeId);
      const { [key]: _, ...rest } = state.orders;
      return { orders: rest };
    }),
}));
