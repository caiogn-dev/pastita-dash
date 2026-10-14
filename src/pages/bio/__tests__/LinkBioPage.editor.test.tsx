import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LinkBioPage from '../LinkBioPage';

jest.mock('../../../services/storesApi', () => ({
  getStores: jest.fn(),
  updateStore: jest.fn(),
}));
jest.mock('../../../services/bioApi', () => ({
  listBioLinks: jest.fn(),
  createBioLink: jest.fn(),
  updateBioLink: jest.fn(),
  deleteBioLink: jest.fn(),
  reorderBioLinks: jest.fn(),
  getBioStats: jest.fn(),
}));

const { getStores, updateStore } = jest.requireMock('../../../services/storesApi');
const { listBioLinks, updateBioLink, getBioStats } = jest.requireMock('../../../services/bioApi');

const store = {
  id: 'uuid-1',
  slug: 'ce-saladas',
  name: 'Cê Saladas',
  metadata: { outra: 'chave', bio_settings: { headline: 'Oi', links: {}, instagram_url: '' } },
};

function mount(url = '/stores/ce-saladas/link-bio') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/stores/:storeId/link-bio" element={<LinkBioPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const carregada = () => screen.findByRole('navigation', { name: /partes da página de bio/i });

beforeEach(() => {
  jest.resetAllMocks();
  getStores.mockResolvedValue({ count: 1, next: null, previous: null, results: [store] });
  listBioLinks.mockResolvedValue([
    { id: 'l1', store: 'uuid-1', title: 'Pesquisa', url: 'https://f.gle/x', icon: '📝', sort_order: 0, is_active: true },
  ]);
  getBioStats.mockResolvedValue({
    days: 30,
    page_views: { total: 12, series: [{ date: '2026-07-28', views: 12 }] },
    links: [],
  });
});

describe('LinkBioPage como editor com prévia', () => {
  it('não tem mais botão "Salvar …" por bloco nem a barra antes de mexer', async () => {
    mount();
    await carregada();
    expect(screen.queryByRole('button', { name: /^salvar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /alterações não salvas/i })).not.toBeInTheDocument();
  });

  it('abre a parte que está em ?parte=', async () => {
    mount('/stores/ce-saladas/link-bio?parte=links');
    await carregada();
    expect(screen.getByRole('complementary', { name: 'Links' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^links$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Pesquisa')).toBeInTheDocument();
  });

  it('parte desconhecida cai no perfil e trocar de parte muda o painel', async () => {
    mount('/stores/ce-saladas/link-bio?parte=xyz');
    await carregada();
    expect(screen.getByRole('complementary', { name: 'Perfil' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /botões fixos/i }));
    expect(screen.getByRole('complementary', { name: 'Botões fixos' })).toBeInTheDocument();
  });

  it('a barra aparece ao mudar algo, com a contagem', async () => {
    mount();
    await carregada();
    await userEvent.type(screen.getByLabelText(/headline/i), '!');
    const barra = await screen.findByRole('region', { name: /alterações não salvas/i });
    expect(within(barra).getByText(/1 alteração$/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/instagram/i), 'x');
    expect(within(barra).getByText(/2 alterações/)).toBeInTheDocument();
  });

  it('Salvar chama só updateStore, com o payload de antes', async () => {
    updateStore.mockResolvedValue({ ...store });
    mount();
    await carregada();
    await userEvent.type(screen.getByLabelText(/headline/i), '!');
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(updateStore).toHaveBeenCalledTimes(1));
    expect(updateStore).toHaveBeenCalledWith('uuid-1', {
      metadata: {
        outra: 'chave',
        bio_settings: {
          headline: 'Oi!',
          instagram_url: '',
          links: { menu: true, whatsapp: true, maps: true, instagram: true },
        },
      },
    });
    expect(updateBioLink).not.toHaveBeenCalled();
  });

  it('chave de link e de botão fixo aplicam na hora, fora da barra', async () => {
    updateBioLink.mockResolvedValue({});
    updateStore.mockResolvedValue({ ...store });
    const { unmount } = mount('/stores/ce-saladas/link-bio?parte=links');
    await userEvent.click(await screen.findByRole('switch', { name: /pesquisa/i }));
    await waitFor(() => expect(updateBioLink).toHaveBeenCalledWith('l1', { is_active: false }));
    expect(screen.queryByRole('region', { name: /alterações não salvas/i })).not.toBeInTheDocument();
    unmount();

    mount('/stores/ce-saladas/link-bio?parte=botoes');
    await userEvent.click(await screen.findByRole('switch', { name: /cardápio/i }));
    await waitFor(() => expect(updateStore).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('region', { name: /alterações não salvas/i })).not.toBeInTheDocument();
  });

  it('chave aplicada na hora não leva junto o headline ainda não salvo', async () => {
    updateStore.mockResolvedValue({ ...store });
    mount();
    await carregada();
    await userEvent.type(screen.getByLabelText(/headline/i), '!');
    await userEvent.click(screen.getByRole('button', { name: /botões fixos/i }));
    await userEvent.click(screen.getByRole('switch', { name: /whatsapp/i }));
    await waitFor(() => expect(updateStore).toHaveBeenCalled());
    expect(updateStore.mock.calls[0][1].metadata.bio_settings.headline).toBe('Oi');
  });

  it('Descartar volta ao que está salvo e some com a barra', async () => {
    mount();
    await carregada();
    const campo = screen.getByLabelText(/headline/i);
    await userEvent.type(campo, '!!!');
    expect(campo).toHaveValue('Oi!!!');
    await userEvent.click(screen.getByRole('button', { name: /descartar/i }));
    expect(screen.getByLabelText(/headline/i)).toHaveValue('Oi');
    expect(screen.queryByRole('region', { name: /alterações não salvas/i })).not.toBeInTheDocument();
    expect(updateStore).not.toHaveBeenCalled();
  });

  it('se salvar falha, o rascunho fica e o erro aparece', async () => {
    updateStore.mockRejectedValue({ response: { status: 500, data: {} } });
    mount();
    await carregada();
    await userEvent.type(screen.getByLabelText(/headline/i), '!');
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }));
    expect(await screen.findByText(/não foi possível salvar o conteúdo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/headline/i)).toHaveValue('Oi!');
    expect(screen.getByRole('region', { name: /alterações não salvas/i })).toBeInTheDocument();
  });
});
