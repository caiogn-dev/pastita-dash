import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { StorefrontPage } from '../StorefrontPage';
import * as storesApi from '../../../services/storesApi';

// ── Mocks das dependências que puxam import.meta / rede ──────────────────────
jest.mock('../../../services/storesApi', () => ({
  getStore: jest.fn(),
  updateStore: jest.fn(),
  updateStoreWithFiles: jest.fn(),
  // A página monta a seção de banners, que lista ao abrir.
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
jest.mock('../../../hooks/usePreviaAoVivo', () => ({
  usePreviaAoVivo: () => ({ registrarIframe: jest.fn(), enviarRascunho, focar }),
}));

jest.mock('../../../utils/storefrontUrl', () => ({
  buildStorefrontUrl: () => 'https://x',
  buildStorefrontPreviewUrl: () => 'https://x/preview/loja-x',
}));

// templatesDoCardapio importa services/api (import.meta) — mock completo com a
// mesma lista de emergência usada em produção. (Lista inline: jest.mock é
// hoisted acima de qualquer const do módulo.)
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
  PageShell: ({ children, acoes }: { children: React.ReactNode; acoes?: React.ReactNode }) => <div>{acoes}{children}</div>,
  PhonePreview: () => null,
}));

jest.mock('react-hot-toast', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const mockedApi = storesApi as jest.Mocked<typeof storesApi>;

const cardDe = (label: string) => screen.getByText(label).closest('button') as HTMLButtonElement;

const renderPage = (aba = 'marca') =>
  render(
    <MemoryRouter initialEntries={[`/?aba=${aba}`]}>
      <StorefrontPage />
    </MemoryRouter>,
  );

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
  it('reverte o cartão de template selecionado quando o save falha', async () => {
    mockedApi.updateStore.mockRejectedValue(new Error('500 do domínio'));

    renderPage();

    // Carga: 'Fresh' é o template persistido → cartão destacado.
    await waitFor(() => expect(cardDe('Fresh').className).toContain('border-brand'));

    // Dono clica 'Bold' (otimista) → passa a destacado.
    fireEvent.click(cardDe('Bold'));
    expect(cardDe('Bold').className).toContain('border-brand');
    expect(cardDe('Fresh').className).not.toContain('border-brand');

    // Salva e FALHA.
    fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

    // Rollback: volta a 'Fresh' (o que o backend realmente tem), 'Bold' desmarca.
    await waitFor(() => expect(cardDe('Fresh').className).toContain('border-brand'));
    expect(cardDe('Bold').className).not.toContain('border-brand');
    expect(mockedApi.updateStore).toHaveBeenCalledTimes(1);
  });
});

describe('StorefrontPage — um salvar só, e a prévia muda antes de salvar', () => {
  it('a barra só aparece com alteração, e Descartar volta ao salvo', async () => {
    renderPage();
    await waitFor(() => expect(cardDe('Fresh').className).toContain('border-brand'));
    expect(screen.queryByRole('region', { name: /alterações não salvas/i })).not.toBeInTheDocument();

    fireEvent.click(cardDe('Bold'));
    expect(screen.getByRole('region', { name: /alterações não salvas/i })).toHaveTextContent('1 alteração');

    fireEvent.click(screen.getByRole('button', { name: /descartar/i }));
    expect(cardDe('Fresh').className).toContain('border-brand');
    expect(screen.queryByRole('region', { name: /alterações não salvas/i })).not.toBeInTheDocument();
  });

  it('o template escolhido vai para a prévia sem salvar', async () => {
    renderPage();
    await waitFor(() => expect(cardDe('Fresh').className).toContain('border-brand'));
    fireEvent.click(cardDe('Bold'));
    await waitFor(() => expect(enviarRascunho).toHaveBeenLastCalledWith(
      expect.objectContaining({ loja: expect.objectContaining({ template: 'bold' }) }),
    ));
    expect(mockedApi.updateStore).not.toHaveBeenCalled();
  });

  it('exibição: muda na prévia e grava só o que mudou, pela mesma barra', async () => {
    salvarExibicao.mockResolvedValue({ ...EXIBICAO, foto_posicao: 'direita' });
    renderPage('cardapio');
    const direita = await screen.findByRole('radio', { name: /à direita/i });
    fireEvent.click(direita);

    await waitFor(() => expect(enviarRascunho).toHaveBeenLastCalledWith(
      expect.objectContaining({ exibicao: expect.objectContaining({ foto_posicao: 'direita' }) }),
    ));
    expect(focar).toHaveBeenCalledWith('cartao');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));
    });
    expect(salvarExibicao).toHaveBeenCalledWith('loja-x', { foto_posicao: 'direita' });
    // Loja não mudou: não manda PATCH da loja à toa.
    expect(mockedApi.updateStore).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('region', { name: /alterações não salvas/i })).not.toBeInTheDocument());
  });

  it('erro da exibição aparece e o rascunho fica', async () => {
    salvarExibicao.mockRejectedValue({ response: { data: { error: 'Texto com no máximo 60 caracteres.' } } });
    renderPage('cardapio');
    fireEvent.click(await screen.findByRole('radio', { name: /à direita/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('60 caracteres');
    expect(screen.getByRole('radio', { name: /à direita/i })).toHaveAttribute('aria-checked', 'true');
  });
});
