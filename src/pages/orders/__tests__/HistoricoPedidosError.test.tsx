import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// api.ts/logger.ts usam import.meta.env (Vite-only); mockar evita avaliação pelo ts-jest.
jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock('../../../services/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../../services/storesApi');
jest.mock('../../../hooks', () => ({
  useStore: () => ({ storeId: 'loja-1', storeSlug: 'loja-1' }),
  useDebounce: (v: unknown) => v,
}));
// O modal de detalhe puxa muita dependência e não é o alvo do teste.
jest.mock('../../../components/orders/OrderDetailModal', () => ({
  OrderDetailModal: () => null,
}));

// Controla as duas queries da página (lista e resumo) pelo primeiro item da
// queryKey, para simular falha/carregamento sem servidor real.
const listaRefetch = jest.fn();
const resumoRefetch = jest.fn();
let listaState: Record<string, unknown>;
let resumoState: Record<string, unknown>;
jest.mock('@tanstack/react-query', () => ({
  keepPreviousData: undefined,
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'historico-pedidos') return { ...listaState, refetch: listaRefetch };
    if (queryKey[0] === 'historico-resumo') return { ...resumoState, refetch: resumoRefetch };
    return { data: undefined, isLoading: false, isError: false, refetch: jest.fn() };
  },
}));

import { HistoricoPedidosPage } from '../HistoricoPedidosPage';

beforeEach(() => {
  listaRefetch.mockClear();
  resumoRefetch.mockClear();
  resumoState = { data: undefined, isLoading: false, isError: false };
});

test('lista falha sem cache → erro acionável, nunca o "Nenhum pedido" enganoso', () => {
  listaState = { data: undefined, isLoading: false, isError: true, error: new Error('500') };

  render(<MemoryRouter><HistoricoPedidosPage /></MemoryRouter>);

  // O EmptyState de "nenhum pedido" leria como "você não vendeu nada" quando na
  // verdade a requisição falhou — não pode aparecer.
  expect(screen.queryByText(/nenhum pedido neste recorte/i)).not.toBeInTheDocument();

  // Mostra erro acionável e o botão refaz a busca (lista + resumo).
  expect(screen.getByText(/não foi possível carregar o histórico/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  expect(listaRefetch).toHaveBeenCalled();
  expect(resumoRefetch).toHaveBeenCalled();
});

const umPedido = () => ({
  id: 'o1',
  order_number: '1234',
  created_at: '2026-08-10T12:00:00Z',
  customer_name: 'Maria',
  customer_phone: '11999999999',
  items: [],
  combo_items: [],
  source: 'web',
  payment_method: 'pix',
  payment_status: 'paid',
  status: 'delivered',
  total: 50,
});

test('lista com dados → renderiza a tabela, sem estado de erro', () => {
  listaState = {
    data: { count: 1, results: [umPedido()] },
    isLoading: false,
    isError: false,
  };

  render(<MemoryRouter><HistoricoPedidosPage /></MemoryRouter>);

  expect(screen.getByText('#1234')).toBeInTheDocument();
  expect(screen.queryByText(/não foi possível carregar o histórico/i)).not.toBeInTheDocument();
});

test('lista ok mas resumo falha sem cache → KPIs mostram erro acionável, não somem em silêncio', () => {
  listaState = {
    data: { count: 1, results: [umPedido()] },
    isLoading: false,
    isError: false,
  };
  resumoState = { data: undefined, isLoading: false, isError: true, error: new Error('500') };

  render(<MemoryRouter><HistoricoPedidosPage /></MemoryRouter>);

  // A tabela (conteúdo primário) continua visível.
  expect(screen.getByText('#1234')).toBeInTheDocument();
  // Os indicadores não podem simplesmente sumir: mostram erro + "Tentar novamente".
  expect(screen.getByText(/não foi possível carregar os indicadores/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
  expect(resumoRefetch).toHaveBeenCalled();
});
