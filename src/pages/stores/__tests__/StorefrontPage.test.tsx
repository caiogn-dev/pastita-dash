/**
 * Storefront — editor em três colunas (13/10): partes da vitrine à esquerda,
 * a vitrine de verdade no meio (muda a cada clique, sem salvar), propriedades
 * da parte escolhida à direita. Clicar numa parte da prévia abre a
 * configuração dela. Um salvar só, na barra de cima.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { StorefrontPage } from '../StorefrontPage';
import * as storesApi from '../../../services/storesApi';

// ── Mocks das dependências que puxam import.meta / rede ──────────────────────
jest.mock('../../../services/storesApi', () => ({
  getStore: jest.fn(),
  updateStore: jest.fn(),
  updateStoreWithFiles: jest.fn(),
  MAXIMO_DE_BANNERS: 3,
  listarBanners: jest.fn().mockResolvedValue([]),
  subirBanner: jest.fn(),
  apagarBanner: jest.fn(),
}));

jest.mock('../../../services/api', () => ({ __esModule: true, default: {} }));

const lerExibicao = jest.fn();
const salvarExibicao = jest.fn();
const lerCatalogo = jest.fn();
jest.mock('../../../services/exibicaoDoCardapio', () => {
  const real = jest.requireActual('../../../services/exibicaoDoCardapio');
  return {
    ...real,
    exibicaoDoCardapioService: { ler: (...a: unknown[]) => lerExibicao(...a), salvar: (...a: unknown[]) => salvarExibicao(...a) },
    catalogoDaLojaService: { ler: (...a: unknown[]) => lerCatalogo(...a) },
  };
});

jest.mock('../../../services', () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : 'erro'),
}));

jest.mock('../../../hooks', () => ({
  useStore: () => ({ storeId: 'loja-x', stores: [] }),
}));

const enviarRascunho = jest.fn();
const focar = jest.fn();
const inspecionar = jest.fn();
const previa: { onSelecionar?: (area: string) => void } = {};
jest.mock('../../../hooks/usePreviaAoVivo', () => ({
  usePreviaAoVivo: (_url: string, opcoes: { onSelecionar?: (area: string) => void } = {}) => {
    previa.onSelecionar = opcoes.onSelecionar;
    return { registrarIframe: jest.fn(), enviarRascunho, focar, inspecionar };
  },
}));

jest.mock('../../../utils/storefrontUrl', () => ({
  buildStorefrontUrl: () => 'https://x',
  buildStorefrontPreviewUrl: () => 'https://x/preview/loja-x',
}));

jest.mock('../templatesDoCardapio', () => {
  const lista = [
    { id: 'fresh', label: 'Fresh', description: 'd', preview: '🥗' },
    { id: 'bold', label: 'Bold', description: 'd', preview: '🍔' },
    { id: 'classic', label: 'Classic', description: 'd', preview: '🍱' },
  ];
  return { TEMPLATES_DE_EMERGENCIA: lista, buscarTemplates: jest.fn().mockResolvedValue(lista) };
});

jest.mock('../../../components/ui', () => ({
  ...jest.requireActual('../../../components/ui'),
  PageShell: ({ children, acoes, titulo }: { children: React.ReactNode; acoes?: React.ReactNode; titulo?: string }) => <div><h1>{titulo}</h1>{acoes}{children}</div>,
  PhonePreview: ({ sobreposicao, acoesExtras }: { sobreposicao?: React.ReactNode; acoesExtras?: React.ReactNode }) => (
    <div data-testid="previa">{acoesExtras}{sobreposicao}</div>
  ),
}));

jest.mock('react-hot-toast', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const mockedApi = storesApi as jest.Mocked<typeof storesApi>;

const renderPage = (parte = 'estilo') =>
  render(
    <MemoryRouter initialEntries={[`/?parte=${parte}`]}>
      <StorefrontPage />
    </MemoryRouter>,
  );

const template = (nome: RegExp) => screen.getByRole('radio', { name: nome });

const lojaFresh = {
  id: 's1',
  slug: 'loja-x',
  name: 'Loja X',
  template: 'fresh',
  primary_color: '#111111',
  secondary_color: '#222222',
  tagline: '',
  custom_domain: '',
} as never;

const EXIBICAO = jest.requireActual('../../../services/exibicaoDoCardapio').EXIBICAO_PADRAO;

beforeEach(() => {
  jest.clearAllMocks();
  mockedApi.getStore.mockResolvedValue(lojaFresh);
  lerExibicao.mockResolvedValue({ ...EXIBICAO });
  lerCatalogo.mockResolvedValue({ products: [] });
});

describe('StorefrontPage — rollback do rascunho quando o save falha', () => {
  it('reverte o template escolhido quando o save falha', async () => {
    mockedApi.updateStore.mockRejectedValue(new Error('500 do domínio'));
    renderPage();

    await waitFor(() => expect(template(/fresh/i)).toHaveAttribute('aria-checked', 'true'));
    fireEvent.click(template(/bold/i));
    expect(template(/bold/i)).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('button', { name: /^publicar$/i }));

    // Rollback: volta a 'Fresh' (o que o backend realmente tem).
    await waitFor(() => expect(template(/fresh/i)).toHaveAttribute('aria-checked', 'true'));
    expect(template(/bold/i)).toHaveAttribute('aria-checked', 'false');
    expect(mockedApi.updateStore).toHaveBeenCalledTimes(1);
  });
});

describe('StorefrontPage — editor', () => {
  it('a barra de salvar só aparece com alteração, e Descartar volta ao salvo', async () => {
    renderPage();
    await waitFor(() => expect(template(/fresh/i)).toHaveAttribute('aria-checked', 'true'));
    expect(screen.queryByRole('region', { name: /alterações não salvas/i })).not.toBeInTheDocument();

    fireEvent.click(template(/bold/i));
    expect(screen.getByRole('region', { name: /alterações não salvas/i })).toHaveTextContent('1 alteração');
    // A parte com alteração pendente ganha um ponto na lista da esquerda.
    expect(within(screen.getByRole('button', { name: /cores e modelo/i })).getByLabelText(/não salvo/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /descartar/i }));
    expect(template(/fresh/i)).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('region', { name: /alterações não salvas/i })).not.toBeInTheDocument();
  });

  it('o template escolhido vai para a prévia sem salvar', async () => {
    renderPage();
    await waitFor(() => expect(template(/fresh/i)).toHaveAttribute('aria-checked', 'true'));
    fireEvent.click(template(/bold/i));
    await waitFor(() => expect(enviarRascunho).toHaveBeenLastCalledWith(
      expect.objectContaining({ loja: expect.objectContaining({ template: 'bold' }) }),
    ));
    expect(mockedApi.updateStore).not.toHaveBeenCalled();
  });

  it('escolher a parte na lista abre as propriedades dela e leva a prévia até lá', async () => {
    renderPage('topo');
    fireEvent.click(await screen.findByRole('button', { name: /como o prato aparece/i }));
    expect(screen.getByRole('radiogroup', { name: 'Posição da foto' })).toBeInTheDocument();
    expect(focar).toHaveBeenCalledWith('cartao');
  });

  it('clicar numa parte da PRÉVIA abre a configuração dela (inspetor)', async () => {
    renderPage('topo');
    await screen.findByRole('radiogroup', { name: 'Formato do logo' });
    act(() => { previa.onSelecionar?.('estoque'); });
    expect(screen.getByRole('switch', { name: /mostrar esgotados/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /esgotados e estoque/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('inspetor nasce ligado e desliga pelo botão', async () => {
    renderPage('topo');
    const botao = await screen.findByRole('button', { name: /inspecionar/i });
    expect(botao).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(inspecionar).toHaveBeenLastCalledWith(true));
    fireEvent.click(botao);
    expect(inspecionar).toHaveBeenLastCalledWith(false);
  });

  it('exibição: muda na prévia e grava só o que mudou, pela mesma barra', async () => {
    salvarExibicao.mockResolvedValue({ ...EXIBICAO, foto_posicao: 'direita' });
    renderPage('cartao');
    const grupo = await screen.findByRole('radiogroup', { name: 'Posição da foto' });
    fireEvent.click(within(grupo).getByRole('radio', { name: 'Direita' }));

    await waitFor(() => expect(enviarRascunho).toHaveBeenLastCalledWith(
      expect.objectContaining({ exibicao: expect.objectContaining({ foto_posicao: 'direita' }) }),
    ));
    expect(focar).toHaveBeenCalledWith('cartao');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^publicar$/i }));
    });
    expect(salvarExibicao).toHaveBeenCalledWith('loja-x', { foto_posicao: 'direita' });
    expect(mockedApi.updateStore).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('region', { name: /alterações não salvas/i })).not.toBeInTheDocument());
  });

  it('erro da exibição aparece e o rascunho fica', async () => {
    salvarExibicao.mockRejectedValue({ response: { data: { error: 'Texto com no máximo 60 caracteres.' } } });
    renderPage('cartao');
    const grupo = await screen.findByRole('radiogroup', { name: 'Posição da foto' });
    fireEvent.click(within(grupo).getByRole('radio', { name: 'Direita' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^publicar$/i }));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('60 caracteres');
    expect(within(grupo).getByRole('radio', { name: 'Direita' })).toHaveAttribute('aria-checked', 'true');
  });

  it('pedido feito: a tela de agradecimento aparece por cima da prévia', async () => {
    renderPage('pedido');
    const previaEl = await screen.findByTestId('previa');
    expect(within(previaEl).getByText('Pedido confirmado!')).toBeInTheDocument();
  });
});

describe('Aparência da loja — nome e fluxo (20/10)', () => {
  it('título em português, partes agrupadas por assunto e Publicar/Ver loja', async () => {
    renderPage('topo');
    expect(await screen.findByRole('heading', { level: 1, name: 'Aparência da loja' })).toBeInTheDocument();
    expect(screen.queryByText('Storefront')).toBeNull();

    const partes = screen.getByRole('navigation', { name: /partes da vitrine/i });
    expect(within(partes).getByText('Marca')).toBeInTheDocument();
    expect(within(partes).getByText('Cardápio')).toBeInTheDocument();
    expect(within(partes).getByText('Depois do pedido')).toBeInTheDocument();
    expect(within(partes).getByRole('button', { name: /logo e capa/i })).toHaveAttribute('aria-pressed', 'true');

    expect(screen.getByText('Publicado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver loja/i })).toHaveAttribute('href', 'https://x');
  });
});
