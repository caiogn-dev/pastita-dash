import '@testing-library/jest-dom';

// O fuso determinístico da suíte (America/Sao_Paulo) é fixado ANTES de o Jest
// carregar, em `scripts/jest-tz.cjs` (rodado por `npm test`). Não dá para fixá-lo
// aqui: o V8/ICU lê o fuso uma única vez no início do processo, então uma
// atribuição neste setup chegaria tarde demais (o worker já cacheou UTC).

// jsdom não implementa ResizeObserver (usado por @headlessui/react Dialog).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
