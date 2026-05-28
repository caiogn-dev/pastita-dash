/**
 * CRM API Service
 *
 * Calls the CRM/PDV endpoints added in Fases 1-3 do plano 2026-05-28.
 * Todos os endpoints são multi-tenant — storeSlug obrigatório.
 *
 * NOTA: As APIs de backend ainda estão sendo implementadas em paralelo.
 * Se um endpoint retornar 404, o serviço lança erro normalmente —
 * os componentes devem exibir um estado de erro ou fallback.
 */

import api from './api';
import type {
  CustomerSearchResult,
  CustomerProfile,
  UserAddress,
  TeamMember,
} from '../types/crm';

export const crmApi = {
  // ── Busca de clientes ─────────────────────────────────────────────────────

  searchCustomers: (storeSlug: string, q: string, limit = 8) =>
    api.get<CustomerSearchResult[]>(
      `/stores/${storeSlug}/crm/customers/search/`,
      { params: { q, limit } }
    ),

  getCustomerProfile: (storeSlug: string, customerId: string) =>
    api.get<CustomerProfile>(
      `/stores/${storeSlug}/crm/customers/${customerId}/`
    ),

  // ── Endereços do cliente ──────────────────────────────────────────────────

  getCustomerAddresses: (storeSlug: string, customerId: string) =>
    api.get<UserAddress[]>(
      `/stores/${storeSlug}/crm/customers/${customerId}/addresses/`
    ),

  saveAddress: (
    storeSlug: string,
    customerId: string,
    address: Partial<UserAddress>
  ) =>
    api.post<UserAddress>(
      `/stores/${storeSlug}/crm/customers/${customerId}/addresses/`,
      address
    ),

  updateAddress: (
    storeSlug: string,
    customerId: string,
    addressId: string,
    address: Partial<UserAddress>
  ) =>
    api.patch<UserAddress>(
      `/stores/${storeSlug}/crm/customers/${customerId}/addresses/${addressId}/`,
      address
    ),

  // ── Equipe ────────────────────────────────────────────────────────────────

  getTeam: (storeSlug: string) =>
    api.get<TeamMember[]>(`/stores/${storeSlug}/team/`),

  addTeamMember: (storeSlug: string, data: { user_id: string; role: string }) =>
    api.post(`/stores/${storeSlug}/team/`, data),

  updateTeamMember: (
    storeSlug: string,
    memberId: string,
    data: Partial<Pick<TeamMember, 'role' | 'is_active'>>
  ) => api.patch(`/stores/${storeSlug}/team/${memberId}/`, data),

  removeTeamMember: (storeSlug: string, memberId: string) =>
    api.delete(`/stores/${storeSlug}/team/${memberId}/`),
};
