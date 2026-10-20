import api from '../api';
import { getCombos } from '../storesApi';

jest.mock('../api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('../logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// 20/10: a lista de combos mostrava só a 1ª página (20). Do 21º em diante o
// combo sumia do painel — sem como editar nem desativar.
it('getCombos pede a lista inteira, não a primeira página de 20', async () => {
  (api.get as jest.Mock).mockResolvedValue({ data: { count: 0, results: [] } });
  await getCombos('loja-1');
  expect(api.get).toHaveBeenCalledWith(expect.stringMatching(/\/combos\/$/), {
    params: { store: 'loja-1', page_size: 500 },
  });
});
