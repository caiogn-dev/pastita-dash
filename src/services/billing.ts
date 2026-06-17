/**
 * Billing / Planos — leitura pública dos planos do SaaS.
 *
 * Pagamento (MercadoPago) ainda NÃO existe: a UI de assinatura é placeholder.
 * Este serviço só lê o catálogo público de planos e expõe os tipos de billing
 * que o backend já anexa ao objeto Store (plan/trial_ends_at/onboarding_completed).
 *
 * Contrato backend (live):
 *   GET /api/v1/public/plans/  (público, sem auth)
 *     → { plans: [{ key, name, setup_fee, monthly_price, limits: {...} }] }
 */
import api from './api';
import type { Store } from './storesApi';

/** Chaves canônicas de plano expostas pelo backend. */
export type PlanKey = 'starter' | 'pro' | 'premium';

/** Limites/recursos de um plano. `max_products: null` significa ilimitado. */
export interface PlanLimits {
  /** Máximo de produtos; `null` = ilimitado. */
  max_products: number | null;
  /** Domínio próprio liberado. */
  custom_domain: boolean;
  /** Bot de WhatsApp liberado. */
  whatsapp_bot: boolean;
  /** Agente de IA liberado. */
  ai_agent: boolean;
}

/** Um plano do catálogo público. */
export interface Plan {
  key: PlanKey;
  name: string;
  /** Taxa de adesão (cobrança única). Em BRL. */
  setup_fee: number;
  /** Mensalidade. Em BRL. */
  monthly_price: number;
  limits: PlanLimits;
}

interface PlansResponse {
  plans: Plan[];
}

/**
 * Campos de billing que o backend anexa ao Store (read-only).
 * O tipo `Store` em storesApi.ts ainda não os declara (arquivo em uso por
 * outros fluxos), então expomos um augment local + helper de leitura segura.
 */
export interface StoreBillingFields {
  plan?: PlanKey | null;
  trial_ends_at?: string | null;
  onboarding_completed?: boolean;
}

export type StoreWithBilling = Store & StoreBillingFields;

/**
 * Lê os campos de billing de um Store de forma type-safe, sem depender de o
 * tipo `Store` canônico declará-los.
 */
export function getStoreBilling(store: Store | null | undefined): StoreBillingFields {
  if (!store) return {};
  const s = store as StoreWithBilling;
  return {
    plan: s.plan ?? null,
    trial_ends_at: s.trial_ends_at ?? null,
    onboarding_completed: s.onboarding_completed ?? false,
  };
}

/**
 * Dias inteiros restantes de trial a partir de agora.
 * Retorna `null` se não houver trial; `0` se já expirou.
 */
export function trialDaysRemaining(
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Inicia a assinatura de um plano (preapproval MercadoPago). Retorna o
 * init_point — o dono autoriza o cartão lá. NÃO cobra automaticamente.
 */
export async function subscribe(
  storeSlug: string,
  plan: PlanKey,
): Promise<{ init_point: string; preapproval_id: string }> {
  const { data } = await api.post(`/stores/${storeSlug}/subscribe/`, { plan });
  return data;
}

/**
 * GET /public/plans/ — catálogo público de planos (sem auth).
 * `skipAutoLogout` evita que um eventual 401 derrube a sessão (é público).
 */
export async function getPlans(): Promise<Plan[]> {
  const { data } = await api.get<PlansResponse>('/public/plans/', {
    skipAutoLogout: true,
  });
  return Array.isArray(data?.plans) ? data.plans : [];
}
