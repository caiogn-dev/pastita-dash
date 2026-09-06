import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DeliveryZonesPage } from '../DeliveryZonesPage';
import { deliveryService } from '../../../services/delivery';

jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../services/delivery', () => ({
  deliveryService: {
    getZones: jest.fn(),
    getStats: jest.fn(),
    getStoreLocation: jest.fn(),
    createZone: jest.fn(),
    updateZone: jest.fn(),
    deleteZone: jest.fn(),
    toggleActive: jest.fn(),
  },
}));

// A página passou a ler o metadata da loja (zonas de preço fixo). Sem o mock,
// o import do storesApi carrega o cliente axios, que exige VITE_API_URL e
// derruba a suíte inteira antes do primeiro teste.
jest.mock('../../../services/storesApi', () => ({
  getStore: jest.fn().mockResolvedValue({ id: 'store-1', metadata: {} }),
  updateStore: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../../hooks', () => ({
  useStore: () => ({
    storeId: 'store-1',
    stores: [{ id: 'store-1', slug: 'loja-teste', name: 'Loja Teste' }],
  }),
}));

const mockedService = deliveryService as jest.Mocked<typeof deliveryService>;

const zone = {
  id: 'zone-1',
  name: 'Centro',
  distance_label: '0 - 5 km',
  min_km: 0,
  max_km: 5,
  delivery_fee: 8,
  estimated_days: 1,
  is_active: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <DeliveryZonesPage />
    </MemoryRouter>
  );
}

describe('DeliveryZonesPage — acessibilidade dos botões de ação', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedService.getZones.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [zone],
    } as never);
    mockedService.getStats.mockResolvedValue({} as never);
    mockedService.getStoreLocation.mockResolvedValue(null as never);
  });

  it('nomeia toda porta de entrada de ação com o nome da faixa', async () => {
    renderPage();

    // Esta página escrevia a lista DUAS VEZES no mesmo arquivo — cartões para
    // o celular, tabela para o desktop — e as duas divergiam na ação: no
    // cartão, lápis e lixeira nus e colados; na linha, um kebab. Hoje as duas
    // apresentações saem da MESMA definição de coluna, então a ação é uma só.
    // O jsdom não aplica CSS e por isso as duas aparecem; no navegador,
    // `md:hidden` esconde a que não é da vez, do olho e do leitor de tela.
    const kebab = await screen.findAllByRole('button', { name: /Ações da faixa Centro/i });
    expect(kebab).toHaveLength(2);

    // E a lixeira não fica mais solta na superfície do cartão, exatamente
    // onde o polegar cai ao rolar a lista.
    expect(screen.queryByRole('button', { name: /Excluir faixa Centro/i })).toBeNull();
  });

  it('o menu da linha nomeia a faixa, e não só a ação', async () => {
    renderPage();
    fireEvent.click((await screen.findAllByRole('button', { name: /Ações da faixa Centro/i }))[0]);

    const menu = screen.getByRole('menu', { name: /Ações da faixa Centro/i });
    expect(within(menu).getByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Excluir' })).toBeInTheDocument();
  });

  it('não deixa botões de ação com nome genérico "Editar"/"Excluir" sem contexto', async () => {
    renderPage();
    await waitFor(() => expect(mockedService.getZones).toHaveBeenCalled());

    expect(screen.queryByRole('button', { name: /^Editar$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Excluir$/i })).toBeNull();
  });
});
