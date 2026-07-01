import '@testing-library/jest-dom';

// jsdom não implementa ResizeObserver (usado por @headlessui/react Dialog).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom não implementa scrollIntoView (usado por listas de chat que rolam até o fim).
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
