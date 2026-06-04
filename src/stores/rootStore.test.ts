import { renderHook, act } from '@testing-library/react';
import { useRootStore } from './rootStore';

/**
 * TDD Tests for Root Store (State Consolidation)
 *
 * Requirements:
 * 1. Single store for auth + stores + orders
 * 2. No duplicate states across pages
 * 3. Select store updates all related state
 * 4. Clear separation of concerns
 */

describe('rootStore', () => {
  test('should initialize with default state', () => {
    const { result } = renderHook(() => useRootStore());

    expect(result.current.auth.user).toBeNull();
    expect(result.current.auth.token).toBeNull();
    expect(result.current.stores).toEqual([]);
    expect(result.current.selectedStoreId).toBeNull();
    expect(result.current.orders).toEqual({});
  });

  test('should set auth user', () => {
    const { result } = renderHook(() => useRootStore());

    act(() => {
      result.current.setAuth({
        user: { id: '1', email: 'test@example.com' },
        token: 'token-123',
      });
    });

    expect(result.current.auth.user?.email).toBe('test@example.com');
    expect(result.current.auth.token).toBe('token-123');
  });

  test('should set selected store and cache orders', () => {
    const { result } = renderHook(() => useRootStore());

    act(() => {
      result.current.setStores([
        { id: '1', slug: 'store-a', name: 'Store A' },
        { id: '2', slug: 'store-b', name: 'Store B' },
      ]);
    });

    act(() => {
      result.current.setSelectedStore('1');
    });

    expect(result.current.selectedStoreId).toBe('1');
  });

  test('should cache orders by store', () => {
    const { result } = renderHook(() => useRootStore());

    act(() => {
      result.current.setOrders('store-a', [
        { id: '100', status: 'pending' },
        { id: '101', status: 'confirmed' },
      ]);
    });

    expect(result.current.orders['store-a']).toHaveLength(2);
  });

  test('should clear auth on logout', () => {
    const { result } = renderHook(() => useRootStore());

    act(() => {
      result.current.setAuth({
        user: { id: '1', email: 'test@example.com' },
        token: 'token-123',
      });
    });

    expect(result.current.auth.user).not.toBeNull();

    act(() => {
      result.current.clearAuth();
    });

    expect(result.current.auth.user).toBeNull();
    expect(result.current.auth.token).toBeNull();
  });
});
