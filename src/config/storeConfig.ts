/**
 * Store configuration helpers.
 * Centralizes store slug resolution to avoid hardcoded project-specific fallbacks.
 */

const envStoreSlug = (import.meta.env.VITE_STORE_SLUG || '').trim();

export const DEFAULT_STORE_SLUG: string | null = envStoreSlug.length > 0 ? envStoreSlug : null;

export function normalizeStoreSlug(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function resolveStoreSlug(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const normalized = normalizeStoreSlug(candidate);
    if (normalized) return normalized;
  }
  return DEFAULT_STORE_SLUG;
}

export function requireStoreSlug(...candidates: Array<string | null | undefined>): string {
  const slug = resolveStoreSlug(...candidates);
  if (!slug) {
    throw new Error('Nenhuma loja selecionada e VITE_STORE_SLUG não configurado.');
  }
  return slug;
}
