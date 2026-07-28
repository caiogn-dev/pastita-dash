import { render, screen, waitFor } from '@testing-library/react';
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

const { getStores } = jest.requireMock('../../../services/storesApi');
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

describe('LinkBioPage', () => {
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

  it('mostra a URL pública da bio e os links customizados', async () => {
    mount();
    await waitFor(() => expect(screen.getByText(/bio\.cardapidex\.com\.br\/ce-saladas/)).toBeInTheDocument());
    expect(screen.getByText('Pesquisa')).toBeInTheDocument();
  });

  it('mostra paywall quando stats devolve 403', async () => {
    getBioStats.mockRejectedValue({ response: { status: 403, data: { detail: 'Estatísticas do Link na Bio são exclusivas dos planos Pro e Premium. Faça upgrade do plano.' } } });
    mount();
    await waitFor(() => expect(screen.getByText(/exclusivas dos planos Pro e Premium/)).toBeInTheDocument());
  });
});
