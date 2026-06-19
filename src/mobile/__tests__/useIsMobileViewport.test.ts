import { renderHook, act } from '@testing-library/react';
import { useIsMobileViewport } from '../useIsMobileViewport';

function mockMatchMedia(initialMatches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mql = {
    matches: initialMatches,
    media: '(max-width: 767px)',
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockReturnValue(mql),
  });
  return {
    emit: (matches: boolean) => {
      mql.matches = matches;
      listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent));
    },
  };
}

test('returns true when viewport is below the mobile breakpoint', () => {
  mockMatchMedia(true);
  const { result } = renderHook(() => useIsMobileViewport());
  expect(result.current).toBe(true);
});

test('reacts to viewport changes', () => {
  const ctrl = mockMatchMedia(false);
  const { result } = renderHook(() => useIsMobileViewport());
  expect(result.current).toBe(false);
  act(() => ctrl.emit(true));
  expect(result.current).toBe(true);
});
