import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// CSRF token management
let csrfTokenCache: string | null = null;
let csrfRefreshPromise: Promise<string | null> | null = null;

/**
 * Get CSRF token from cookie
 */
const getCsrfTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') {
    return csrfTokenCache;
  }
  const name = 'csrftoken';
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return cookieValue;
    }
  }
  return csrfTokenCache;
};

/**
 * Fetch CSRF token from server
 */
export const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/csrf/`, {
      withCredentials: true,
    });
    csrfTokenCache = response.data.csrfToken || response.data.csrf_token;
    return csrfTokenCache;
  } catch {
    // CSRF token fetch failed - will retry on next request
    return null;
  }
};

/**
 * Refresh CSRF token (with deduplication)
 */
export const refreshCsrfToken = (): Promise<string | null> => {
  if (!csrfRefreshPromise) {
    csrfRefreshPromise = fetchCsrfToken().finally(() => {
      csrfRefreshPromise = null;
    });
  }
  return csrfRefreshPromise;
};

// Request interceptor to add auth token and CSRF token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    
    // Add CSRF token for non-GET requests
    if (config.method && config.method.toLowerCase() !== 'get') {
      const csrfToken = getCsrfTokenFromCookie();
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
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
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    
    // Handle 403 Forbidden - might be CSRF token issue
    if (error.response?.status === 403 && !originalRequest._retry) {
      const data = error.response.data as { detail?: string };
      if (data?.detail?.toLowerCase().includes('csrf')) {
        originalRequest._retry = true;
        await refreshCsrfToken();
        return api(originalRequest);
      }
    }
    
    // Rate limiting and network errors are handled by the caller via getErrorMessage
    return Promise.reject(error);
  }
);

export default api;

/**
 * Standardized error message extraction.
 * Handles various error response formats from the backend:
 * - { error: { message: "..." } }
 * - { detail: "..." }
 * - { non_field_errors: ["..."] }
 * - { field_name: ["..."] }
 * - Plain string
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    
    // Handle structured error format: { error: { message: "..." } }
    if (data?.error?.message) {
      return data.error.message;
    }
    
    // Handle DRF detail format: { detail: "..." }
    if (data?.detail) {
      return data.detail;
    }
    
    // Handle DRF non_field_errors: { non_field_errors: ["..."] }
    if (data?.non_field_errors && Array.isArray(data.non_field_errors)) {
      return data.non_field_errors[0];
    }
    
    // Handle field-specific errors: { field_name: ["..."] }
    if (typeof data === 'object' && data !== null) {
      const firstKey = Object.keys(data)[0];
      if (firstKey && Array.isArray(data[firstKey])) {
        return `${firstKey}: ${data[firstKey][0]}`;
      }
      if (firstKey && typeof data[firstKey] === 'string') {
        return `${firstKey}: ${data[firstKey]}`;
      }
    }
    
    // Handle plain string response
    if (typeof data === 'string') {
      return data;
    }
    
    // Handle HTTP status codes
    if (error.response?.status === 400) {
      return 'Dados inválidos. Verifique os campos e tente novamente.';
    }
    if (error.response?.status === 401) {
      return 'Sessão expirada. Faça login novamente.';
    }
    if (error.response?.status === 403) {
      return 'Você não tem permissão para realizar esta ação.';
    }
    if (error.response?.status === 404) {
      return 'Recurso não encontrado.';
    }
    if (error.response?.status === 429) {
      return 'Muitas requisições. Aguarde um momento e tente novamente.';
    }
    if (error.response?.status && error.response.status >= 500) {
      return 'Erro no servidor. Tente novamente mais tarde.';
    }
    
    // Network error
    if (error.code === 'ERR_NETWORK') {
      return 'Erro de conexão. Verifique sua internet.';
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Ocorreu um erro inesperado.';
};

/**
 * Get field-specific errors from API response.
 * Returns a map of field names to error messages.
 */
export const getFieldErrors = (error: unknown): Record<string, string> => {
  const fieldErrors: Record<string, string> = {};
  
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    
    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (key === 'error' || key === 'detail' || key === 'non_field_errors') {
          continue;
        }
        if (Array.isArray(value)) {
          fieldErrors[key] = value[0];
        } else if (typeof value === 'string') {
          fieldErrors[key] = value;
        }
      }
    }
  }
  
  return fieldErrors;
};
