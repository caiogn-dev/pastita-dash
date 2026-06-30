import '@testing-library/jest-dom';

// jsdom não implementa ResizeObserver (usado por @headlessui/react Dialog).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
