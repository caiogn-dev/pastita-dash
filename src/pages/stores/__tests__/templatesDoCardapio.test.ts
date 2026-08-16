/**
 * Os templates vêm do backend, não de uma lista copiada aqui.
 *
 * A cópia à mão foi o bug: o `banquete` entrou no storefront e o painel não
 * soube, então o dono abriu a tela de aparência e não achou o template que já
 * existia. Lista espelhada é lista que desatualiza em silêncio.
 *
 * O que estes testes travam: a tela consome o backend, e NUNCA fica sem
 * opções — porque uma aparência sem template nenhum é pior que uma lista
 * velha.
 */
import { buscarTemplates, TEMPLATES_DE_EMERGENCIA } from '../templatesDoCardapio';
import api from '../../../services/api';

jest.mock('../../../services/api', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const mockGet = api.get as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('buscarTemplates', () => {
  it('devolve o que o backend lista', async () => {
    mockGet.mockResolvedValue({
      data: { results: [{ id: 'banquete', label: 'Banquete', description: 'x', preview: '🕯️' }] },
    });

    const r = await buscarTemplates();
    expect(mockGet).toHaveBeenCalledWith('/stores/templates/');
    expect(r.map((t) => t.id)).toEqual(['banquete']);
  });

  it('um template NOVO no backend chega sem tocar no painel', async () => {
    // É o ponto da mudança: adicionar template deixa de exigir deploy daqui.
    mockGet.mockResolvedValue({
      data: { results: [{ id: 'inventado-amanha', label: 'Novo', description: 'y', preview: '✨' }] },
    });

    expect((await buscarTemplates()).map((t) => t.id)).toContain('inventado-amanha');
  });

  it('rede caída cai no fallback, não numa tela vazia', async () => {
    mockGet.mockRejectedValue(new Error('offline'));

    const r = await buscarTemplates();
    expect(r).toEqual(TEMPLATES_DE_EMERGENCIA);
    expect(r.length).toBeGreaterThan(0);
  });

  it('resposta vazia também cai no fallback', async () => {
    // Lista vazia é resposta quebrada, não "esta instalação não tem template".
    mockGet.mockResolvedValue({ data: { results: [] } });
    expect(await buscarTemplates()).toEqual(TEMPLATES_DE_EMERGENCIA);
  });

  it('resposta sem `results` não quebra a tela', async () => {
    mockGet.mockResolvedValue({ data: null });
    expect(await buscarTemplates()).toEqual(TEMPLATES_DE_EMERGENCIA);
  });

  it('descarta item incompleto — cartão sem rótulo é cartão em branco', async () => {
    mockGet.mockResolvedValue({
      data: {
        results: [
          { id: 'ok', label: 'Certo', description: 'd', preview: '✅' },
          { id: 'sem-label' },
          { label: 'sem id' },
        ],
      },
    });

    expect((await buscarTemplates()).map((t) => t.id)).toEqual(['ok']);
  });
});

describe('fallback de emergência', () => {
  it('inclui o banquete — é o mais novo e o que motivou a mudança', () => {
    expect(TEMPLATES_DE_EMERGENCIA.map((t) => t.id)).toContain('banquete');
  });

  it('cada item se explica pelo caso de uso, não pela decoração', () => {
    for (const t of TEMPLATES_DE_EMERGENCIA) {
      expect(t.description).toMatch(/ideal para/i);
      expect(t.preview).toBeTruthy();
    }
  });
});
