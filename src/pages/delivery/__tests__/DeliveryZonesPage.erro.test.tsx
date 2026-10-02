import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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

const paginaDeZonas = (results: (typeof zone)[]) =>
  ({ count: results.length, next: null, previous: null, results }) as never;

function renderPage() {
  return render(
    <MemoryRouter>
      <DeliveryZonesPage />
    </MemoryRouter>,
  );
}

describe('DeliveryZonesPage — vazio enganoso nas faixas de entrega', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedService.getStats.mockResolvedValue({} as never);
    mockedService.getStoreLocation.mockResolvedValue(null as never);
  });

  it('busca de faixas que FALHA mostra erro acionável, não "Nenhuma faixa cadastrada"', async () => {
    // As faixas calculam o frete (dinheiro). Dizer "cadastre sua primeira faixa"
    // para uma loja que já tem a grade montada, só porque a consulta caiu, faz
    // o dono recriar o que já existe — ou achar que o frete parou.
    mockedService.getZones.mockRejectedValue(new Error('500'));

    renderPage();

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Não foi possível carregar as faixas de entrega');
    expect(screen.queryByText('Nenhuma faixa cadastrada')).toBeNull();
  });

  it('"Tentar novamente" refaz a busca e mostra as faixas quando ela volta', async () => {
    mockedService.getZones.mockRejectedValueOnce(new Error('500'));

    renderPage();

    await screen.findByRole('alert');

    // A rede volta: o retry tem de buscar de novo e trazer a faixa real.
    mockedService.getZones.mockResolvedValue(paginaDeZonas([zone]));
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }));

    await waitFor(() => expect(screen.getAllByText('Centro').length).toBeGreaterThan(0));
    expect(screen.queryByText('Não foi possível carregar as faixas de entrega')).toBeNull();
    expect(mockedService.getZones).toHaveBeenCalledTimes(2);
  });

  it('rejeição de uma busca superada NÃO vira erro sobre o vazio legítimo da mais nova', async () => {
    // Trocar a busca com uma requisição em voo deixa as duas correndo. Sem
    // guarda de sequência, a REJEIÇÃO da superada ligava `erroAoCarregar` DEPOIS
    // de a mais recente já ter respondido vazio — trocando o vazio legítimo pelo
    // alerta de falha. (Antes de surfarmos o erro, isso era invisível; agora não.)
    let rejeitarSuperada: (e: unknown) => void = () => {};
    const superada = new Promise((_, reject) => {
      rejeitarSuperada = reject;
    });
    mockedService.getZones
      .mockResolvedValueOnce(paginaDeZonas([zone])) // 1ª (montagem): abre a tela
      .mockReturnValueOnce(superada as never) // 2ª: fica em voo e rejeita depois
      .mockResolvedValueOnce(paginaDeZonas([])); // 3ª (a mais recente): vazio legítimo

    renderPage();
    await screen.findAllByText('Centro');

    // Duas trocas de busca: a 2ª fica em voo, a 3ª é a mais recente.
    const busca = screen.getByPlaceholderText(/buscar por nome/i);
    fireEvent.change(busca, { target: { value: 'a' } });
    fireEvent.change(busca, { target: { value: 'ab' } });

    // A mais recente resolveu vazio → vazio legítimo.
    expect(await screen.findByText('Nenhuma faixa cadastrada')).toBeInTheDocument();

    // Agora a superada rejeita: não pode sobrepor o vazio com o erro de carga.
    await act(async () => {
      rejeitarSuperada(new Error('500'));
      await Promise.resolve();
    });

    expect(screen.queryByText('Não foi possível carregar as faixas de entrega')).toBeNull();
    expect(screen.getByText('Nenhuma faixa cadastrada')).toBeInTheDocument();
  });

  it('busca que DEU CERTO e veio vazia mantém o "Nenhuma faixa cadastrada"', async () => {
    // O vazio legítimo continua valendo: sem falha, zero faixa é zero faixa.
    mockedService.getZones.mockResolvedValue(paginaDeZonas([]));

    renderPage();

    expect(await screen.findByText('Nenhuma faixa cadastrada')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
