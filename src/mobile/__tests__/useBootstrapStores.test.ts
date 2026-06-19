import { renderHook, waitFor } from '@testing-library/react';

const getStores = jest.fn();
jest.mock('../../services/storesApi', () => ({ getStores: (...a: unknown[]) => getStores(...a) }));

let authed = true;
jest.mock('../../stores/authStore', () => ({
  useAuthStore: (sel: (s: { isAuthenticated: boolean }) => unknown) => sel({ isAuthenticated: authed }),
}));

import { useRootStore } from '../../stores/rootStore';
import { useBootstrapStores } from '../useBootstrapStores';

beforeEach(() => {
  getStores.mockClear();
  getStores.mockResolvedValue({ results: [{ id: 's1', name: 'Loja 1', slug: 'loja-1' }] });
  useRootStore.setState({ stores: [], selectedStoreId: null } as never);
  authed = true;
});

test('fetches stores and sets them when authenticated and stores empty', async () => {
  renderHook(() => useBootstrapStores());
  await waitFor(() => expect(getStores).toHaveBeenCalled());
  await waitFor(() => expect(useRootStore.getState().stores).toHaveLength(1));
  // setStores auto-selects stores[0]
  expect(useRootStore.getState().selectedStoreId).toBe('s1');
});

test('does not fetch when stores already loaded', async () => {
  useRootStore.setState({ stores: [{ id: 's1', name: 'L', slug: 'l' }] } as never);
  renderHook(() => useBootstrapStores());
  await Promise.resolve();
  expect(getStores).not.toHaveBeenCalled();
});

test('does not fetch when not authenticated', async () => {
  authed = false;
  renderHook(() => useBootstrapStores());
  await Promise.resolve();
  expect(getStores).not.toHaveBeenCalled();
});
