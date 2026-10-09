import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Store } from '../../../services/storesApi';

// A rota do KDS passa o SLUG da loja em :storeId (CLAUDE.md / rotas). O cache de
// pedidos, porém, é SEMPRE chaveado pelo UUID da loja — `rootStore.setOrders`
// normaliza slug→uuid por dentro. O caminho otimista do clique tem que LER pela
// mesma chave normalizada; se ler por slug, acha um balde vazio e grava `[]` por
// cima do quadro inteiro.
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useParams: () => ({ storeId: 'loja-1' }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

// O tempo real não entra neste teste: só o caminho otimista do clique.
jest.mock('../../../hooks/useRealTimeOrders', () => ({
  __esModule: true,
  useRealTimeOrders: jest.fn(),
}));

const mockGetOrders = jest.fn();
const mockUpdateOrderStatus = jest.fn();
jest.mock('../../../services/storesApi', () => ({
  __esModule: true,
  getOrders: (...a: unknown[]) => mockGetOrders(...a),
  updateOrderStatus: (...a: unknown[]) => mockUpdateOrderStatus(...a),
}));

jest.mock('../../../services/api', () => ({
  __esModule: true,
  getErrorMessage: (e: unknown) => String(e),
}));

import KdsPage from '../KdsPage';
import { useRootStore } from '../../../stores/rootStore';

type AnyOrder = Record<string, unknown>;

const pedido = (over: AnyOrder): AnyOrder => ({
  id: 'x',
  store: 'uuid-1',
  order_number: 'CE-0000',
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  status: 'preparing',
  status_display: '',
  payment_status: 'paid',
  payment_status_display: '',
  subtotal: 0,
  discount: 0,
  coupon_code: '',
  tax: 0,
  delivery_fee: 0,
  total: 0,
  payment_method: '',
  payment_id: '',
  payment_preference_id: '',
  pix_code: '',
  pix_qr_code: '',
  delivery_method: 'pickup',
  delivery_method_display: '',
  delivery_address: {},
  delivery_notes: '',
  items: [],
  created_at: '2026-10-09T12:00:00Z',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  // A loja da rota é o slug "loja-1"; o seu UUID no cache é "uuid-1".
  useRootStore.setState({
    stores: [{ id: 'uuid-1', slug: 'loja-1', name: 'Loja 1' }] as unknown as Store[],
    orders: {},
  });
});

it('avançar um pedido não apaga o quadro inteiro (lê o cache pela chave uuid, não pelo slug)', async () => {
  mockGetOrders.mockResolvedValue({
    results: [
      pedido({ id: 'a', order_number: 'CE-1001', status: 'preparing' }),
      pedido({ id: 'b', order_number: 'CE-1002', status: 'confirmed' }),
    ],
  });
  mockUpdateOrderStatus.mockResolvedValue({});

  render(<KdsPage />);

  // Carga inicial: os dois pedidos entram no quadro.
  expect(await screen.findByText('#1001')).toBeInTheDocument();
  expect(screen.getByText('#1002')).toBeInTheDocument();

  // Cozinheiro toca "Pronto!" no pedido em preparo (coluna "Preparando").
  fireEvent.click(screen.getByRole('button', { name: 'Pronto!' }));

  await waitFor(() => expect(mockUpdateOrderStatus).toHaveBeenCalledWith('a', 'ready'));

  // O quadro continua de pé: o outro pedido NÃO some (antes do fix a leitura por
  // slug achava `[]` e gravava `[]` por cima, zerando a cozinha até o próximo
  // evento/refresh).
  expect(await screen.findByText('#1002')).toBeInTheDocument();
  expect(screen.getByText('#1001')).toBeInTheDocument();
});

it('o pedido avançado assume o novo status no quadro (otimista)', async () => {
  mockGetOrders.mockResolvedValue({
    results: [pedido({ id: 'a', order_number: 'CE-1001', status: 'preparing' })],
  });
  mockUpdateOrderStatus.mockResolvedValue({});

  render(<KdsPage />);

  // Em preparo → botão "Pronto!".
  fireEvent.click(await screen.findByRole('button', { name: 'Pronto!' }));

  await waitFor(() => expect(mockUpdateOrderStatus).toHaveBeenCalledWith('a', 'ready'));

  // Agora está "Pronto" → o botão do card vira o despacho (retirada → "Retirado").
  expect(await screen.findByRole('button', { name: 'Retirado' })).toBeInTheDocument();
  expect(screen.getByText('#1001')).toBeInTheDocument();
});
