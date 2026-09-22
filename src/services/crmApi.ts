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

  /** Convida pelo TELEFONE — o dono da loja não sabe o id de ninguém.
   *
   * O contrato antigo pedia `user_id` e era `UUIDField` no backend enquanto a
   * chave do usuário é inteira: toda chamada voltava 400 e nenhum membro
   * nunca foi criado por aqui. Corrigido em 22/09 nos dois lados.
   *
   * Reconvidar quem saiu reativa; reconvidar quem está dentro troca o papel.
   * O backend devolve 201 no primeiro convite e 200 na atualização.
   */
  addTeamMember: (
    storeSlug: string,
    data: { phone: string; name?: string; role: string },
  ) => api.post<TeamMember>(`/stores/${storeSlug}/team/`, data),

  updateTeamMember: (
    storeSlug: string,
    memberId: string,
    data: Partial<Pick<TeamMember, 'role' | 'is_active'>>
  ) => api.patch(`/stores/${storeSlug}/team/${memberId}/`, data),

  removeTeamMember: (storeSlug: string, memberId: string) =>
    api.delete(`/stores/${storeSlug}/team/${memberId}/`),
};
