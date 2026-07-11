import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

  it('nomeia os botões de editar e excluir com o nome da faixa (mobile e desktop)', async () => {
    renderPage();

    const editar = await screen.findAllByRole('button', { name: /Editar faixa Centro/i });
    const excluir = await screen.findAllByRole('button', { name: /Excluir faixa Centro/i });

    expect(editar).toHaveLength(2);
    expect(excluir).toHaveLength(2);
  });

  it('não deixa botões de ação com nome genérico "Editar"/"Excluir" sem contexto', async () => {
    renderPage();
    await waitFor(() => expect(mockedService.getZones).toHaveBeenCalled());

    expect(screen.queryByRole('button', { name: /^Editar$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Excluir$/i })).toBeNull();
  });
});
