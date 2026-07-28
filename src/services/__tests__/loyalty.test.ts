jest.mock('../api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
import api from '../api';
import { loyaltyService } from '../loyalty';

describe('loyaltyService', () => {
  it('busca contas com slug e página', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { count: 0, results: [] } });
    const data = await loyaltyService.getAccounts('ce-saladas', 2);
    expect(api.get).toHaveBeenCalledWith('/stores/ce-saladas/loyalty/accounts/', { params: { page: 2 } });
    expect(data.count).toBe(0);
  });
});
