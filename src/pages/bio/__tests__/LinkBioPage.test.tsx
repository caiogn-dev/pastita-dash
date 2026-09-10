import { render, screen, waitFor } from '@testing-library/react';
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
const { listBioLinks, getBioStats } = jest.requireMock('../../../services/bioApi');

const store = {
  id: 'uuid-1', slug: 'ce-saladas', name: 'Cê Saladas',
  metadata: { bio_settings: { headline: 'Oi', links: {}, instagram_url: '' } },
};

function mount() {
  return render(
    <MemoryRouter initialEntries={['/stores/ce-saladas/link-bio']}>
      <Routes>
        <Route path="/stores/:storeId/link-bio" element={<LinkBioPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.resetAllMocks();
  getStores.mockResolvedValue({ count: 1, next: null, previous: null, results: [store] });
  listBioLinks.mockResolvedValue([
    { id: 'l1', store: 'uuid-1', title: 'Pesquisa', url: 'https://f.gle/x', icon: '📝', sort_order: 0, is_active: true },
  ]);
  getBioStats.mockResolvedValue({
    days: 30,
    page_views: { total: 12, series: [{ date: '2026-07-28', views: 12 }] },
    links: [{ key: 'custom:l1', title: 'Pesquisa', total: 5 }],
  });
});

describe('LinkBioPage', () => {
  it('mostra a URL pública da bio e os links customizados', async () => {
    mount();
    await waitFor(() => expect(screen.getByText(/bio\.cardapidex\.com\.br\/ce-saladas/)).toBeInTheDocument());
    expect(screen.getByText('Pesquisa')).toBeInTheDocument();
  });

  it('mostra paywall quando stats devolve 403', async () => {
    getBioStats.mockRejectedValue({ response: { status: 403, data: { detail: 'Estatísticas do Link na Bio são exclusivas dos planos Pro e Premium. Faça upgrade do plano.' } } });
    mount();
    // detail do 403 aparece na seção de estatísticas E no PaywallModal compartilhado
    await waitFor(() => expect(screen.getAllByText(/exclusivas dos planos Pro e Premium/).length).toBeGreaterThan(1));
  });

  it('mostra erro visível quando salvar o conteúdo falha (sem unhandled rejection)', async () => {
    updateStore.mockRejectedValue({ response: { status: 500, data: {} } });
    mount();
    await waitFor(() => expect(screen.getByText(/bio\.cardapidex\.com\.br\/ce-saladas/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }));
    await waitFor(() => expect(screen.getByText(/não foi possível salvar o conteúdo/i)).toBeInTheDocument());
  });

  it('abre o paywall quando salvar o conteúdo devolve 403', async () => {
    updateStore.mockRejectedValue({
      response: { status: 403, data: { detail: 'Links personalizados são exclusivos dos planos Pro e Premium. Faça upgrade do plano.' } },
    });
    mount();
    await waitFor(() => expect(screen.getByText(/bio\.cardapidex\.com\.br\/ce-saladas/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }));
    await waitFor(() => expect(screen.getAllByText(/exclusivos dos planos Pro e Premium/).length).toBeGreaterThan(0));
  });
});

/**
 * O que o dono viu: desligou opções e "não atualizou".
 *
 * A página tinha DOIS modelos de salvamento na mesma tela — o switch do link
 * personalizado aplicava na hora, o switch do botão fixo esperava um "Salvar"
 * que ficava quatro campos abaixo. Um switch que não aplica é um switch que
 * mente: quem desliga vê a chave virar e vai embora.
 */
describe('botões fixos aplicam na hora', () => {
  const { updateBioLink } = jest.requireMock('../../../services/bioApi');

  it('desligar o Cardápio salva sozinho, sem passar pelo Salvar', async () => {
    updateStore.mockResolvedValue({ ...store });
    mount();
    await screen.findByRole('switch', { name: /cardápio/i });

    await userEvent.click(screen.getByRole('switch', { name: /cardápio/i }));

    await waitFor(() => expect(updateStore).toHaveBeenCalled());
    const [, payload] = updateStore.mock.calls[0];
    expect(payload.metadata.bio_settings.links.menu).toBe(false);
  });

  it('se o salvamento falha, a chave VOLTA — não fica mentindo ligada', async () => {
    updateStore.mockRejectedValue({ response: { status: 500, data: {} } });
    mount();
    const chave = await screen.findByRole('switch', { name: /whatsapp/i });
    expect(chave).toBeChecked();

    await userEvent.click(chave);

    await waitFor(() => expect(screen.getByRole('switch', { name: /whatsapp/i })).toBeChecked());
    expect(screen.getByText(/não foi possível/i)).toBeInTheDocument();
  });

  it('o link personalizado continua aplicando na hora', async () => {
    updateBioLink.mockResolvedValue({});
    mount();
    const chave = await screen.findByRole('switch', { name: /pesquisa/i });
    await userEvent.click(chave);
    await waitFor(() => expect(updateBioLink).toHaveBeenCalledWith('l1', { is_active: false }));
  });
});

describe('a linha do link', () => {
  it('guarda mover e excluir atrás de um kebab, com rótulo em texto', async () => {
    mount();
    await screen.findByText('Pesquisa');

    // Antes: "↑", "↓" e "Excluir" soltos na linha, o destrutivo colado nos
    // inofensivos e três alvos comendo a largura que é do dado.
    expect(screen.queryByRole('button', { name: '↑' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /ações do link pesquisa/i }));
    expect(screen.getByRole('menuitem', { name: /excluir/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /mover para cima/i })).toBeInTheDocument();
  });

  it('link desligado se anuncia como oculto, não só com a chave cinza', async () => {
    listBioLinks.mockResolvedValue([
      { id: 'l1', store: 'uuid-1', title: 'Pesquisa', url: 'https://f.gle/x', icon: '📝', sort_order: 0, is_active: false },
    ]);
    mount();
    expect(await screen.findByText(/oculto/i)).toBeInTheDocument();
  });
});
