/**
 * Fonte ÚNICA de leitura do token de autenticação.
 *
 * O token é persistido pelo zustand (persist) na chave `auth-storage` do
 * localStorage. Todo consumidor (axios interceptor, WebSocket, realtime)
 * deve ler via getAuthToken() — nunca parsear localStorage por conta própria.
 *
 * O backend (server2) usa DRF Token Auth exclusivamente:
 * header `Authorization: Token <key>` — não existe JWT/Bearer.
 */
import { useAuthStore } from '../stores/authStore';

const STORAGE_KEY = 'auth-storage';

/** Lê o token: zustand primeiro; fallback para o persist cru (timing de hydration). */
export const getAuthToken = (): string | null => {
  const fromStore = useAuthStore.getState().token;
  if (fromStore && fromStore.trim()) return fromStore.trim();

  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (token && typeof token === 'string' && token.trim()) {
        return token.trim();
      }
    }
  } catch {
    // persist corrompido — trata como deslogado
  }
  return null;
};

/** Monta o header Authorization no formato DRF Token. */
export const buildAuthHeader = (token?: string | null): string | null => {
  const t = (token ?? getAuthToken())?.trim();
  return t ? `Token ${t}` : null;
};
