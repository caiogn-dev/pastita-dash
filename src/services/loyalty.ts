import api from './api';

export interface LoyaltyAccountRow {
  user_id: string;
  display_name: string;
  email: string;
  qualified_count: number;
  redeemed_count: number;
  progress: number;
  available_rewards: number;
  updated_at: string;
}

export interface LoyaltyAccountsResponse {
  count: number;
  results: LoyaltyAccountRow[];
}

class LoyaltyService {
  async getAccounts(storeSlug: string, page = 1): Promise<LoyaltyAccountsResponse> {
    const { data } = await api.get(`/stores/${storeSlug}/loyalty/accounts/`, { params: { page } });
    return data;
  }
}

export const loyaltyService = new LoyaltyService();
export default loyaltyService;
