jest.mock('../../config/storeConfig', () => ({
  DEFAULT_STORE_SLUG: null,
  resolveStoreSlug: (...c: Array<string | null | undefined>) => c.find(Boolean) ?? null,
  normalizeStoreSlug: (s: string | null | undefined) => s || null,
}));

import { getStoreSlugWithFallback, getStoreIdWithFallback } from '../useStore';
import { useRootStore } from '../../stores/rootStore';

const STORES = [
  { id: 'uuid-1', slug: 'loja-a', name: 'A' },
  { id: 'uuid-2', slug: 'loja-b', name: 'B' },
];

describe('getStoreSlugWithFallback', () => {
  beforeEach(() => useRootStore.setState({ stores: STORES, selectedStoreId: null }));

  it('retorna o slug da loja selecionada (resolvido pelo id)', () => {
    useRootStore.setState({ selectedStoreId: 'uuid-2' });
    expect(getStoreSlugWithFallback()).toBe('loja-b');
  });

  it('getStoreIdWithFallback retorna o id da loja selecionada', () => {
    useRootStore.setState({ selectedStoreId: 'uuid-1' });
    expect(getStoreIdWithFallback()).toBe('uuid-1');
  });

  it('sem loja selecionada cai no fallback (null em multi-tenant sem env)', () => {
    useRootStore.setState({ selectedStoreId: null });
    expect(getStoreSlugWithFallback()).toBeNull();
  });
});
