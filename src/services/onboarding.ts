/**
 * Onboarding self-service — signup do dono + loja em trial.
 * Endpoint público (AllowAny): POST /api/v1/public/signup/
 */
import api from './api';

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

export async function signupOwner(payload: SignupPayload): Promise<SignupResult> {
  const { data } = await api.post('/public/signup/', payload);
  return data;
}

/** Atualiza branding da loja + marca onboarding como concluído. */
export async function saveStoreBranding(
  storeId: string,
  branding: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
    template?: string;
    onboarding_completed?: boolean;
  },
): Promise<void> {
  await api.patch(`/stores/${storeId}/`, branding);
}
