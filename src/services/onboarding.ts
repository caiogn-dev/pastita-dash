/**
 * Onboarding self-service — signup do dono + loja em trial.
 * Endpoint público (AllowAny): POST /api/v1/public/signup/
 */
import axios from 'axios';
import api from './api';
import { updateStore, type StoreInput } from './storesApi';

export interface SignupPayload {
  name: string;
  password: string;
  phone?: string;
  email?: string;
  store_name: string;
  store_slug?: string;
  whatsapp?: string;
}

export interface SignupResult {
  token: string;
  user: { id: number; email: string; name: string };
  store: {
    id: string;
    slug: string;
    name: string;
    trial_ends_at: string;
    onboarding_completed: boolean;
  };
}

/**
 * Erros de validação por campo retornados pelo backend (DRF):
 * `{ email: ["já existe"], password: ["fraca"], non_field_errors: [...] }`.
 * `_general` agrega mensagens que não pertencem a um campo específico
 * (non_field_errors, detail, erro de rede).
 */
export type FieldErrors = Record<string, string> & { _general?: string };

export class SignupValidationError extends Error {
  fieldErrors: FieldErrors;
  /** true quando a requisição nem chegou ao servidor (offline/timeout). */
  isNetworkError: boolean;

  constructor(fieldErrors: FieldErrors, isNetworkError = false) {
    super(fieldErrors._general || 'Não foi possível concluir o cadastro.');
    this.name = 'SignupValidationError';
    this.fieldErrors = fieldErrors;
    this.isNetworkError = isNetworkError;
  }
}

/** Normaliza o corpo do erro DRF em um mapa plano `campo -> mensagem`. */
function parseFieldErrors(data: unknown): FieldErrors {
  const out: FieldErrors = {};
  if (!data || typeof data !== 'object') return out;

  const flatten = (value: unknown): string => {
    if (Array.isArray(value)) return value.map(flatten).filter(Boolean).join(' ');
    if (value && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>).map(flatten).filter(Boolean).join(' ');
    }
    return value == null ? '' : String(value);
  };

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const msg = flatten(value);
    if (!msg) continue;
    if (key === 'non_field_errors' || key === 'detail') {
      out._general = out._general ? `${out._general} ${msg}` : msg;
    } else {
      out[key] = msg;
    }
  }
  return out;
}

/** Converte qualquer erro (axios/desconhecido) em SignupValidationError. */
function toSignupError(err: unknown): SignupValidationError {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      // sem resposta = problema de rede/timeout
      return new SignupValidationError(
        { _general: 'Sem conexão com o servidor. Verifique sua internet e tente de novo.' },
        true,
      );
    }
    const fieldErrors = parseFieldErrors(err.response.data);
    if (Object.keys(fieldErrors).length === 0) {
      fieldErrors._general =
        err.response.status >= 500
          ? 'O servidor está com problemas. Tente novamente em instantes.'
          : 'Não foi possível concluir o cadastro. Confira os dados e tente de novo.';
    }
    return new SignupValidationError(fieldErrors);
  }
  return new SignupValidationError({
    _general: err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.',
  });
}

export async function signupOwner(payload: SignupPayload): Promise<SignupResult> {
  try {
    const { data } = await api.post('/public/signup/', payload);
    return data;
  } catch (err) {
    throw toSignupError(err);
  }
}

/**
 * Atualiza branding da loja. Usa updateStore (rota admin /stores/stores/{id}/,
 * a mesma do StorefrontPage) — NÃO usar /stores/{id}/ (cai no catch-all → 405/404).
 * Obs: onboarding_completed ainda não é exposto pelo StoreSerializer; será
 * persistido quando o sub-projeto Billing adicionar o campo ao serializer.
 */
export async function saveStoreBranding(
  storeId: string,
  branding: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
    template?: string;
  },
): Promise<void> {
  try {
    await updateStore(storeId, branding as Partial<StoreInput>);
  } catch (err) {
    throw toSignupError(err);
  }
}
