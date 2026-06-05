import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAutoLogout?: boolean;
    _retryCount?: number;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token-based auth — cookies not needed for API requests
// withCredentials was removed: it caused cross-origin issues and is unnecessary
// since all auth is done via Authorization header (not session cookies)

// Helper to get token from localStorage directly (bypasses zustand hydration timing)
const getTokenFromStorage = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (token && typeof token === 'string') {
        return token.trim() || null;
      }
    }
  } catch (err) {
    console.warn('[Auth] Failed to parse token from localStorage:', err);
  }
  return null;
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Priority order: axios defaults > zustand store > localStorage fallback
    let token: string | null = null;

    // Check axios defaults first (set by setAuthToken after login)
    const defaultAuth = api.defaults.headers.common?.Authorization;
    if (defaultAuth && typeof defaultAuth === 'string') {
      token = defaultAuth.replace(/^(Token |Bearer )/, '');
    }

    // Try zustand store (primary source after login)
    if (!token) {
      token = useAuthStore.getState().token;
    }

    // Fallback: read directly from localStorage (handles hydration timing)
    if (!token) {
      token = getTokenFromStorage();
    }

    // Apply token to request
    if (token && token.trim()) {
      if (token.includes('.')) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        config.headers.Authorization = `Token ${token}`;
      }
    }

    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const httpStatus = error.response?.status;
    const errorData = error.response?.data as { code?: string } | undefined;
    const errorCode = errorData?.code;
    const requestUrl = error.config?.url || '';

    // Only logout on 401/403 if:
    // 1. The request actually had an Authorization header (token was sent)
    // 2. It's not a login/register endpoint (those return 401 for invalid credentials)
    // 3. skipAutoLogout flag is not set on the request
    // 4. We're outside the post-login grace period (15s) — handles DB replication lag
    //    where the token exists on the write DB but hasn't synced to read replicas yet
    const hadAuthHeader = Boolean(error.config?.headers?.Authorization);
    const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
    const skipAutoLogout = Boolean(error.config?.skipAutoLogout);
    const retryCount = error.config?._retryCount ?? 0;

    const { loginTimestamp } = useAuthStore.getState();
    const msSinceLogin = loginTimestamp ? Date.now() - loginTimestamp : Infinity;
    const inLoginGracePeriod = msSinceLogin < 15_000;

    // During the post-login grace period, 401s are caused by DB replication lag
    // (token written to primary but not yet synced to read replicas).
    // Auto-retry up to 2 times with a 2s delay so data loads once the replica catches up.
    if (
      inLoginGracePeriod &&
      httpStatus === 401 &&
      hadAuthHeader &&
      !isAuthEndpoint &&
      retryCount < 2
    ) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          api.request({ ...error.config, _retryCount: retryCount + 1 })
            .then(resolve)
            .catch(reject);
        }, 2000);
      });
    }

    if (
      !skipAutoLogout &&
      !inLoginGracePeriod &&
      (httpStatus === 401 || errorCode === 'token_not_valid') &&
      hadAuthHeader &&
      !isAuthEndpoint
    ) {
      useAuthStore.getState().logout(); // also clears chatStore + rootStore
      try {
        delete api.defaults.headers.common.Authorization;
      } catch {
        /* ignore */
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Helpers para uploads multipart — o interceptor de request já remove Content-Type
// automaticamente quando config.data é uma instância de FormData
export const postForm = (url: string, data: FormData, config?: Parameters<typeof api.post>[2]) =>
  api.post(url, data, config);

export const patchForm = (url: string, data: FormData, config?: Parameters<typeof api.patch>[2]) =>
  api.patch(url, data, config);

// Allow immediate setting/clearing of the Authorization header
export const setAuthToken = (token: string | null): void => {
  if (token) {
    if (token.includes('.')) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      api.defaults.headers.common.Authorization = `Token ${token}`;
    }
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

// Helper function to handle API errors
const stringifyApiErrorValue = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => stringifyApiErrorValue(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(', ') : null;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nestedMessage =
      stringifyApiErrorValue(record.message) ||
      stringifyApiErrorValue(record.detail) ||
      stringifyApiErrorValue(record.error) ||
      stringifyApiErrorValue(record.details);
    if (nestedMessage) return nestedMessage;

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    return (
      stringifyApiErrorValue(data?.error) ||
      stringifyApiErrorValue(data?.message) ||
      stringifyApiErrorValue(data?.detail) ||
      stringifyApiErrorValue(data) ||
      error.message ||
      'An unexpected error occurred'
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

/**
 * Normalize paginated response from Django REST Framework
 * Handles both paginated ({ results: [], count, next, previous }) and direct array responses
 */
export function normalizePaginatedResponse<T>(data: unknown): T[] {
  if (!data) {
    return [];
  }

  // If it's a paginated response, return results array
  if (typeof data === 'object' && data !== null && 'results' in data) {
    const results = (data as { results: unknown }).results;
    if (Array.isArray(results)) {
      return results as T[];
    }
  }

  // If it's a direct array, return it
  if (Array.isArray(data)) {
    return data as T[];
  }

  // Log unexpected format — avoid logging data which may contain sensitive fields
  console.error('[API] Unexpected response format (type:', typeof data, ')');
  return [];
}

export function normalizePaginatedEnvelope<T>(data: unknown): {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
} {
  if (typeof data === 'object' && data !== null && 'results' in data) {
    const envelope = data as {
      count?: unknown;
      next?: unknown;
      previous?: unknown;
      results?: unknown;
    };
    const results = Array.isArray(envelope.results) ? envelope.results as T[] : [];
    return {
      count: typeof envelope.count === 'number' ? envelope.count : results.length,
      next: typeof envelope.next === 'string' ? envelope.next : null,
      previous: typeof envelope.previous === 'string' ? envelope.previous : null,
      results,
    };
  }

  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data as T[],
    };
  }

  console.error('[API] Unexpected paginated response format (type:', typeof data, ')');
  return {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };
}
