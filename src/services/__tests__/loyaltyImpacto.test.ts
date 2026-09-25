jest.mock('../api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
import api from '../api';
import { loyaltyImpactoService } from '../loyaltyImpacto';

describe('loyaltyImpactoService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('busca o impacto da loja pelo slug', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { ticket_medio: 42 } });
    const data = await loyaltyImpactoService.get('ce-saladas');
    expect(api.get).toHaveBeenCalledWith('/stores/ce-saladas/loyalty/impacto/');
    expect(data?.ticket_medio).toBe(42);
  });

  it('backend antigo (404) vira null — a tela diz "sem dados ainda", nunca zero', async () => {
    (api.get as jest.Mock).mockRejectedValue({ response: { status: 404 } });
    await expect(loyaltyImpactoService.get('ce-saladas')).resolves.toBeNull();
  });

  it('outro erro sobe para quem chamou', async () => {
    (api.get as jest.Mock).mockRejectedValue({ response: { status: 500 } });
    await expect(loyaltyImpactoService.get('ce-saladas')).rejects.toBeTruthy();
  });
});
