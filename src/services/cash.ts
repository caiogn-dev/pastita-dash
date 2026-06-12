/** Caixa PDV — sessão, sangria/reforço e fechamento (endpoints novos no server2). */
import api from './api';

export interface CashMovement {
  id: string;
  kind: 'sangria' | 'reforco';
  amount: string;
  reason: string;
  created_at: string;
}

export interface CashSession {
  id: string;
  status: 'open' | 'closed';
  opening_amount: string;
  opened_at: string;
  counted_amount: string | null;
  expected_amount: string | null;
  difference: string | null;
  closed_at: string | null;
  notes: string;
  movements: CashMovement[];
  expected_cash: string;
}

const base = (slug: string) => `/stores/${slug}/cash`;

export const getCurrentCashSession = (storeSlug: string) =>
  api.get<CashSession>(`${base(storeSlug)}/current/`);

export const openCashSession = (storeSlug: string, openingAmount: string) =>
  api.post<CashSession>(`${base(storeSlug)}/open/`, { opening_amount: openingAmount });

export const addCashMovement = (
  storeSlug: string,
  data: { kind: 'sangria' | 'reforco'; amount: string; reason?: string },
) => api.post<CashMovement>(`${base(storeSlug)}/movement/`, data);

export const closeCashSession = (storeSlug: string, countedAmount: string, notes = '') =>
  api.post<CashSession>(`${base(storeSlug)}/close/`, { counted_amount: countedAmount, notes });
