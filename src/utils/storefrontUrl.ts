const DEFAULT_STOREFRONT_BASE_URL =
  import.meta.env.VITE_STOREFRONT_BASE_URL || 'https://cardapidex.com.br';

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const stripProtocol = (value: string) => value.replace(/^https?:\/\//i, '').replace(/\/+$/, '');

type StorefrontStore = {
  slug?: string | null;
  custom_domain?: string | null;
  metadata?: Record<string, unknown>;
};

const metadataString = (
  metadata: Record<string, unknown> | undefined,
  keys: string[],
): string | null => {
  if (!metadata) return null;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) {
      return stripTrailingSlash(value.trim());
    }
  }
  return null;
};

export const buildStorefrontUrl = (
  store: StorefrontStore | null | undefined,
  path = '',
): string => {
  const customDomain = store?.custom_domain?.trim();
  const metadataUrl = metadataString(store?.metadata, [
    'storefront_url',
    'storefront_origin',
    'site_url',
    'website',
    'public_url',
  ]);

  const base = customDomain
    ? `https://${stripProtocol(customDomain)}`
    : metadataUrl || `${stripTrailingSlash(DEFAULT_STOREFRONT_BASE_URL)}/${store?.slug || ''}`;

  const normalizedBase = stripTrailingSlash(base);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return path ? `${normalizedBase}${normalizedPath}` : normalizedBase;
};
