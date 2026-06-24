/**
 * Minimal Jest code transformer: replaces `import.meta.env` with a
 * process.env-based stub before ts-jest compiles the TypeScript.
 *
 * Needed because ts-jest (CommonJS mode) does not transform Vite's
 * `import.meta.env` pattern, causing "Cannot use 'import.meta' outside
 * a module" at runtime.
 */

const tsJest = require('ts-jest');
// Use the legacy preset so we get a working transformer factory
const { TsJestTransformer } = tsJest;

const tsJestInstance = new TsJestTransformer({
  diagnostics: false,
});

const ENV_STUB = `({
  VITE_API_URL: (typeof process !== 'undefined' && process.env.VITE_API_URL) || '',
  VITE_WS_URL: (typeof process !== 'undefined' && process.env.VITE_WS_URL) || '',
  VITE_STOREFRONT_BASE_URL: (typeof process !== 'undefined' && process.env.VITE_STOREFRONT_BASE_URL) || '',
  MODE: 'test',
  DEV: true,
  PROD: false,
  SSR: false,
})`;

module.exports = {
  process(src, filename, options) {
    const patched = src.replace(/import\.meta\.env/g, ENV_STUB);
    return tsJestInstance.process(patched, filename, options);
  },
  getCacheKey(src, filename, options) {
    const patched = src.replace(/import\.meta\.env/g, ENV_STUB);
    if (tsJestInstance.getCacheKey) {
      return tsJestInstance.getCacheKey(patched, filename, options);
    }
    return JSON.stringify({ src: patched, filename });
  },
};
