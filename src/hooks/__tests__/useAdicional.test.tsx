import { renderHook, waitFor, act } from '@testing-library/react';

const mockGetSubscription = jest.fn();
const mockGetAdicionais = jest.fn();
const mockContratar = jest.fn();
const mockCancelar = jest.fn();

jest.mock('../../services/billing', () => ({
  __esModule: true,
  ADICIONAL_ETIQUETA: 'etiqueta_anvisa',
  getSubscription: (...a: unknown[]) => mockGetSubscription(...a),
  getAdicionais: (...a: unknown[]) => mockGetAdicionais(...a),
  contratarAdicional: (...a: unknown[]) => mockContratar(...a),
  cancelarAdicional: (...a: unknown[]) => mockCancelar(...a),
}));

jest.mock('../useStore', () => ({
  __esModule: true,
  useStore: () => ({ storeSlug: 'loja-1' }),
}));

import { useAdicional } from '../useAdicional';

const ETIQUETA = {
  key: 'etiqueta_anvisa', nome: 'Etiqueta nutricional ANVISA', descricao: 'd',
  inclui: ['TACO'], implantacao: 390, mensal: 79, anual: 790,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAdicionais.mockResolvedValue([ETIQUETA]);
});

describe('useAdicional', () => {
  it('sem o adicional na assinatura: disponível e bloqueado', async () => {
    mockGetSubscription.mockResolvedValue({ status: 'active', adicionais: [] });
    const { result } = renderHook(() => useAdicional('etiqueta_anvisa'));
    await waitFor(() => expect(result.current.estado).toBe('disponivel'));
    expect(result.current.liberado).toBe(false);
    expect(result.current.adicional?.mensal).toBe(79);
    expect(mockGetSubscription).toHaveBeenCalledWith('loja-1');
  });

  it('contratado: liberado', async () => {
    mockGetSubscription.mockResolvedValue({ status: 'active', adicionais: ['etiqueta_anvisa'] });
    const { result } = renderHook(() => useAdicional('etiqueta_anvisa'));
    await waitFor(() => expect(result.current.estado).toBe('contratado'));
    expect(result.current.liberado).toBe(true);
  });

  it('loja isenta: incluso (sem botão de cancelar)', async () => {
    mockGetSubscription.mockResolvedValue({
      status: 'none', adicionais: ['etiqueta_anvisa'], adicionais_inclusos: ['etiqueta_anvisa'],
    });
    const { result } = renderHook(() => useAdicional('etiqueta_anvisa'));
    await waitFor(() => expect(result.current.estado).toBe('incluso'));
    expect(result.current.liberado).toBe(true);
  });

  it('falha ao ler a assinatura não tranca quem paga — o portão do servidor decide', async () => {
    mockGetSubscription.mockRejectedValue(new Error('rede'));
    const { result } = renderHook(() => useAdicional('etiqueta_anvisa'));
    await waitFor(() => expect(result.current.estado).toBe('desconhecido'));
    expect(result.current.liberado).toBe(true);
  });

  it('contratar libera na hora', async () => {
    mockGetSubscription.mockResolvedValue({ status: 'active', adicionais: [] });
    mockContratar.mockResolvedValue(['etiqueta_anvisa']);
    const { result } = renderHook(() => useAdicional('etiqueta_anvisa'));
    await waitFor(() => expect(result.current.estado).toBe('disponivel'));
    await act(async () => { await result.current.contratar(); });
    expect(mockContratar).toHaveBeenCalledWith('loja-1', 'etiqueta_anvisa');
    expect(result.current.estado).toBe('contratado');
  });

  it('contratar sem plano mostra o motivo que o servidor deu', async () => {
    mockGetSubscription.mockResolvedValue({ status: 'canceled', adicionais: [] });
    mockContratar.mockRejectedValue({
      response: { status: 400, data: { detail: 'Assine um plano para contratar o adicional.' } },
    });
    const { result } = renderHook(() => useAdicional('etiqueta_anvisa'));
    await waitFor(() => expect(result.current.estado).toBe('disponivel'));
    await act(async () => { await result.current.contratar(); });
    expect(result.current.erro).toBe('Assine um plano para contratar o adicional.');
    expect(result.current.estado).toBe('disponivel');
  });

  it('cancelar volta a bloquear', async () => {
    mockGetSubscription.mockResolvedValue({ status: 'active', adicionais: ['etiqueta_anvisa'] });
    mockCancelar.mockResolvedValue([]);
    const { result } = renderHook(() => useAdicional('etiqueta_anvisa'));
    await waitFor(() => expect(result.current.estado).toBe('contratado'));
    await act(async () => { await result.current.cancelar(); });
    expect(mockCancelar).toHaveBeenCalledWith('loja-1', 'etiqueta_anvisa');
    expect(result.current.estado).toBe('disponivel');
  });
});
