import { renderHook, act } from '@testing-library/react';
import { useInstallPrompt } from '../useInstallPrompt';

function fireBIP() {
  const evt = new Event('beforeinstallprompt') as Event & { prompt?: () => void };
  evt.prompt = jest.fn();
  // @ts-expect-error test stub
  evt.preventDefault = jest.fn();
  window.dispatchEvent(evt);
  return evt;
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }),
  });
});

test('captures beforeinstallprompt and exposes canInstall', () => {
  const { result } = renderHook(() => useInstallPrompt());
  expect(result.current.canInstall).toBe(false);
  act(() => { fireBIP(); });
  expect(result.current.canInstall).toBe(true);
});

test('promptInstall triggers the saved event prompt', () => {
  const { result } = renderHook(() => useInstallPrompt());
  let evt: { prompt?: () => void };
  act(() => { evt = fireBIP(); });
  act(() => { result.current.promptInstall(); });
  expect(evt!.prompt).toHaveBeenCalled();
});
