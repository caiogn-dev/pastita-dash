// Polyfill import.meta.env for Jest (ts-jest does not transform Vite env references).
// Only sets keys that are not already defined so real env vars override this stub.
if (typeof globalThis !== 'undefined') {
  // @ts-expect-error import.meta is not available in Jest/CommonJS context
  if (typeof globalThis.importMeta === 'undefined') {
    Object.defineProperty(globalThis, 'import', {
      value: {
        meta: {
          env: {
            VITE_API_URL: process.env.VITE_API_URL ?? '',
            VITE_WS_URL: process.env.VITE_WS_URL ?? '',
            VITE_STOREFRONT_BASE_URL: process.env.VITE_STOREFRONT_BASE_URL ?? '',
            MODE: 'test',
            DEV: false,
            PROD: false,
            SSR: false,
          },
        },
      },
      writable: true,
      configurable: true,
    });
  }
}
