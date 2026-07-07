/**
 * Billing / Planos — leitura pública dos planos do SaaS.
 *
 * Pagamento via MercadoPago: subscribe, cancelar e trocar plano.
 * Este serviço lê o catálogo público de planos, expõe os tipos de billing
 * que o backend anexa ao Store, e gerencia o ciclo de vida da assinatura.
 *
 * Contrato backend (live):
 *   GET /api/v1/public/plans/  (público, sem auth)
 *     → { plans: [{ key, name, setup_fee, monthly_price, limits: {...} }] }
 */
import api from './api';
import type { Store } from './storesApi';

/** Chaves canônicas de plano expostas pelo backend. */
export type PlanKey = 'free' | 'starter' | 'pro' | 'premium';

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
  /** Preço anual (cobrança única no plano anual). Só planos pagos trazem este campo. */
  annual_price?: number;
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

/** Estado da assinatura retornado pelo backend (Task 8). */
export interface SubscriptionStatus {
  status: 'none' | 'trialing' | 'active' | 'past_due' | 'suspended' | 'canceled';
  plan?: PlanKey;
  current_period_end?: string | null;
  setup_fee_paid?: boolean;
  grace_until?: string | null;
  /** Loja foi rebaixada para o plano gratuito por falta de pagamento (Task 1). */
  downgraded_for_nonpayment?: boolean;
}

export async function getSubscription(storeSlug: string): Promise<SubscriptionStatus> {
  const { data } = await api.get(`/stores/${storeSlug}/subscription/`);
  return data;
}

export async function cancelSubscription(storeSlug: string): Promise<{ status: string }> {
  const { data } = await api.post(`/stores/${storeSlug}/subscription/cancel/`);
  return data;
}

export async function changePlan(
  storeSlug: string,
  plan: PlanKey,
): Promise<{ init_point: string; preapproval_id?: string }> {
  const { data } = await api.post(`/stores/${storeSlug}/subscription/change-plan/`, { plan });
  return data;
}

/** Fatura PIX de assinatura (mensal/anual), gerada pelo backend de billing. */
export interface Invoice {
  id: string;
  amount: number;
  status: string; // ex.: 'pending' | 'completed' | 'expired'
  kind: 'monthly' | 'annual' | null;
  pix_code: string | null; // copia-e-cola (qr_code)
  pix_qr_code: string | null; // base64 (qr_code_base64)
  ticket_url: string | null;
  expires_at: string | null; // vencimento
  period_key: string | null; // 'YYYY-MM' | 'YYYY'
  paid_at: string | null;
}

/** GET /stores/{slug}/invoices/current/ — fatura em aberto da loja, se houver. */
export async function getCurrentInvoice(storeSlug: string): Promise<Invoice | null> {
  const { data } = await api.get(`/stores/${storeSlug}/invoices/current/`);
  return data?.invoice ?? null;
}

/** GET /stores/{slug}/invoices/ — histórico de faturas da loja. */
export async function listInvoices(storeSlug: string): Promise<Invoice[]> {
  const { data } = await api.get(`/stores/${storeSlug}/invoices/`);
  return Array.isArray(data?.invoices) ? data.invoices : [];
}
