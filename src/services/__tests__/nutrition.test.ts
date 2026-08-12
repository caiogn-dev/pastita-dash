import api from '../api';
import { salvarRevisaoDeAlergenicos } from '../nutrition';

jest.mock('../api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockPost = (api as unknown as { post: jest.Mock }).post;
const mockPatch = (api as unknown as { patch: jest.Mock }).patch;

const revisao = { allergens: ['soja'], may_contain: [], allergens_reviewed: true };

beforeEach(() => { jest.clearAllMocks(); });

describe('salvarRevisaoDeAlergenicos', () => {
  it('ingrediente da loja é salvo com PATCH direto', async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: 'ing-1' } });

    const r = await salvarRevisaoDeAlergenicos(
      { id: 'ing-1', store: 'loja-1' }, revisao, 'loja-1',
    );

    expect(mockPatch).toHaveBeenCalledWith('/nutrition/ingredients/ing-1/', revisao);
    expect(mockPost).not.toHaveBeenCalled();
    expect(r).toEqual({ id: 'ing-1', adotado: false });
  });

  it('alimento oficial é ADOTADO — PATCH nele responde 400', async () => {
    // A base TACO/POF é compartilhada entre lojistas; o backend a protege.
    // Mandar PATCH aqui era o bug que travava as 27 receitas em produção.
    mockPost.mockResolvedValueOnce({ data: { id: 'copia-1' } });

    const r = await salvarRevisaoDeAlergenicos(
      { id: 'taco-1', store: null }, revisao, 'loja-1',
    );

    expect(mockPatch).not.toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith('/nutrition/ingredients/taco-1/adotar/', {
      store: 'loja-1', ...revisao,
    });
    // O id MUDA: quem passa a valer na receita é a cópia.
    expect(r).toEqual({ id: 'copia-1', adotado: true });
  });

  it('sem loja selecionada, recusa antes de chamar a API', async () => {
    await expect(
      salvarRevisaoDeAlergenicos({ id: 'taco-1', store: null }, revisao, undefined),
    ).rejects.toThrow(/loja/i);

    expect(mockPost).not.toHaveBeenCalled();
    expect(mockPatch).not.toHaveBeenCalled();
  });
});
